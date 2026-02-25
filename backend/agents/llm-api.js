import config from "../config.js";
import fs from "fs/promises";
import path from "path";
import { ClaudeClient } from "../llm/clients/claude-client.js";
import { OpenAIClient } from "../llm/clients/openai-client.js";
import { ChatState } from "../llm/state/chat-state.js";
import { OpenAIChatState } from "../llm/state/openai-chat-state.js";
import { LLMAgent } from "../llm/agent.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import {
  emitSocketEvent,
  emitTaskLog,
  emitTaskProgress,
} from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";
import {
  processTemplate,
  buildTemplateVariables,
} from "../utils/template-processor.js";
import { getProviderFromModel } from "../utils/model-utils.js";

/**
 * Detect if the LLM API agent is available.
 * Checks if any API key is configured in config.apiKeys
 * @returns {Promise<boolean>}
 */
export async function detect() {
  const { apiKeys } = config;
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
  });

  return true;
}

/**
 * Create LLM agent with client and state management
 * @param {Object} agentConfig - Agent configuration with model, maxTokens, reasoningEffort, maxIterations
 * @returns {LLMAgent} Configured LLM agent instance
 */
function createLLMAgent(agentConfig) {
  const { model, maxTokens, reasoningEffort, maxIterations } = agentConfig;
  const { apiKeys } = config;
  const provider = getProviderFromModel(model);

  if (!provider) {
    throw new Error(
      `Unable to determine provider from model "${model}". Supported: OpenAI (gpt-*, o1-*, o3-*), Anthropic (claude-*, sonnet), DeepSeek (deepseek-*)`,
    );
  }

  let client;
  let state;

  // Create client and state based on provider
  if (provider === "openai") {
    if (!apiKeys.openai) {
      throw new Error(
        `OpenAI model "${model}" is selected but OPENAI_API_KEY is not configured`,
      );
    }
    client = new OpenAIClient({
      apiKey: apiKeys.openai,
      model,
      maxTokens,
      reasoningEffort,
    });
    state = new OpenAIChatState(client);
  } else if (provider === "anthropic") {
    if (!apiKeys.anthropic) {
      throw new Error(
        `Claude model "${model}" is selected but ANTHROPIC_API_KEY is not configured`,
      );
    }
    client = new ClaudeClient({
      apiKey: apiKeys.anthropic,
      model,
      maxTokens,
      reasoningEffort,
    });
    state = new ChatState(client);
  } else {
    throw new Error(
      `Unsupported provider "${provider}". Supported providers: openai, anthropic`,
    );
  }

  // Create and return LLMAgent instance
  return new LLMAgent(client, state, {
    workingDirectory: config.target.directory,
    maxIterations: maxIterations || 30,
    maxTokens,
  });
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
    model: task.agentConfig.model,
  });

  // For documentation tasks, use the specialized documentation generator
  if (task.type === "analyze-documentation") {
    return await executeDocumentationTask(task);
  }

  // For other analysis tasks (codebase analysis, requirements, testing)
  return await executeAnalysisTask(task);
}

/**
 * Execute documentation analysis task (generates markdown + metadata)
 */
