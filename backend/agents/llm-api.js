import config from "../config.js";
import fs from "fs/promises";
import path from "path";
import { ClaudeClient } from "../llm/clients/claude-client.js";
import { ChatState } from "../llm/chat-state.js";
import { FileToolExecutor, FILE_TOOLS } from "../llm/tools/file-tools.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";

/**
 * Detect if the LLM API agent is available.
 * Checks if any API key is configured in config.llm.apiKeys
 * @returns {Promise<boolean>}
 */
export async function detect() {
  const { apiKeys } = config.llm;
  const hasApiKey = Boolean(
    apiKeys.anthropic ||
    apiKeys.openai ||
    apiKeys.deepseek ||
    apiKeys.openrouter,
  );

  if (!hasApiKey) {
    logger.debug("LLM API agent not available (no API keys configured)", {
      component: "LLM-API",
    });
    return false;
  }

  logger.debug("LLM API agent available", {
    component: "LLM-API",
    model: config.llm.model,
  });

  return true;
}

/**
 * Create LLM client based on configured model
 * @returns {BaseLLMClient}
 */
function createLLMClient() {
  const { model, apiKeys } = config.llm;

  // For now, we only support Claude/Anthropic
  // Future: add OpenAI, DeepSeek, OpenRouter clients
  if (apiKeys.anthropic) {
    return new ClaudeClient({
      apiKey: apiKeys.anthropic,
      model: model.startsWith("claude") ? model : "claude-sonnet-4-20250514",
    });
  }

  throw new Error(
    "No supported LLM client available. Please configure ANTHROPIC_API_KEY",
  );
}

/**
 * Execute a task using the LLM API agent.
 * @param {Object} task - The task object
 * @returns {Promise<Object>} Execution result
 */
