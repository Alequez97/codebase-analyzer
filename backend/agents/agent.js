import { ToolRegistry } from "../llm/tools/index.js";
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
    this.tools = new ToolRegistry(this.workingDirectory);
    this.conversationLog = [];
  }

  /**
   * Enable command execution tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {Object} [options]
   * @param {number} [options.timeoutMs] - Command timeout in ms (default: 30 000)
   * @param {string[]} [options.additionalAllowedPrefixes] - Extra safe command prefixes
   */
  enableCommandTools(options = {}) {
    this.tools.enableCommandTools(options);
    logger.info("Command tools enabled for agent session", {
      component: "LLMAgent",
      timeoutMs: options.timeoutMs,
    });
  }

  /**
   * Enable task-delegation tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {string} parentTaskId - ID of the current task (embedded in synthetic chatIds)
   * @param {Object<string, Function>} queueFunctions - Map of task-type → queue function
   */
  enableDelegationTools(parentTaskId, queueFunctions) {
    this.tools.enableDelegationTools(parentTaskId, queueFunctions);
    logger.info("Delegation tools enabled for agent session", {
      component: "LLMAgent",
      parentTaskId,
      delegatableTypes: Object.keys(queueFunctions),
    });
  }

  /**
   * Enable web search tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {string} apiKey - Brave Search API key
   */
  enableWebSearchTools(apiKey) {
    this.tools.enableWebSearchTools(apiKey);
    logger.info("Web search tools enabled for agent session", {
      component: "LLMAgent",
    });
  }

  /**
   * Enable URL fetch tools for this agent session.
   * Must be called before run() to take effect.
   */
  enableWebFetchTools() {
    this.tools.enableWebFetchTools();
    logger.info("Web fetch tools enabled for agent session", {
      component: "LLMAgent",
    });
  }

  /**Enable message tools for this agent session (for conversational agents).
   * Must be called before run() to take effect.
   *
   * @param {string} taskId - ID of the current task (for correlation)
   * @param {Object} responseHandler - Handler for waiting for user responses
   * @param {Function} responseHandler.waitForResponse - Async function that waits for user response
   */
  enableMessageTools(responseHandler) {
    this.tools.enableMessageTools(responseHandler);
    logger.info("Message tools enabled for agent session", {
      component: "LLMAgent",
    });
  }

  /**
   * Run a conversation with the LLM
   *
   * @param {Object} handler - Task handler with configuration and callbacks
   * @param {string} handler.systemPrompt - System instructions
   * @param {string} handler.initialMessage - Current user message
   * @param {Array}  handler.priorMessages - Prior conversation turns
   * @param {Function} handler.onStart - Start callback
   * @param {Function} handler.onProgress - Progress callback
   * @param {Function} handler.onToolCall - Tool call callback
   * @param {Function} handler.onIteration - Iteration callback
   * @param {Function} handler.onMessage - Message callback
   * @param {Function} handler.onCompaction - Compaction callback
   * @param {Function} handler.onComplete - Completion callback
   * @param {Function} handler.shouldContinue - Custom continuation logic
   * @param {AbortSignal} [abortSignal] - Optional abort signal
   * @returns {Promise<Object>} Result with metadata and conversation log
   */
  async run(handler, abortSignal = null) {
    const {
      systemPrompt,
      initialMessage,
      priorMessages = [],
      onStart = () => {},
      onProgress = () => {},
      onToolCall = () => {},
      onIteration = () => {},
      onMessage = () => {},
      onCompaction = () => {},
      onComplete = async () => {},
      shouldContinue = null,
    } = handler;

    // Initialize conversation
    this.state.addSystemMessage(systemPrompt);

    // Replay prior conversation turns so the LLM has multi-turn context
    for (const msg of priorMessages) {
      if (msg.role === "user") {
        this.state.addUserMessage(msg.content);
      } else if (msg.role === "assistant") {
        // Pass reasoning_content if present (required for Kimi/DeepSeek thinking mode)
        this.state.addAssistantMessage(msg.content, {
          reasoningContent: msg.reasoning_content ?? null,
        });
      }
    }

    // Add the current user message
    this.state.addUserMessage(initialMessage);

    // Call onStart before the first iteration
    onStart();

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
        message: `Thinking...`,
        iteration: iterationCount,
      });

      // Check if context needs compaction
      if (this.state.needsCompaction()) {
        logger.info("Context needs compaction, summarizing conversation...", {
          component: "LLMAgent",
        });
        onCompaction("start");
        await this.state.compact(this.client);
        const tokensAfterCompaction = this.state.getTokenCount();
        logger.info(
          `🗜️  Compaction complete. Tokens after: ~${tokensAfterCompaction}`,
          { component: "LLMAgent" },
        );
        onCompaction("complete", tokensAfterCompaction);
      }

      // Check for cancellation before making the (potentially long) LLM call
      if (abortSignal?.aborted) {
        const err = new Error("Task cancelled");
        err.code = "TASK_CANCELLED";
        throw err;
      }

      // Send message to LLM
      const response = await this.client.sendMessage(this.state.getMessages(), {
        tools: this.tools.getAvailableTools(),
        maxTokens: this.maxTokens,
        signal: abortSignal,
      });

      // Anchor state token count with the real value from the API so that
      // needsCompaction() uses actual usage rather than a character estimate,
      // preventing repeated compaction when the estimate overshoots reality.
      if (response.usage?.inputTokens) {
        this.state.setActualTokenCount(response.usage.inputTokens);
      }

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
        this.state.addAssistantMessage(response.content, {
          reasoningContent: response.reasoningContent || null,
        });
        onMessage("assistant", response.content);
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.handleToolCalls(response.toolCalls, {
          onToolCall,
          onProgress,
          iteration: iterationCount,
          reasoningContent: response.reasoningContent || null,
        });
        continue; // Continue conversation after tool execution
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

    let result = {
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

    // Call onComplete for validation, logging, socket events, etc.
    const onCompleteResult = await onComplete(result);
    if (onCompleteResult) {
      result = { ...result, ...onCompleteResult };
    }

    return result;
  }

  /**
   * Handle tool calls from LLM
   * @private
   */
  async handleToolCalls(
    toolCalls,
    { onToolCall, onProgress, iteration, reasoningContent = null },
  ) {
    logger.debug(`Executing ${toolCalls.length} tool call(s)`, {
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
      { reasoningContent },
    );

    // Execute each tool
    for (const toolCall of toolCalls) {
      try {
        // Route to the appropriate executor
        const match = this.tools.findExecutor(toolCall.name);

        if (!match) {
          throw new Error(`No executor found for tool: ${toolCall.name}`);
        }

        const { executor, stringifyResult } = match;
        const toolDescription = executor.getToolDescription(
          toolCall.name,
          toolCall.arguments,
        );

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

        let result = await executor.execute(toolCall.name, toolCall.arguments);

        if (stringifyResult) {
          result = JSON.stringify(result, null, 2);
        }

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