async function executeDocumentationTask(task) {
  const { domainId, files } = task.params;

  // Look up domainName from codebase analysis for display purposes
  let domainName = domainId;
  try {
    const { readCodebaseAnalysis } =
      await import("../persistence/codebase-analysis.js");
    const analysis = await readCodebaseAnalysis();
    const domain = analysis?.domains?.find((d) => d.id === domainId);
    if (domain?.name) {
      domainName = domain.name;
    }
  } catch (err) {
    // Fallback to domainId if analysis not found
    logger.debug("Could not load domain name from analysis, using ID", {
      component: "LLM-API",
      domainId,
    });
  }

  logger.info(`Generating documentation for domain: ${domainId}`, {
    component: "LLM-API",
    taskId: task.id,
  });

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
  const taskLogger = logger.createLogger([logStream]);

  try {
    taskLogger.raw("=".repeat(80));
    taskLogger.info(`🚀 STARTING DOCUMENTATION GENERATION`, {
      component: "LLM-API",
      taskId: task.id,
    });
    taskLogger.info(`📋 Domain: ${domainName}`, { component: "LLM-API" });
    taskLogger.info(`📁 Files: ${files.length}`, { component: "LLM-API" });
    taskLogger.info(`🤖 Model: ${task.agentConfig.model}`, {
      component: "LLM-API",
    });
    taskLogger.info(`🎯 Target directory: ${config.target.directory}`, {
      component: "LLM-API",
    });
    taskLogger.raw("=".repeat(80));
    taskLogger.raw("");

    const result = await generateDomainDocumentation({
      task,
      domainId,
      domainName,
      files,
      taskLogger,
      onProgress: (progress) => {
        taskLogger.info(`📊 ${progress.stage}: ${progress.message}`, {
          component: "LLM-API",
        });

        // Emit progress event for UI status updates
        emitSocketEvent(SOCKET_EVENTS.TASK_PROGRESS, {
          taskId: task.id,
          domainId,
          type: task.type,
          stage: progress.stage,
          message: progress.message,
        });

        emitTaskLog(task, {
          taskId: task.id,
          domainId,
          type: task.type,
          stream: "stdout",
          log: `[${progress.stage.toUpperCase()}] ${progress.message}\n`,
        });
      },
    });

    taskLogger.raw("");
    taskLogger.raw("=".repeat(80));
    taskLogger.info(`🎉 DOCUMENTATION GENERATION COMPLETED`, {
      component: "LLM-API",
      taskId: task.id,
    });
    taskLogger.raw("=".repeat(80));
    taskLogger.info(
      `⏱️  Duration: ${Math.round(result.metadata.durationMs / 100) / 10}s`,
      {
        component: "LLM-API",
      },
    );
    taskLogger.info(`🔄 Iterations: ${result.metadata.iterations}`, {
      component: "LLM-API",
    });
    taskLogger.info(
      `📝 Markdown: ${Math.round(result.markdownLength / 1000)}KB (${result.markdownLength.toLocaleString()} chars)`,
      {
        component: "LLM-API",
      },
    );
    taskLogger.info(
      `🪙 Tokens: ${result.metadata.tokenUsage.totalTokens.toLocaleString()} total (${result.metadata.tokenUsage.inputTokens.toLocaleString()} in / ${result.metadata.tokenUsage.outputTokens.toLocaleString()} out)`,
      {
        component: "LLM-API",
      },
    );
    taskLogger.raw("=".repeat(80));
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      success: true,
      taskId: task.id,
      logFile: task.logFile,
      metadata: result.metadata,
    };
  } catch (error) {
    taskLogger.raw("");
    taskLogger.raw("=".repeat(80));
    taskLogger.error(`❌ DOCUMENTATION GENERATION FAILED`, {
      error: error.message,
      stack: error.stack,
      component: "LLM-API",
      taskId: task.id,
    });
    taskLogger.raw("=".repeat(80));

    emitTaskLog(task, {
      taskId: task.id,
      domainId: task.params?.domainId,
      type: task.type,
      stream: "stderr",
      log: `\n${"=".repeat(80)}\n❌ [FAILED] Documentation generation failed\n${error.message}\n${"=".repeat(80)}\n`,
    });

    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      success: false,
      error: error.message,
      taskId: task.id,
      logFile: task.logFile,
    };
  }
}

/**
 * Generate documentation for a domain using LLM API
 * @param {Object} params - Generation parameters
 */
