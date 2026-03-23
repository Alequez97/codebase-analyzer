import OpenAI from "openai";
import { BaseLLMClient } from "./base-client.js";

/**
 * GLM (Z.AI) LLM Client Implementation
 * GLM is OpenAI-compatible through Chat Completions API.
 *
 * Docs: https://docs.z.ai/guides/llm/glm-5
 * API Base URL: https://api.z.ai/api/paas/v4
 *
 * GLM-5 supports:
 * - Chat Completions API
 * - Function calling (tools)
 * - Thinking/reasoning mode with { thinking: { type: "enabled"|"disabled" } }
 * - Streaming (not implemented in this client)
 */
export class GlmClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("GLM API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.z.ai/api/paas/v4",
    });

    this.model = config.model || "glm-5";
    this.thinking = config.thinking !== false; // Default to enabled
  }

  /**
   * Send a message to GLM using Chat Completions API
   * @param {Array<Object>} messages - Conversation history (OpenAI format)
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const requestParams = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
    };

    // Add thinking mode if enabled (GLM-5 specific)
    // Thinking mode provides reasoning content before the final answer
    if (this.thinking) {
      requestParams.thinking = { type: "enabled" };
    }

    // Add temperature if specified
    if (options.temperature !== undefined) {
      requestParams.temperature = options.temperature;
    } else if (this.config.temperature !== undefined) {
      requestParams.temperature = this.config.temperature;
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = this.formatTools(options.tools);
      requestParams.tool_choice = "auto";
    }

    try {
      const response = await this.client.chat.completions.create(
        requestParams,
        options.signal ? { signal: options.signal } : undefined,
      );
      return this.normalizeResponse(response);
    } catch (error) {
      if (error.name === "AbortError" || options.signal?.aborted) {
        const cancelled = new Error("Task cancelled");
        cancelled.code = "TASK_CANCELLED";
        throw cancelled;
      }

      throw new Error(`GLM API error: ${error.message}`);
    }
  }

  /**
   * Format tools to OpenAI Chat Completions function format
   * @private
   */
  formatTools(tools) {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters,
          required: tool.required || [],
        },
      },
    }));
  }

  /**
   * Normalize Chat Completions response to standard internal format
   * @private
   */
  normalizeResponse(response) {
    const choice = response.choices?.[0];
    const message = choice?.message || {};

    const result = {
      content: message.content || "",
      toolCalls: [],
      stopReason: choice?.finish_reason || "stop",
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };

    // Handle reasoning content (GLM-5 thinking mode)
    // GLM-5 returns reasoning content separately when thinking is enabled
    if (message.reasoning_content) {
      result.reasoningContent = message.reasoning_content;
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      result.toolCalls = message.tool_calls.map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments:
          typeof call.function.arguments === "string"
            ? JSON.parse(call.function.arguments)
            : call.function.arguments,
      }));
    }

    return result;
  }

  /**
   * GLM models have a 200K context window
   */
  getMaxContextTokens() {
    return 200000;
  }

  /**
   * Token count approximation for GLM models (~4 chars/token)
   */
  countTokens(text) {
    return Math.ceil(text.length / 4);
  }
}
