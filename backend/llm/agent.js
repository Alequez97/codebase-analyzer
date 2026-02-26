import { FileToolExecutor, FILE_TOOLS } from "./tools/file-tools.js";
import { PROGRESS_STAGES } from "../constants/progress-stages.js";
import * as logger from "../utils/logger.js";

/**
 * LLMAgent - High-level abstraction for LLM conversations with tool support
 *
 * Encapsulates:
 * - Client + state management
 * - Conversation loop with tool execution
 * - Progress callbacks and streaming
 * - Context compaction
 */
export class LLMAgent {
  /**
   * @param {BaseLLMClient} client - LLM client instance
   * @param {ChatState} state - Chat state manager
   * @param {Object} options - Agent options
   * @param {string} options.workingDirectory - Directory for file operations
   * @param {number} options.maxIterations - Max conversation iterations (default: 30)
   * @param {number} options.maxTokens - Max tokens per response (default: from client config)
   */
  constructor(client, state, options = {}) {
    this.client = client;
    this.state = state;
    this.workingDirectory = options.workingDirectory;
    this.maxIterations = options.maxIterations || 30;
    this.maxTokens = options.maxTokens || client.config?.maxTokens || 4096;
    this.fileToolExecutor = new FileToolExecutor(this.workingDirectory);
    this.conversationLog = [];
  }

  /**
   * Run a conversation with the LLM
   *
   * @param {Object} config - Run configuration
   * @param {string} config.systemPrompt - System instructions
   * @param {string} config.initialMessage - Initial user message
   * @param {Function} config.onProgress - Progress callback (stage, message, data)
   * @param {Function} config.onToolCall - Tool call callback (toolName, args, result)
   * @param {Function} config.onIteration - Iteration callback (iteration, response)
   * @param {Function} config.onMessage - Message callback (role, content)
   * @param {Function} config.onComplete - Completion callback (stopReason, iterations)
   * @param {Function} config.shouldContinue - Custom continuation logic (response, iteration) => boolean
   * @returns {Promise<Object>} Result with metadata and conversation log
   */
  async run(config) {
    const {
      systemPrompt,
      initialMessage,
      onProgress = () => {},
      onToolCall = () => {},
      onIteration = () => {},
      onMessage = () => {},
      onComplete = () => {},
      shouldContinue = null,
    } = config;

    // Initialize conversation
    this.state.addSystemMessage(systemPrompt);
    this.state.addUserMessage(initialMessage);

    onProgress({
      stage: PROGRESS_STAGES.INITIALIZING,
      message: "Starting conversation...",
    });

    let iterationCount = 0;
    let stopReason = null;

    while (iterationCount < this.maxIterations) {
      iterationCount++;

      logger.debug(`Iteration ${iterationCount}/${this.maxIterations}`, {
        component: "LLMAgent",
        tokenCount: this.state.getTokenCount(),
      });

      onProgress({
        stage: PROGRESS_STAGES.PROCESSING,
        message: `Waiting for AI response...`,
        iteration: iterationCount,
      });

      // Check if context needs compaction
      if (this.state.needsCompaction()) {
        logger.info("Context needs compaction, summarizing conversation...", {
          component: "LLMAgent",
        });
        onProgress({
          stage: PROGRESS_STAGES.COMPACTING,
          message: "Compacting context...",
        });
        await this.state.compact(this.client);
      }

      // Send message to LLM
      const response = await this.client.sendMessage(this.state.getMessages(), {
        tools: FILE_TOOLS,
        maxTokens: this.maxTokens,
      });

      // Log this iteration
      this.conversationLog.push({
        iteration: iterationCount,
        timestamp: new Date().toISOString(),
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        stopReason: response.stopReason,
        hasToolCalls: Boolean(response.toolCalls?.length),
        toolCount: response.toolCalls?.length || 0,
      });

      logger.debug(`Response received`, {
        component: "LLMAgent",
        stopReason: response.stopReason,
        toolCalls: response.toolCalls?.length || 0,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });

      // Callback for each iteration
      onIteration(iterationCount, response);

      // Handle text response
      if (response.content && typeof response.content === "string") {
        this.state.addAssistantMessage(response.content);
        onMessage("assistant", response.content);
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.handleToolCalls(response.toolCalls, {
          onToolCall,
          onProgress,
          iteration: iterationCount,
        });
        continue; // Continue conversation after tool execution
      }

      // No tool calls - AI is likely finishing up
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        onProgress({
          stage: PROGRESS_STAGES.COMPLETING,
          message: "AI analysis complete",
          iteration: iterationCount,
        });
      }

      // Check stop conditions
      stopReason = response.stopReason;

      // Use custom continuation logic if provided
      if (shouldContinue) {
        const continueConversation = shouldContinue(response, iterationCount);
        if (!continueConversation) {
          break;
        }
        // Custom logic says continue - skip default checks
        continue;
      } else {
        // Default: stop if LLM indicates completion
        if (
          response.stopReason === "end_turn" ||
          response.stopReason === "stop_sequence" ||
          response.stopReason === "completed"
        ) {
          break;
        }

        // Handle max_tokens by requesting final output
        if (response.stopReason === "max_tokens") {
          logger.warn("Max tokens reached in response", {
            component: "LLMAgent",
          });
          this.state.addUserMessage(
            "You've reached the token limit. Please provide your final output now.",
          );
          continue;
        }
      }

      // If we get here with no tool calls and unexpected stop reason, break
      logger.debug(`No tool calls and stop reason: ${stopReason}`, {
        component: "LLMAgent",
      });
      break;
    }