export async function execute(task) {
  logger.info(`Executing LLM API task: ${task.type}`, {
    component: "LLM-API",
    taskId: task.id,
  });

  // Read instruction file
  const instructionPath = path.join(
    config.paths.analyzerRoot,
    task.instructionFile,
  );
  const instructions = await fs.readFile(instructionPath, "utf-8");

  // Create output directory
  const outputPath = path.join(config.target.directory, task.outputFile);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Create log directory
  const logDir = path.join(config.paths.targetAnalysis, "logs");
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${task.id}.log`);

  // Update task with log file path
  task.logFile = `logs/${task.id}.log`;
  const { writeTask } = await import("../persistence/tasks.js");
  await writeTask(task);

  // Create log stream
  const fsSync = await import("fs");
  const logStream = fsSync.default.createWriteStream(logFile, { flags: "w" });

  try {
    // Initialize LLM client and chat state
    const client = createLLMClient();
    const chatState = new ChatState(client);
    const fileToolExecutor = new FileToolExecutor(config.target.directory);

    // Add system message with instructions
    chatState.addSystemMessage(instructions);

    // Add initial user message to start the conversation
    chatState.addUserMessage(
      "Begin the codebase analysis as specified in the instructions.",
    );

    let iterationCount = 0;
    const maxIterations = 50; // Prevent infinite loops

    while (iterationCount < maxIterations) {
      iterationCount++;

      const logMessage = `[Iteration ${iterationCount}] Sending message to LLM...\n`;
      logStream.write(logMessage);
      logger.debug(logMessage.trim(), {
        component: "LLM-API",
        taskId: task.id,
      });

      emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
        taskId: task.id,
        type: task.type,
        stream: "stdout",
        data: logMessage,
      });

      // Check if we need to compact context
      if (chatState.needsCompaction()) {
        await chatState.compact();
      }

      // Send message to LLM
      const response = await client.sendMessage(chatState.getMessages(), {
        tools: FILE_TOOLS,
      });

      const responseLog = `[LLM Response] ${response.content}\n`;
      const usageLog = `[Token Usage] Input: ${response.usage.inputTokens}, Output: ${response.usage.outputTokens}\n`;

      logStream.write(responseLog);
      logStream.write(usageLog);

      emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
        taskId: task.id,
        type: task.type,
        stream: "stdout",
        data: responseLog,
      });

      // Add assistant's response to chat state
      if (response.content) {
        chatState.addAssistantMessage(response.content);
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolLog = `[Tool Calls] ${response.toolCalls.length} tool(s) requested\n`;
        logStream.write(toolLog);

        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: toolLog,
        });

        // Store tool calls in chat state
        chatState.addToolUse(
          response.toolCalls.map((tc) => ({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })),
        );

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          const toolStartLog = `[Tool: ${toolCall.name}] ${JSON.stringify(toolCall.arguments)}\n`;
          logStream.write(toolStartLog);

          emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
            taskId: task.id,
            type: task.type,
            stream: "stdout",
            data: toolStartLog,
          });

          try {
            const result = await fileToolExecutor.executeTool(
              toolCall.name,
              toolCall.arguments,
            );

            const toolResultLog = `[Tool Result] ${result.substring(0, 500)}${result.length > 500 ? "..." : ""}\n`;
            logStream.write(toolResultLog);

            chatState.addToolResult(toolCall.id, toolCall.name, result);
          } catch (error) {
            const errorResult = `Error: ${error.message}`;
            const toolErrorLog = `[Tool Error] ${errorResult}\n`;
            logStream.write(toolErrorLog);

            chatState.addToolResult(toolCall.id, toolCall.name, errorResult);
          }
        }

        // Continue conversation after tool execution
        continue;
      }

      // Check if LLM indicated it's done (no more tool calls and stop_reason is end_turn)
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence"
      ) {
        const completeLog = `[Complete] LLM finished analysis\n`;
        logStream.write(completeLog);

        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: completeLog,
        });

        break;
      }

      // If stop_reason is max_tokens, we might need to continue
      if (response.stopReason === "max_tokens") {
        const continueLog = `[Continue] Max tokens reached, continuing...\n`;
        logStream.write(continueLog);
        chatState.addUserMessage("Please continue your analysis.");
        continue;
      }

      // No tool calls and unexpected stop reason - break
      break;
    }

    // Check if output file was created
    let outputExists = false;
    try {
      await fs.access(outputPath);
      outputExists = true;
    } catch {
      outputExists = false;
    }

    // If file doesn't exist, try to extract JSON from the conversation
    if (!outputExists) {
      const finalLog = `[Extracting JSON] Looking for JSON in LLM responses...\n`;
      logStream.write(finalLog);

      // Get all assistant messages
      const messages = chatState.getMessages();
      let jsonContent = null;

      // Find the last message with JSON content
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "assistant" && msg.content) {
          const content =
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content);

          // Try to extract JSON from markdown code blocks or plain text
          const jsonMatch =
            content.match(/```json\s*\n?([\s\S]*?)\n?```/) ||
            content.match(/```\s*\n?([\s\S]*?)\n?```/) ||
            content.match(/(\{[\s\S]*\})/);

          if (jsonMatch) {
            try {
              const extractedJson = jsonMatch[1].trim();
              jsonContent = JSON.parse(extractedJson);
              const extractLog = `[JSON Found] Successfully extracted and parsed JSON from response\n`;
              logStream.write(extractLog);
              emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
                taskId: task.id,
                type: task.type,
                stream: "stdout",
                data: extractLog,
              });
              break;
            } catch (parseError) {
              // Continue searching
            }
          }
        }
      }

      if (jsonContent) {
        // Write the extracted JSON to file
        await fs.writeFile(
          outputPath,
          JSON.stringify(jsonContent, null, 2),
          "utf-8",
        );
        const writeLog = `[File Written] Created ${task.outputFile}\n`;
        logStream.write(writeLog);
        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: writeLog,
        });
      } else {
        const errorMessage = "LLM did not output valid JSON in its responses";
        logStream.write(`[Error] ${errorMessage}\n`);
        logStream.end();

        return {
          success: false,
          error: errorMessage,
          taskId: task.id,
          logFile,
        };
      }
    }

    // Close log stream
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    logger.info(`LLM API task completed successfully`, {
      component: "LLM-API",
      taskId: task.id,
    });

    return {
      success: true,
      taskId: task.id,
      logFile,
      outputFile: outputPath,
    };
  } catch (error) {
    const errorLog = `[Fatal Error] ${error.message}\n${error.stack}\n`;
    logStream.write(errorLog);
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    logger.error(`LLM API task failed: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      component: "LLM-API",
      taskId: task.id,
    });

    return {
      success: false,
      error: error.message,
      taskId: task.id,
      logFile,
    };
  }
}