async function generateDomainDocumentation({
  task,
  domainId,
  domainName,
  files,
  taskLogger,
  onProgress = () => {},
}) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  taskLogger.info(`🔧 Initializing LLM client (${task.agentConfig.model})...`, {
    component: "LLM-API",
  });

  onProgress({ stage: "initializing", message: "Initializing LLM client..." });

  // Create LLM agent
  const agent = createLLMAgent(task.agentConfig);

  taskLogger.info(`📂 Domain files to analyze:`, { component: "LLM-API" });
  files.forEach((file, index) => {
    taskLogger.info(`   ${index + 1}. ${file}`, { component: "LLM-API" });
  });

  onProgress({
    stage: "loading-files",
    message: `Preparing to analyze ${files.length} files...`,
  });

  // Read instruction template and process with variables
  const instructionPath = path.join(
    config.paths.instructions,
    "analyze-domain-documentation.md",
  );
  const instructionTemplate = await fs.readFile(instructionPath, "utf-8");
  const templateVariables = await buildTemplateVariables(task);
  const systemPrompt = processTemplate(instructionTemplate, templateVariables);

  taskLogger.info(`📝 System prompt prepared (${systemPrompt.length} chars)`, {
    component: "LLM-API",
  });
  taskLogger.info(`🤖 Starting conversation with LLM...`, {
    component: "LLM-API",
  });
  taskLogger.raw("");

  onProgress({ stage: "analyzing", message: "Analyzing domain files..." });

  // Run the agent with callbacks for progress/logging
  const result = await agent.run({
    systemPrompt,
    initialMessage: `Analyze the ${domainName} domain and generate the complete documentation with Mermaid diagrams as specified in the instructions.`,

    onProgress: (progress) => {
      if (progress.iteration) {
        taskLogger.info(
          `🔄 Iteration ${progress.iteration}/${agent.maxIterations}`,
          { component: "LLM-API" },
        );
        emitTaskLog(task, {
          taskId: task.id,
          domainId,
          type: task.type,
          stream: "stdout",
          log: `\n${"-".repeat(80)}\n[Iteration ${progress.iteration}/${agent.maxIterations}] ${progress.message}\n${"-".repeat(80)}\n`,
        });
      }

      // Log tool execution progress
      if (progress.stage === "tool-execution") {
        taskLogger.info(`  📋 ${progress.message}`, { component: "LLM-API" });

        emitTaskLog(task, {
          taskId: task.id,
          domainId,
          type: task.type,
          stream: "stdout",
          log: `  ⚡ ${progress.message}\n`,
        });
      }

      onProgress(progress);
    },

    onIteration: (iteration, response) => {
      taskLogger.info(
        `📊 Response - ${response.usage.inputTokens} tokens in, ${response.usage.outputTokens} tokens out (stop: ${response.stopReason})`,
        { component: "LLM-API" },
      );

      emitTaskLog(task, {
        taskId: task.id,
        domainId,
        type: task.type,
        stream: "stdout",
        log: `\n📥 [Response] ${response.toolCalls?.length ? `Tool calls: ${response.toolCalls.length}` : "Text response"} (tokens: ${response.usage.inputTokens}/${response.usage.outputTokens})\n`,
      });
    },

    onToolCall: (toolName, args, result, error) => {
      const filePath = args?.path || args?.file_path || "unknown";
      const startLine = args?.start_line;
      const endLine = args?.end_line;

      let toolDescription = toolName;
      if (toolName === "read_file") {
        toolDescription =
          startLine && endLine
            ? `Reading ${filePath} (lines ${startLine}-${endLine})`
            : `Reading ${filePath}`;
      } else if (toolName === "list_directory") {
        toolDescription = `Listing directory ${filePath}`;
      } else if (toolName === "write_file") {
        toolDescription = `Writing ${filePath}`;
      }

      taskLogger.info(`  📖 ${toolDescription}`, { component: "LLM-API" });

      const argsPreview = JSON.stringify(args).substring(0, 150);
      const resultSize =
        result.length > 1000
          ? `${Math.round(result.length / 1000)}KB`
          : `${result.length} bytes`;

      emitTaskLog(task, {
        taskId: task.id,
        domainId,
        type: task.type,
        stream: "stdout",
        log: `  ├─ 📖 ${toolDescription}\n  │  Args: ${argsPreview}${JSON.stringify(args).length > 150 ? "..." : ""}\n  └─ ✅ Tool completed - ${resultSize}\n`,
      });
    },

    shouldContinue: (response, iteration) => {
      // Continue until LLM indicates completion or uses write_file
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✨ LLM indicated completion!", {
          component: "LLM-API",
          taskId: task.id,
          iterations: iteration,
        });

        emitTaskLog(task, {
          taskId: task.id,
          domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✨ [Documentation Complete] LLM finished after ${iteration} iterations\n`,
        });

        onProgress({
          stage: "saving",
          message: "Documentation complete, saving...",
        });

        return false; // Stop
      }

      // Ask for final output if needed
      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        agent.addUserMessage(
          "Please use write_file to save the complete documentation as specified in the instructions.",
        );
        return true; // Continue
      }

      return true; // Continue by default
    },
  });

  onProgress({ stage: "saving", message: "Verifying output..." });

  // Read the output file that LLM should have created
  const outputPath = path.join(config.target.directory, task.outputFile);
  let documentationMarkdown;

  try {
    documentationMarkdown = await fs.readFile(outputPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read documentation output: ${error.message}. LLM may not have written the file correctly.`,
    );
  }

  if (!documentationMarkdown || documentationMarkdown.length < 100) {
    throw new Error(
      `Generated documentation is too short (${documentationMarkdown?.length || 0} chars)`,
    );
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = Math.round(durationMs / 100) / 10;

  // Get metadata from agent
  const agentMetadata = agent.getMetadata();

  taskLogger.raw("");
  taskLogger.info(`📊 Generation Statistics:`, { component: "LLM-API" });
  taskLogger.info(`   ⏱️  Duration: ${durationSec}s`, { component: "LLM-API" });
  taskLogger.info(`   🔄 Iterations: ${agentMetadata.iterations}`, {
    component: "LLM-API",
  });
  taskLogger.info(
    `   📝 Markdown size: ${Math.round(documentationMarkdown.length / 1000)}KB`,
    { component: "LLM-API" },
  );
  taskLogger.info(
    `   🪙 Input tokens: ${agentMetadata.tokenUsage.input.toLocaleString()}`,
    {
      component: "LLM-API",
    },
  );
  taskLogger.info(
    `   🪙 Output tokens: ${agentMetadata.tokenUsage.output.toLocaleString()}`,
    { component: "LLM-API" },
  );
  taskLogger.info(
    `   🪙 Total tokens: ${agentMetadata.tokenUsage.total.toLocaleString()}`,
    { component: "LLM-API" },
  );
  taskLogger.raw("");

  emitTaskLog(task, {
    taskId: task.id,
    domainId,
    type: task.type,
    stream: "stdout",
    log: `\n${"=".repeat(80)}\n📊 [Statistics]\n⏱️  Duration: ${durationSec}s\n🔄 Iterations: ${agentMetadata.iterations}\n📝 Markdown: ${Math.round(documentationMarkdown.length / 1000)}KB\n🪙 Tokens: ${agentMetadata.tokenUsage.total.toLocaleString()} total (${agentMetadata.tokenUsage.input.toLocaleString()} in / ${agentMetadata.tokenUsage.output.toLocaleString()} out)\n${"=".repeat(80)}\n`,
  });

  // Create minimal metadata
  const metadata = {
    status: "completed",
    generatedAt: timestamp,
    completedAt: new Date().toISOString(),
    durationMs,
    iterations: agentMetadata.iterations,
    tokenUsage: {
      inputTokens: agentMetadata.tokenUsage.input,
      outputTokens: agentMetadata.tokenUsage.output,
      totalTokens: agentMetadata.tokenUsage.total,
    },
    agent: "llm-api",
    model: agent.client.model,
    logFile: `logs/${task.id}.log`,
  };

  taskLogger.info(`💾 Saving documentation metadata...`, {
    component: "LLM-API",
  });

  onProgress({
    stage: "saving",
    message: "Saving documentation metadata...",
  });

  // Save metadata.json in the documentation folder
  const documentationDir = path.join(
    config.target.directory,
    `.code-analysis/domains/${domainId}/documentation`,
  );
  await fs.mkdir(documentationDir, { recursive: true });

  const metadataPath = path.join(documentationDir, "metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

  taskLogger.info(`✅ Documentation saved successfully!`, {
    component: "LLM-API",
  });
  taskLogger.info(`   📂 Domain: ${domainId}`, { component: "LLM-API" });
  taskLogger.info(
    `   📄 Content: .code-analysis/domains/${domainId}/documentation/content.md`,
    {
      component: "LLM-API",
    },
  );
  taskLogger.info(
    `   📄 Metadata: .code-analysis/domains/${domainId}/documentation/metadata.json`,
    {
      component: "LLM-API",
    },
  );

  emitTaskLog(task, {
    taskId: task.id,
    domainId,
    type: task.type,
    stream: "stdout",
    log: `\n✅ [COMPLETE] Documentation generation finished successfully\n📂 Domain: ${domainId}\n📄 Content: .code-analysis/domains/${domainId}/documentation/content.md\n📄 Metadata: .code-analysis/domains/${domainId}/documentation/metadata.json\n`,
  });

  return {
    success: true,
    metadata,
    markdownLength: documentationMarkdown.length,
  };
}

/**
 * Execute analysis task (codebase analysis, requirements, testing)
 * These tasks analyze code and output structured JSON results
 */
async function executeAnalysisTask(task) {
  logger.info(`Executing LLM API task: ${task.type}`, {
    component: "LLM-API",
    taskId: task.id,
  });

  emitTaskProgress(task, "initializing", "Initializing analysis...");

  // Read instruction file
  const instructionPath = path.join(
    config.paths.analyzerRoot,
    task.instructionFile,
  );
  const instructionTemplate = await fs.readFile(instructionPath, "utf-8");

  // Process template with task variables
  emitTaskProgress(task, "initializing", "Processing instruction template...");
  const templateVariables = await buildTemplateVariables(task);
  const instructions = processTemplate(instructionTemplate, templateVariables);

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
    emitTaskProgress(task, "initializing", "Initializing LLM client...");
    taskLogger.info("🤖 Initializing LLM client...", {
      component: "LLM-API",
      model: task.agentConfig.model,
    });
    const agent = createLLMAgent(task.agentConfig);
    taskLogger.info("✅ LLM client initialized", { component: "LLM-API" });

    // Add system message with instructions
    taskLogger.debug("📜 Loading system instructions...", {
      component: "LLM-API",
      instructionLength: instructions.length,
    });

    taskLogger.info("💬 Sending initial prompt to LLM...", {
      component: "LLM-API",
    });

    emitTaskProgress(task, "analyzing", "Analyzing domain files...");
    taskLogger.info(
      `🔄 Starting analysis loop (max ${agent.maxIterations} iterations)`,
      {
        component: "LLM-API",
      },
    );

    // Run the agent with callbacks for progress/logging
    const result = await agent.run({
      systemPrompt: instructions,
      initialMessage:
        "Begin the codebase analysis as specified in the instructions.",

      onProgress: (progress) => {
        if (progress.iteration) {
          taskLogger.raw("-".repeat(80));
          taskLogger.info(
            `📤 Iteration ${progress.iteration}/${agent.maxIterations}: ${progress.message || "Sending message to LLM"}`,
            {
              component: "LLM-API",
              taskId: task.id,
            },
          );
          taskLogger.raw("-".repeat(80));

          emitTaskLog(task, {
            taskId: task.id,
            domainId: task.params?.domainId,
            type: task.type,
            stream: "stdout",
            log: `\n${"-".repeat(80)}\n[Iteration ${progress.iteration}/${agent.maxIterations}] 📤 ${progress.message || "Sending message to LLM"}...\n${"-".repeat(80)}\n`,
          });
        }

        if (progress.compacting) {
          taskLogger.info("🗜️  Context too large, compacting chat history...", {
            component: "LLM-API",
            taskId: task.id,
          });

          emitTaskProgress(
            task,
            "compacting",
            "Context too large, compacting chat history...",
          );
          emitTaskLog(task, {
            taskId: task.id,
            domainId: task.params?.domainId,
            type: task.type,
            stream: "stdout",
            log: `\n🗜️  [Compacting] Using LLM to intelligently summarize conversation...\n`,
          });
        } else if (progress.stage === "tool-execution") {
          // Emit progress for file operations
          taskLogger.info(`  ⚡ ${progress.message}`, { component: "LLM-API" });

          emitTaskProgress(task, "analyzing", progress.message);

          emitTaskLog(task, {
            taskId: task.id,
            domainId: task.params?.domainId,
            type: task.type,
            stream: "stdout",
            log: `  ⚡ ${progress.message}\n`,
          });
        } else if (progress.stage) {
          emitTaskProgress(task, progress.stage, progress.message);
        }
      },

      onIteration: (iteration, response) => {
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
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: responseLog,
        });
      },

      onToolCall: (toolName, args, result, error) => {
        const filePath = args?.path || args?.file_path || "file";
        let progressMessage = `Reading ${filePath}`;
        if (toolName === "list_directory") {
          progressMessage = `Listing directory ${filePath}`;
        } else if (toolName === "write_file") {
          progressMessage = `Writing ${filePath}`;
        }
        emitTaskProgress(task, "analyzing", progressMessage);

        const argsPreview = JSON.stringify(args).substring(0, 150);
        const logPrefix = error ? "❌" : "✅";
        const logStatus = error
          ? `failed: ${error}`
          : `completed (${result?.length || 0} chars)`;

        taskLogger.info(`  ${logPrefix} ${toolName}: ${logStatus}`, {
          component: "LLM-API",
        });

        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `  ├─ 🔨 Executing: ${toolName}\n  │  Args: ${argsPreview}${JSON.stringify(args).length > 150 ? "..." : ""}\n  └─ ${logPrefix} ${logStatus}\n`,
        });
      },

      shouldContinue: (response, iteration) => {
        // Continue until LLM indicates completion
        if (
          response.stopReason === "end_turn" ||
          response.stopReason === "stop_sequence" ||
          response.stopReason === "completed"
        ) {
          taskLogger.raw("");
          taskLogger.info("✅ LLM indicated completion (no more tool calls)", {
            component: "LLM-API",
            stopReason: response.stopReason,
            iterations: iteration,
          });

          emitTaskLog(task, {
            taskId: task.id,
            domainId: task.params?.domainId,
            type: task.type,
            stream: "stdout",
            log: `\n✅ [Analysis Complete] LLM has finished analyzing, now extracting results...\n`,
          });

          return false; // Stop
        }

        // If max_tokens reached, ask for JSON output
        if (
          response.stopReason === "max_tokens" &&
          !response.toolCalls?.length
        ) {
          taskLogger.warn(
            "⚠️  Max tokens reached, requesting final JSON output",
            {
              component: "LLM-API",
            },
          );
          agent.addUserMessage(
            "You've hit the token limit. Please output the complete JSON with all the requirements/analysis you've identified so far. Make sure it's valid, complete JSON.",
          );
          return true; // Continue
        }

        return true; // Continue by default
      },
    });

    emitTaskProgress(task, "processing", "Processing results...");
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
      emitTaskProgress(task, "processing", "Extracting results...");
      taskLogger.raw("");
      taskLogger.info("🔎 Attempting to extract JSON from LLM responses...", {
        component: "LLM-API",
      });

      const jsonContent = agent.extractJSON();

      if (jsonContent) {
        // Write the extracted JSON to file
        emitTaskProgress(task, "saving", "Saving results...");
        await fs.writeFile(
          outputPath,
          JSON.stringify(jsonContent, null, 2),
          "utf-8",
        );
        taskLogger.info("✅ Output file written successfully", {
          component: "LLM-API",
          file: task.outputFile,
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `✅ [File Written] Created ${task.outputFile}\n`,
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

    // Get metadata from agent
    const agentMetadata = agent.getMetadata();

    // Close log stream
    taskLogger.raw("");
    taskLogger.raw("=".repeat(80));
    taskLogger.info(`🎉 PROCESS COMPLETED SUCCESSFULLY`, {
      component: "LLM-API",
      taskId: task.id,
      iterations: agentMetadata.iterations,
    });
    taskLogger.info(`📊 Total iterations: ${agentMetadata.iterations}`, {
      component: "LLM-API",
    });
    taskLogger.info(`   🪙 Total tokens: ${agentMetadata.tokenUsage.total}`, {
      component: "LLM-API",
    });
    taskLogger.info(`📁 Output file: ${task.outputFile}`, {
      component: "LLM-API",
    });
    taskLogger.raw("=".repeat(80));

    // Emit final completion event if not already sent
    emitTaskLog(task, {
      taskId: task.id,
      domainId: task.params?.domainId,
      type: task.type,
      stream: "stdout",
      log: `\n${"=".repeat(80)}\n✅ [COMPLETE] Process finished successfully\n📊 Iterations: ${agentMetadata.iterations}\n🪙 Tokens: ${agentMetadata.tokenUsage.total}\n📁 Output: ${task.outputFile}\n${"=".repeat(80)}\n`,
    });

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

    emitTaskLog(task, {
      taskId: task.id,
      domainId: task.params?.domainId,
      type: task.type,
      stream: "stderr",
      log: `\n${"=".repeat(80)}\n❌ [FAILED] LLM analysis failed\n${error.message}\n${"=".repeat(80)}\n`,
    });

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
