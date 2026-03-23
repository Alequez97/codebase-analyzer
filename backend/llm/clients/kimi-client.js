import OpenAI from "openai";
import { BaseLLMClient } from "./base-client.js";

/**
 * Kimi (Moonshot) LLM Client Implementation
 * Kimi is OpenAI-compatible through Chat Completions API.
 *
 * Docs: https://platform.moonshot.ai/docs/guide/migrating-from-openai-to-kimi
 */
export class KimiClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("Kimi API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.moonshot.ai/v1",
    });

    this.model = config.model || "kimi-k2.5";
  }

  /**
   * Send a message to Kimi using Chat Completions API
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

      throw new Error(`Kimi API error: ${error.message}`);
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
   * Kimi context window depends on model family; use conservative default.
   */
  getMaxContextTokens() {
    return 128000;
  }

  /**
   * Token count approximation for Kimi models (~3.5 chars/token)
   */
  countTokens(text) {
    return Math.ceil(text.length / 3.5);
  }
}
