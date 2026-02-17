import config from "../config.js";
import fs from "fs/promises";
import path from "path";
import { ClaudeClient } from "../llm/clients/claude-client.js";
import { ChatState } from "../llm/chat-state.js";
import { FileToolExecutor, FILE_TOOLS } from "../llm/tools/file-tools.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import { getLogEventForTaskType } from "../utils/task-logger.js";
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

  // For documentation tasks, use the specialized documentation generator
  if (task.type === "analyze-documentation") {
    return await executeDocumentationTask(task);
  }

  // For other tasks (codebase analysis, requirements, testing), use JSON output
  return await executeJsonTask(task);
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
    taskLogger.raw("=".repeat(80));
    taskLogger.raw("");

    const result = await generateDomainDocumentation({
      domainId,
      domainName,
      files,
      taskId: task.id,
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

        emitSocketEvent(getLogEventForTaskType(task.type), {
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
  domainId,
  domainName,
  files,
  taskId,
  taskLogger,
  onProgress = () => {},
}) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  taskLogger.info(`🔧 Initializing LLM client (${config.llm.model})...`, {
    component: "LLM-API",
  });

  onProgress({ stage: "initializing", message: "Initializing LLM client..." });

  // Create LLM client
  const client = createLLMClient();
  const chatState = new ChatState(client);
  const fileToolExecutor = new FileToolExecutor(config.target.directory);

  taskLogger.info(`📂 Domain files to analyze:`, { component: "LLM-API" });
  files.forEach((file, index) => {
    taskLogger.info(`   ${index + 1}. ${file}`, { component: "LLM-API" });
  });

  onProgress({
    stage: "loading-files",
    message: `Preparing to analyze ${files.length} files...`,
  });

  // Build system prompt
  const systemPrompt = buildDocumentationPrompt(domainId, domainName, files);
  chatState.addSystemMessage(systemPrompt);

  taskLogger.info(`📝 System prompt prepared (${systemPrompt.length} chars)`, {
    component: "LLM-API",
  });

  // Start conversation
  chatState.addUserMessage(
    `Analyze the ${domainName} domain and generate comprehensive documentation in Markdown format. Focus on business purpose, architecture, and key components.`,
  );

  taskLogger.info(`🤖 Starting conversation with LLM...`, {
    component: "LLM-API",
  });
  taskLogger.raw("");

  onProgress({ stage: "analyzing", message: "Analyzing domain files..." });

  let iterationCount = 0;
  const maxIterations = 30;
  let documentationMarkdown = "";
  const conversationLog = [];

  while (iterationCount < maxIterations) {
    iterationCount++;

    taskLogger.info(
      `🔄 Iteration ${iterationCount}/${maxIterations} - Sending request to LLM...`,
      {
        component: "LLM-API",
        taskId,
        tokenCount: chatState.getTokenCount(),
      },
    );

    // Send message to LLM
    const response = await client.sendMessage(chatState.getMessages(), {
      tools: FILE_TOOLS,
      maxTokens: 4096,
    });

    conversationLog.push({
      iteration: iterationCount,
      timestamp: new Date().toISOString(),
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      stopReason: response.stopReason,
    });

    taskLogger.info(
      `📊 Response received - ${response.usage.inputTokens} tokens in, ${response.usage.outputTokens} tokens out (stop: ${response.stopReason})`,
      { component: "LLM-API" },
    );

    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      taskLogger.info(
        `🔧 LLM requested ${response.toolCalls.length} tool call(s)`,
        { component: "LLM-API" },
      );

      chatState.addToolUse(response.toolCalls);

      for (const toolCall of response.toolCalls) {
        // Extract file path from arguments for better logging
        const filePath =
          toolCall.arguments?.path ||
          toolCall.arguments?.file_path ||
          "unknown";
        const startLine = toolCall.arguments?.start_line;
        const endLine = toolCall.arguments?.end_line;

        let toolDescription = `${toolCall.name}`;
        if (toolCall.name === "read_file") {
          toolDescription =
            startLine && endLine
              ? `Reading ${filePath} (lines ${startLine}-${endLine})`
              : `Reading ${filePath}`;
        } else if (toolCall.name === "list_directory") {
          toolDescription = `Listing directory ${filePath}`;
        }

        taskLogger.info(`  📖 ${toolDescription}`, { component: "LLM-API" });

        onProgress({
          stage: "analyzing",
          message: toolDescription,
          iteration: iterationCount,
        });

        const result = await fileToolExecutor.executeTool(
          toolCall.name,
          toolCall.arguments,
        );

        chatState.addToolResult(toolCall.id, toolCall.name, result);

        const resultSize =
          result.length > 1000
            ? `${Math.round(result.length / 1000)}KB`
            : `${result.length} bytes`;

        taskLogger.info(`  ✅ Tool completed - returned ${resultSize}`, {
          component: "LLM-API",
        });
      }

      continue;
    }

    // Extract documentation from response
    if (response.content) {
      const contentPreview = response.content
        .substring(0, 100)
        .replace(/\n/g, " ");
      taskLogger.info(
        `💬 LLM response: ${contentPreview}${response.content.length > 100 ? "..." : ""}`,
        {
          component: "LLM-API",
        },
      );

      documentationMarkdown = extractMarkdownFromResponse(response.content);

      if (documentationMarkdown) {
        taskLogger.info("✨ Documentation generation completed!", {
          component: "LLM-API",
          taskId,
          iterations: iterationCount,
          markdownLength: documentationMarkdown.length,
          markdownSizeKB: Math.round(documentationMarkdown.length / 1000),
        });

        onProgress({
          stage: "saving",
          message: "Documentation complete, saving...",
        });

        break;
      } else {
        taskLogger.info(
          "⚠️  Response doesn't contain valid markdown documentation, requesting documentation...",
          {
            component: "LLM-API",
          },
        );
      }
    }

    // If no tool calls and no documentation, add assistant response and continue
    chatState.addAssistantMessage(response.content);
    chatState.addUserMessage(
      "Please provide the complete documentation in Markdown format.",
    );

    onProgress({
      stage: "analyzing",
      message: "Requesting documentation from LLM...",
      iteration: iterationCount,
    });
  }

  if (!documentationMarkdown) {
    throw new Error(
      `Failed to generate documentation after ${maxIterations} iterations`,
    );
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = Math.round(durationMs / 100) / 10;

  // Calculate total token usage
  const totalTokens = conversationLog.reduce(
    (acc, log) => ({
      input: acc.input + log.inputTokens,
      output: acc.output + log.outputTokens,
    }),
    { input: 0, output: 0 },
  );

  taskLogger.raw("");
  taskLogger.info(`📊 Generation Statistics:`, { component: "LLM-API" });
  taskLogger.info(`   ⏱️  Duration: ${durationSec}s`, { component: "LLM-API" });
  taskLogger.info(`   🔄 Iterations: ${iterationCount}`, {
    component: "LLM-API",
  });
  taskLogger.info(
    `   📝 Markdown size: ${Math.round(documentationMarkdown.length / 1000)}KB`,
    { component: "LLM-API" },
  );
  taskLogger.info(`   🪙 Input tokens: ${totalTokens.input.toLocaleString()}`, {
    component: "LLM-API",
  });
  taskLogger.info(
    `   🪙 Output tokens: ${totalTokens.output.toLocaleString()}`,
    { component: "LLM-API" },
  );
  taskLogger.info(
    `   🪙 Total tokens: ${(totalTokens.input + totalTokens.output).toLocaleString()}`,
    { component: "LLM-API" },
  );
  taskLogger.raw("");

  // Create minimal metadata
  const metadata = {
    status: "completed",
    generatedAt: timestamp,
    completedAt: new Date().toISOString(),
    durationMs,
    iterations: iterationCount,
    tokenUsage: {
      inputTokens: totalTokens.input,
      outputTokens: totalTokens.output,
      totalTokens: totalTokens.input + totalTokens.output,
    },
    agent: "llm-api",
    model: client.getModelName(),
    logFile: `logs/${taskId}.log`,
  };

  taskLogger.info(`💾 Saving documentation to JSON...`, {
    component: "LLM-API",
  });

  onProgress({
    stage: "saving",
    message: "Saving documentation...",
  });

  // Save documentation with metadata
  const { writeDomainDocumentation } =
    await import("../persistence/domains.js");
  await writeDomainDocumentation(domainId, {
    content: documentationMarkdown,
    metadata,
  });

  taskLogger.info(`✅ Documentation saved successfully!`, {
    component: "LLM-API",
  });
  taskLogger.info(`   📂 Domain: ${domainId}`, { component: "LLM-API" });
  taskLogger.info(
    `   📄 Path: .code-analysis/domains/${domainId}/documentation.json`,
    {
      component: "LLM-API",
    },
  );

  return {
    success: true,
    metadata,
    markdownLength: documentationMarkdown.length,
  };
}

/**
 * Build system prompt for documentation generation
 */
function buildDocumentationPrompt(domainId, domainName, files) {
  return `# Domain Documentation Generation

You are tasked with generating comprehensive business documentation for a software domain.

## Domain Information
- **Domain ID**: ${domainId}
- **Domain Name**: ${domainName}
- **Number of Files**: ${files.length}

## Files to Analyze
${files.map((f) => `- ${f}`).join("\\n")}

## Your Task

Generate comprehensive Markdown documentation that explains:

1. **Business Purpose** - What this domain does and why it matters
2. **Core Responsibilities** - Key functions and capabilities
3. **Architecture** - How components work together
4. **Key Components** - Important files and their roles
5. **Risk Areas** - Critical paths that need special attention

## Tools Available

You have access to file reading tools:
- \`read_file\`: Read the complete contents of a file
- \`list_directory\`: List files in a directory
- \`read_file_range\`: Read specific lines from a file

Use these tools to analyze the domain files thoroughly before generating documentation.

## Output Format

Your final output should be pure Markdown with this structure:

\`\`\`markdown
# ${domainName}

[Brief description of what this domain does]

## Core Responsibilities

- Responsibility 1
- Responsibility 2
- Responsibility 3

## Why it matters

[Explain the business value and importance of this domain]

## Key Components

### Component Name (\`path/to/file.js\`)
Description of what this component does and its role.

### Another Component (\`path/to/another.js\`)
Description of what this component does and its role.

## Architecture

[Explain how the components work together, data flow, dependencies, etc.]

## Risk Areas

[Identify critical paths, security concerns, performance bottlenecks, etc.]
\`\`\`

## Guidelines

1. **Clear and Professional** - Write for both technical and non-technical readers
2. **Business-Focused** - Explain WHY, not just WHAT
3. **Rich Markdown** - Use headings, lists, code examples, and formatting
4. **Code Examples** - Include relevant code snippets when helpful
5. **Component Descriptions** - For each key file, explain its purpose and role
6. **Architecture Clarity** - Explain how components interact and data flows

Begin by reading the domain files to understand the code, then generate the documentation.`;
}

/**
 * Extract markdown content from LLM response
 */
function extractMarkdownFromResponse(content) {
  // Remove code fences if present
  let markdown = content.trim();

  // Check if content is wrapped in markdown code fence
  const markdownFenceRegex = /^```markdown\\s*\\n([\\s\\S]*?)\\n```$/;
  const match = markdown.match(markdownFenceRegex);

  if (match) {
    markdown = match[1].trim();
  }

  // Check if it looks like valid markdown (has headers)
  if (markdown.includes("#") && markdown.length > 100) {
    return markdown;
  }

  return null;
}

/**
 * Helper to emit progress for JSON tasks
 */
function emitJsonTaskProgress(task, stage, message) {
  emitSocketEvent(SOCKET_EVENTS.TASK_PROGRESS, {
    taskId: task.id,
    domainId: task.params?.domainId,
    type: task.type,
    stage,
    message,
  });
}

/**
 * Execute JSON output task (codebase analysis, requirements, testing)
 */
async function executeJsonTask(task) {
  logger.info(`Executing LLM API task: ${task.type}`, {
    component: "LLM-API",
    taskId: task.id,
  });

  emitJsonTaskProgress(task, "initializing", "Initializing analysis...");

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
    emitJsonTaskProgress(task, "initializing", "Initializing LLM client...");
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

    emitJsonTaskProgress(task, "analyzing", "Analyzing domain files...");
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

      emitSocketEvent(getLogEventForTaskType(task.type), {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stdout",
        log: `\n${"-".repeat(80)}\n[Iteration ${iterationCount}/${maxIterations}] 📤 Sending message to LLM...\n${"-".repeat(80)}\n`,
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
      emitSocketEvent(getLogEventForTaskType(task.type), {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stdout",
        log: responseLog,
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

        emitSocketEvent(getLogEventForTaskType(task.type), {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n🔧 [Tool Calls] LLM requested ${response.toolCalls.length} tool(s): ${toolNames}\n`,
        });

        // Store tool calls in chat state
        chatState.addToolUse(
          response.toolCalls.map((tc) => ({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments, // Use 'arguments' to match normalized format
          })),
        );

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          // Extract file path for progress message
          const filePath =
            toolCall.arguments?.path || toolCall.arguments?.file_path || "file";
          let progressMessage = `Reading ${filePath}`;
          if (toolCall.name === "list_directory") {
            progressMessage = `Listing directory ${filePath}`;
          }
          emitJsonTaskProgress(task, "analyzing", progressMessage);

          taskLogger.info(`  🔨 Executing: ${toolCall.name}`, {
            component: "LLM-API",
            toolName: toolCall.name,
            args: toolCall.arguments,
          });

          const argsPreview = JSON.stringify(toolCall.arguments).substring(
            0,
            150,
          );
          emitSocketEvent(getLogEventForTaskType(task.type), {
            taskId: task.id,
            domainId: task.params?.domainId,
            type: task.type,
            stream: "stdout",
            log: `  ├─ 🔨 Executing: ${toolCall.name}\n  │  Args: ${argsPreview}${JSON.stringify(toolCall.arguments).length > 150 ? "..." : ""}\n`,
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

        emitSocketEvent(getLogEventForTaskType(task.type), {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [COMPLETE] LLM has finished the analysis\n`,
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
      emitJsonTaskProgress(task, "processing", "Extracting results...");
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
              emitSocketEvent(getLogEventForTaskType(task.type), {
                taskId: task.id,
                domainId: task.params?.domainId,
                type: task.type,
                stream: "stdout",
                log: `[JSON Found] ✅ Successfully extracted and parsed JSON from response\n`,
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
        emitJsonTaskProgress(task, "saving", "Saving results...");
        await fs.writeFile(
          outputPath,
          JSON.stringify(jsonContent, null, 2),
          "utf-8",
        );
        taskLogger.info("✅ Output file written successfully", {
          component: "LLM-API",
          file: task.outputFile,
        });
        emitSocketEvent(getLogEventForTaskType(task.type), {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `[File Written] ✅ Created ${task.outputFile}\n`,
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
