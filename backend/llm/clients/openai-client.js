import OpenAI from "openai";
import { BaseLLMClient } from "./base-client.js";

/**
 * OpenAI LLM Client Implementation
 * Supports GPT-4, GPT-4 Turbo, and future models like GPT-5.2
 */
export class OpenAIClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    // Default to GPT-4 Turbo if no model specified
    // Supports future models like gpt-5.2 when available
    // Current models: gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini
    this.model = config.model || "gpt-4o";
  }

  /**
   * Send a message to OpenAI
   * @param {Array<Object>} messages - Conversation history
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const requestParams = {
      model: this.model,
      max_completion_tokens: this.config.maxTokens || 4096,
      messages: this.formatMessages(messages),
    };

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
      const response = await this.client.chat.completions.create(requestParams);
      return this.normalizeResponse(response);
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Format messages for OpenAI API
   * OpenAI uses a simpler message format than Claude
   * @private
   */
  formatMessages(messages) {
    return messages.map((msg) => {
      // OpenAI requires separate system role
      if (msg.role === "system") {
        return {
          role: "system",
          content: msg.content,
        };
      }

      let content = msg.content;

      // Convert array format to simple string if it's just text
      if (Array.isArray(content)) {
        const textBlocks = content
          .filter((c) => c.type === "text")
          .map((c) => c.text);

        if (textBlocks.length === 1) {
          content = textBlocks[0];
        } else if (textBlocks.length > 1) {
          content = textBlocks.join("\n");
        }
      }

      return {
        role: msg.role,
        content:
          typeof content === "string" ? content : JSON.stringify(content),
      };
    });
  }

  /**
   * Format tools for OpenAI API
   * OpenAI uses a different tool format than Claude
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
          required: tool.required || Object.keys(tool.parameters),
        },
      },
    }));
  }

  /**
   * Normalize OpenAI response to standard format
   * @private
   */
  normalizeResponse(response) {
    const result = {
      content: "",
      toolCalls: [],
      stopReason: response.choices[0].finish_reason,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };

    const choice = response.choices[0];

    // Handle text content
    if (choice.message.content) {
      result.content = choice.message.content;
    }

    // Handle tool calls
    if (choice.message.tool_calls) {
      result.toolCalls = choice.message.tool_calls.map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments),
      }));
    }

    return result;
  }

  /**
   * Get maximum context size for OpenAI models
   */
  getMaxContextTokens() {
    // GPT-5.2 and future models (assumed 128K if not recognized)
    if (this.model.includes("gpt-5")) {
      return 128000;
    }
    // GPT-4 Turbo and GPT-4O
    if (
      this.model.includes("gpt-4-turbo") ||
      this.model.includes("gpt-4o") ||
      this.model.includes("gpt-4")
    ) {
      return 128000;
    }
    // GPT-3.5 Turbo
    if (this.model.includes("gpt-3.5")) {
      return 16000;
    }
    // Default fallback
    return 128000;
  }

  /**
   * Better token counting for OpenAI models
   * Uses approximation: ~4 chars per token for English
   */
  countTokens(text) {
    // OpenAI's official tokenizer approximation
    // Different models have slightly different ratios, but ~4 chars per token is reasonable
    return Math.ceil(text.length / 4);
  }
}