    // Calculate total token usage
    const totalTokens = this.conversationLog.reduce(
      (acc, log) => ({
        input: acc.input + log.inputTokens,
        output: acc.output + log.outputTokens,
      }),
      { input: 0, output: 0 },
    );

    const result = {
      success: true,
      iterations: iterationCount,
      stopReason,
      tokenUsage: {
        inputTokens: totalTokens.input,
        outputTokens: totalTokens.output,
        totalTokens: totalTokens.input + totalTokens.output,
      },
      conversationLog: this.conversationLog,
    };

    onComplete(result);

    return result;
  }

  /**
   * Handle tool calls from LLM
   * @private
   */
  async handleToolCalls(toolCalls, { onToolCall, onProgress, iteration }) {
    logger.info(`Executing ${toolCalls.length} tool call(s)`, {
      component: "LLMAgent",
      tools: toolCalls.map((tc) => tc.name).join(", "),
    });

    // Add tool use to state
    this.state.addToolUse(
      toolCalls.map((tc) => ({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
    );

    // Execute each tool
    for (const toolCall of toolCalls) {
      const filePath =
        toolCall.arguments?.path || toolCall.arguments?.file_path || "unknown";
      const startLine = toolCall.arguments?.start_line;
      const endLine = toolCall.arguments?.end_line;

      let toolDescription = toolCall.name;
      if (toolCall.name === "read_file") {
        toolDescription =
          startLine && endLine
            ? `Reading ${filePath} (lines ${startLine}-${endLine})`
            : `Reading ${filePath}`;
      } else if (toolCall.name === "list_directory") {
        toolDescription = `Listing directory ${filePath}`;
      } else if (toolCall.name === "write_file") {
        toolDescription = `Writing ${filePath}`;
      }

      logger.debug(`Executing tool: ${toolDescription}`, {
        component: "LLMAgent",
        tool: toolCall.name,
      });

      onProgress({
        stage: PROGRESS_STAGES.TOOL_EXECUTION,
        message: toolDescription,
        iteration,
        tool: toolCall.name,
      });

      try {
        const result = await this.fileToolExecutor.executeTool(
          toolCall.name,
          toolCall.arguments,
        );

        this.state.addToolResult(toolCall.id, toolCall.name, result);

        logger.debug(`Tool completed: ${toolCall.name}`, {
          component: "LLMAgent",
          resultLength: result.length,
        });

        onToolCall(toolCall.name, toolCall.arguments, result);
      } catch (error) {
        const errorResult = `Error: ${error.message}`;
        this.state.addToolResult(toolCall.id, toolCall.name, errorResult);

        logger.error(`Tool failed: ${toolCall.name}`, {
          component: "LLMAgent",
          error: error.message,
        });

        onToolCall(toolCall.name, toolCall.arguments, errorResult, error);
      }
    }
  }

  /**
   * Add a user message to continue the conversation
   */
  addUserMessage(content) {
    this.state.addUserMessage(content);
  }

  /**
   * Get current conversation messages
   */
  getMessages() {
    return this.state.getMessages();
  }

  /**
   * Get conversation metadata
   */
  getMetadata() {
    const inputTokens = this.conversationLog.reduce(
      (sum, log) => sum + log.inputTokens,
      0,
    );
    const outputTokens = this.conversationLog.reduce(
      (sum, log) => sum + log.outputTokens,
      0,
    );

    return {
      iterations: this.conversationLog.length,
      totalTokens: inputTokens + outputTokens,
      tokenUsage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      conversationLog: this.conversationLog,
    };
  }

  /**
   * Extract JSON from conversation (for tasks that output JSON)
   */
  extractJSON() {
    const messages = this.state.getMessages();

    // Find last assistant message with JSON content
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      if (
        msg.role === "assistant" &&
        msg.content &&
        typeof msg.content === "string"
      ) {
        const content = msg.content;

        // Try to extract JSON from markdown code blocks or plain text
        const jsonMatch =
          content.match(/```json\s*\n?([\s\S]*?)\n?```/) ||
          content.match(/```\s*\n?([\s\S]*?)\n?```/) ||
          content.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[1].trim();
            const parsed = JSON.parse(extractedJson);

            // Skip tool call metadata
            if (parsed.type === "tool_use" || parsed.name === "write_file") {
              continue;
            }

            return parsed;
          } catch {
            // Continue searching
          }
        }
      }
    }

    return null;
  }
}
