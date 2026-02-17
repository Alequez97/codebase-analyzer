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

  // Create task-specific logger that writes to both console and file
  const fsSync = await import("fs");
  const logStream = fsSync.default.createWriteStream(logFile, { flags: "w" });
  const taskLogger = logger.createLogger([logStream]);

  try {
    // Log process start
    taskLogger.raw("=".repeat(80));
    taskLogger.info(`🚀 STARTING LLM ANALYSIS PROCESS`, {
      component: "LLM-API",
      taskId: task.id,
      taskType: task.type,
    });
    taskLogger.info(`📋 Task: ${task.type}`, { component: "LLM-API" });
    taskLogger.info(`📄 Instruction file: ${task.instructionFile}`, {
      component: "LLM-API",
    });
    taskLogger.info(`📁 Output file: ${task.outputFile}`, {
      component: "LLM-API",
    });
    taskLogger.info(`🎯 Target directory: ${config.target.directory}`, {
      component: "LLM-API",
    });
    taskLogger.raw("=".repeat(80));
    taskLogger.raw("");

    // Initialize LLM client and chat state
    taskLogger.info("🤖 Initializing LLM client...", {
      component: "LLM-API",
      model: config.llm.model,
    });
    const client = createLLMClient();
    const chatState = new ChatState(client);
    const fileToolExecutor = new FileToolExecutor(config.target.directory);
    taskLogger.info("✅ LLM client initialized", { component: "LLM-API" });

    // Add system message with instructions
    taskLogger.debug("📜 Loading system instructions...", {
      component: "LLM-API",
      instructionLength: instructions.length,
    });
    chatState.addSystemMessage(instructions);

    // Add initial user message to start the conversation
    taskLogger.info("💬 Sending initial prompt to LLM...", {
      component: "LLM-API",
    });
    chatState.addUserMessage(
      "Begin the codebase analysis as specified in the instructions.",
    );

    let iterationCount = 0;
    const maxIterations = 50; // Prevent infinite loops

    taskLogger.info(
      `🔄 Starting analysis loop (max ${maxIterations} iterations)`,
      {
        component: "LLM-API",
      },
    );

    while (iterationCount < maxIterations) {
      iterationCount++;

      taskLogger.raw("-".repeat(80));
      taskLogger.info(
        `📤 Iteration ${iterationCount}/${maxIterations}: Sending message to LLM`,
        {
          component: "LLM-API",
          taskId: task.id,
        },
      );
      taskLogger.raw("-".repeat(80));

      emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
        taskId: task.id,
        type: task.type,
        stream: "stdout",
        data: `\n${"-".repeat(80)}\n[Iteration ${iterationCount}/${maxIterations}] 📤 Sending message to LLM...\n${"-".repeat(80)}\n`,
      });

      // Check if we need to compact context
      if (chatState.needsCompaction()) {
        taskLogger.info("🗜️  Context too large, compacting chat history...", {
          component: "LLM-API",
          taskId: task.id,
        });
        await chatState.compact();
        taskLogger.info("✅ Context compaction complete", {
          component: "LLM-API",
        });
      }

      // Send message to LLM
      taskLogger.debug("⏳ Waiting for LLM response...", {
        component: "LLM-API",
      });
      const response = await client.sendMessage(chatState.getMessages(), {
        tools: FILE_TOOLS,
      });

      taskLogger.info("📥 Received LLM response", {
        component: "LLM-API",
        stopReason: response.stopReason,
        hasToolCalls: Boolean(response.toolCalls?.length),
        toolCount: response.toolCalls?.length || 0,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });

      // Summarize response content for logging
      const contentPreview = response.content
        ? response.content.substring(0, 200).replace(/\n/g, " ")
        : "(no text content)";
      taskLogger.debug(
        `Response preview: ${contentPreview}${response.content?.length > 200 ? "..." : ""}`,
        {
          component: "LLM-API",
        },
      );

      const responseLog = `\n📥 [Response] ${response.toolCalls?.length ? `Tool calls: ${response.toolCalls.length}` : "Text response"} (tokens: ${response.usage.inputTokens}/${response.usage.outputTokens})\n`;
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
        const toolNames = response.toolCalls.map((tc) => tc.name).join(", ");
        taskLogger.raw("");
        taskLogger.info(
          `🔧 LLM requested ${response.toolCalls.length} tool(s): ${toolNames}`,
          {
            component: "LLM-API",
          },
        );

        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: `\n🔧 [Tool Calls] LLM requested ${response.toolCalls.length} tool(s): ${toolNames}\n`,
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
          taskLogger.info(`  🔨 Executing: ${toolCall.name}`, {
            component: "LLM-API",
            toolName: toolCall.name,
            args: toolCall.arguments,
          });

          const argsPreview = JSON.stringify(toolCall.arguments).substring(
            0,
            150,
          );
          emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
            taskId: task.id,
            type: task.type,
            stream: "stdout",
            data: `  ├─ 🔨 Executing: ${toolCall.name}\n  │  Args: ${argsPreview}${JSON.stringify(toolCall.arguments).length > 150 ? "..." : ""}\n`,
          });

          try {
            const result = await fileToolExecutor.executeTool(
              toolCall.name,
              toolCall.arguments,
            );

            taskLogger.debug(
              `  ✅ Tool ${toolCall.name} completed (${result.length} chars)`,
              {
                component: "LLM-API",
                resultLength: result.length,
              },
            );

            chatState.addToolResult(toolCall.id, toolCall.name, result);
          } catch (error) {
            const errorResult = `Error: ${error.message}`;
            taskLogger.error(
              `  ❌ Tool ${toolCall.name} failed: ${errorResult}`,
              {
                component: "LLM-API",
              },
            );

            chatState.addToolResult(toolCall.id, toolCall.name, errorResult);
          }
        }

        taskLogger.info("✅ All tool executions complete, continuing...", {
          component: "LLM-API",
        });

        // Continue conversation after tool execution
        continue;
      }

      // Check if LLM indicated it's done (no more tool calls and stop_reason is end_turn)
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence"
      ) {
        taskLogger.raw("");
        taskLogger.info("✅ LLM indicated completion (no more tool calls)", {
          component: "LLM-API",
          stopReason: response.stopReason,
          iterations: iterationCount,
        });

        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: `\n✅ [COMPLETE] LLM has finished the analysis\n`,
        });

        break;
      }

      // If stop_reason is max_tokens, we might need to continue
      if (response.stopReason === "max_tokens") {
        taskLogger.warn("⚠️  Max tokens reached, asking LLM to continue", {
          component: "LLM-API",
        });
        chatState.addUserMessage("Please continue your analysis.");
        continue;
      }

      // No tool calls and unexpected stop reason - break
      taskLogger.warn(
        `Unexpected stop reason: ${response.stopReason}, ending loop`,
        {
          component: "LLM-API",
          stopReason: response.stopReason,
        },
      );
      break;
    }

    taskLogger.info("🔍 Checking for output file...", {
      component: "LLM-API",
      expectedPath: outputPath,
    });

    // Check if output file was created
    let outputExists = false;
    try {
      await fs.access(outputPath);
      outputExists = true;
      taskLogger.info("✅ Output file found", { component: "LLM-API" });
    } catch {
      outputExists = false;
      taskLogger.warn(
        "⚠️  Output file not found, will attempt extraction from conversation",
        {
          component: "LLM-API",
        },
      );
    }

    // If file doesn't exist, try to extract JSON from the conversation
    if (!outputExists) {
      taskLogger.raw("");
      taskLogger.info("🔎 Attempting to extract JSON from LLM responses...", {
        component: "LLM-API",
      });

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
              taskLogger.info(
                "✅ JSON successfully extracted from LLM response",
                {
                  component: "LLM-API",
                },
              );
              emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
                taskId: task.id,
                type: task.type,
                stream: "stdout",
                data: `[JSON Found] ✅ Successfully extracted and parsed JSON from response\n`,
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
        taskLogger.info("✅ Output file written successfully", {
          component: "LLM-API",
          file: task.outputFile,
        });
        emitSocketEvent(SOCKET_EVENTS.TASK_LOG, {
          taskId: task.id,
          type: task.type,
          stream: "stdout",
          data: `[File Written] ✅ Created ${task.outputFile}\n`,
        });
      } else {
        const errorMessage = "LLM did not output valid JSON in its responses";
        taskLogger.raw("");
        taskLogger.error(
          "❌ Failed to extract valid JSON from LLM conversation",
          {
            component: "LLM-API",
            taskId: task.id,
          },
        );
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
    taskLogger.raw("");
    taskLogger.raw("=".repeat(80));
    taskLogger.info(`🎉 PROCESS COMPLETED SUCCESSFULLY`, {
      component: "LLM-API",
      taskId: task.id,
      iterations: iterationCount,
    });
    taskLogger.info(`📊 Total iterations: ${iterationCount}`, {
      component: "LLM-API",
    });
    taskLogger.info(`📁 Output file: ${task.outputFile}`, {
      component: "LLM-API",
    });
    taskLogger.raw("=".repeat(80));
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      success: true,
      taskId: task.id,
      logFile,
      outputFile: outputPath,
    };
  } catch (error) {
    taskLogger.raw("");
    taskLogger.raw("=".repeat(80));
    taskLogger.error(`❌ LLM ANALYSIS FAILED`, {
      error: error.message,
      stack: error.stack,
      component: "LLM-API",
      taskId: task.id,
    });
    taskLogger.raw("=".repeat(80));
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      success: false,
      error: error.message,
      taskId: task.id,
      logFile,
    };
  }
}
