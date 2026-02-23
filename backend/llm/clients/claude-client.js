import Anthropic from "@anthropic-ai/sdk";
import { BaseLLMClient } from "./base-client.js";

/**
 * Claude/Anthropic LLM Client Implementation
 */
export class ClaudeClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("Anthropic API key is required");
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    // See: https://docs.anthropic.com/en/docs/about-claude/models
    this.model = config.model;
    this.reasoningEffort = config.reasoningEffort;
  }

  /**
   * Send a message to Claude
   * @param {Array<Object>} messages - Conversation history
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const requestParams = {
      model: this.model,
      max_tokens: this.config.maxTokens,
      messages: this.formatMessages(messages),
    };

    // Add system message if present
    const systemMessage = messages.find((m) => m.role === "system");
    if (systemMessage) {
      requestParams.system = systemMessage.content;
      requestParams.messages = requestParams.messages.filter(
        (m) => m.role !== "system",
      );
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = this.formatTools(options.tools);
    }

    // Add temperature if specified
    if (options.temperature !== undefined) {
      requestParams.temperature = options.temperature;
    } else if (this.config.temperature !== undefined) {
      requestParams.temperature = this.config.temperature;
    }

    // Add thinking/reasoning for extended thinking models (Claude Opus 4 supports this)
    if (options.reasoningEffort !== undefined) {
      requestParams.thinking = {
        type: "enabled",
        budget_tokens: this.getThinkingBudget(options.reasoningEffort),
      };
    } else if (this.reasoningEffort !== undefined) {
      requestParams.thinking = {
        type: "enabled",
        budget_tokens: this.getThinkingBudget(this.reasoningEffort),
      };
    }

    try {
      const response = await this.client.messages.create(requestParams);
      return this.normalizeResponse(response);
    } catch (error) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Get thinking token budget based on reasoning effort
   * @private
   */
  getThinkingBudget(effort) {
    const budgets = {
      low: 1000,
      medium: 5000,
      high: 10000,
    };
    return budgets[effort] || budgets.medium;
  }

  /**
   * Format messages for Claude API
   * @private
   */
  formatMessages(messages) {
    return messages
      .filter((m) => m.role !== "system")
      .map((msg) => {
        // Normalize content to array format for consistency
        // Claude requires array format when using tools
        let content = msg.content;

        // If content is a string, convert to array format with type field
        if (typeof content === "string") {
          content = [{ type: "text", text: content }];
        }

        return {
          role: msg.role,
          content,
        };
      });
  }

  /**
   * Format tools for Claude API
   * @private
   */
  formatTools(tools) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.parameters,
        required: tool.required || Object.keys(tool.parameters),
      },
    }));
  }

  /**
   * Normalize Claude response to standard format
   * @private
   */
  normalizeResponse(response) {
    const result = {
      content: "",
      toolCalls: [],
      stopReason: response.stop_reason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    // Process content blocks
    for (const block of response.content) {
      if (block.type === "text") {
        result.content += block.text;
      } else if (block.type === "tool_use") {
        result.toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return result;
  }

  /**
   * Get maximum context size for Claude models
   */
  getMaxContextTokens() {
    // Claude 3.5 Sonnet and newer models have 200K context
    if (
      this.model.includes("claude-3-5") ||
      this.model.includes("claude-3-opus")
    ) {
      return 200000;
    }
    // Claude 3 Haiku and Sonnet
    if (this.model.includes("claude-3")) {
      return 200000;
    }
    // Older models
    return 100000;
  }

  /**
   * Better token counting for Claude (still approximate)
   * Claude uses a different tokenizer, but this is closer than base implementation
   */
  countTokens(text) {
    // Claude's tokenizer is roughly ~3.5 chars per token for English
    // This is still an approximation - for exact counts we'd need the actual tokenizer
    return Math.ceil(text.length / 3.5);
  }
}
