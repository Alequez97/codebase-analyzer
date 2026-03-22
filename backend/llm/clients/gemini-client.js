import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseLLMClient } from "./base-client.js";

/**
 * Google Gemini LLM Client Implementation
 * Uses the @google/generative-ai SDK for Gemini models
 */
export class GeminiClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("Google API key is required");
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || "gemini-1.5-pro";
  }

  /**
   * Send a message to Gemini using generateContent API
   * @param {Array<Object>} messages - Conversation history
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const generationConfig = {
      maxOutputTokens: options.maxTokens || this.config.maxTokens || 4096,
    };

    // Add temperature if specified
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    } else if (this.config.temperature !== undefined) {
      generationConfig.temperature = this.config.temperature;
    }

    // Create model instance with optional tools
    const modelConfig = {
      model: this.model,
      generationConfig,
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      modelConfig.tools = [
        {
          functionDeclarations: this.formatTools(options.tools),
        },
      ];
    }

    const model = this.genAI.getGenerativeModel(modelConfig);

    // Format messages for Gemini
    const { systemInstruction, contents } = this.formatMessages(messages);

    // Ensure the conversation starts with a user message
    // Gemini requires the first message to be from 'user' role
    if (contents.length > 0 && contents[0].role !== "user") {
      // If first message is not 'user', prepend a minimal user context
      contents.unshift({
        role: "user",
        parts: [{ text: "Continue the conversation." }],
      });
    }

    try {
      // Start chat with history if there are multiple messages
      if (contents.length > 1) {
        const chat = model.startChat({
          history: contents.slice(0, -1),
          systemInstruction,
        });

        // Send the last message
        const lastMessage = contents[contents.length - 1];

        // If the last message is not a user message, we need to handle it differently
        if (lastMessage.role !== "user") {
          // Add to history and send a continuation prompt
          const result = await model.generateContent(
            {
              contents: contents,
              systemInstruction,
            },
            options.signal ? { signal: options.signal } : undefined,
          );
          return this.normalizeResponse(result.response);
        }

        const result = await chat.sendMessage(
          lastMessage.parts,
          options.signal ? { signal: options.signal } : undefined,
        );

        return this.normalizeResponse(result.response);
      } else {
        // Single message - use generateContent directly
        const result = await model.generateContent(
          {
            contents: contents,
            systemInstruction,
          },
          options.signal ? { signal: options.signal } : undefined,
        );

        return this.normalizeResponse(result.response);
      }
    } catch (error) {
      if (error.name === "AbortError" || options.signal?.aborted) {
        const cancelled = new Error("Task cancelled");
        cancelled.code = "TASK_CANCELLED";
        throw cancelled;
      }
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Format messages for Gemini API
   * Gemini uses a different message format with roles: user, model, function
   * Messages must alternate between user and model roles
   * @private
   */
  formatMessages(messages) {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      // Extract system message separately
      if (msg.role === "system") {
        // Gemini expects systemInstruction to be a Content object with parts
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
        continue;
      }

      // Handle tool result messages
      if (msg.role === "tool") {
        // Function responses need to be paired with the model's function call
        // Add to the last model message if it exists and has function calls
        const lastContent = contents[contents.length - 1];
        if (lastContent && lastContent.role === "model") {
          // Add function response to the existing model message
          lastContent.parts.push({
            functionResponse: {
              name: msg.tool_call_id,
              response: {
                result: msg.content,
              },
            },
          });
        } else {
          // If no previous model message, create a new entry
          contents.push({
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: msg.tool_call_id,
                  response: {
                    result: msg.content,
                  },
                },
              },
            ],
          });
        }
        continue;
      }

      // Handle assistant messages with tool calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const parts = [];

        // Add text content if present
        if (msg.content && msg.content.trim()) {
          parts.push({ text: msg.content });
        }

        // Add function calls
        for (const toolCall of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments,
            },
          });
        }

        // Check if we need to merge with previous model message
        const lastContent = contents[contents.length - 1];
        if (lastContent && lastContent.role === "model") {
          lastContent.parts.push(...parts);
        } else {
          contents.push({
            role: "model",
            parts,
          });
        }
        continue;
      }

      // Convert role names (Gemini uses "model" instead of "assistant")
      let role = msg.role;
      if (role === "assistant") {
        role = "model";
      }

      // Handle content
      let content = msg.content;

      // Convert array format to simple string
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

      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);

      // Skip empty messages
      if (!contentStr || !contentStr.trim()) {
        continue;
      }

      // Merge consecutive messages with the same role
      const lastContent = contents[contents.length - 1];
      if (lastContent && lastContent.role === role) {
        // Append to existing message
        lastContent.parts.push({ text: contentStr });
      } else {
        // New message
        contents.push({
          role: role,
          parts: [{ text: contentStr }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  /**
   * Format tools for Gemini API
   * Converts tool definitions to Gemini function declaration format
   * @private
   */
  formatTools(tools) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters,
        required: tool.required || [],
      },
    }));
  }

  /**
   * Normalize Gemini response to standard format
   * @private
   */
  normalizeResponse(response) {
    const result = {
      content: "",
      toolCalls: [],
      stopReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };

    // Get the first candidate (Gemini can return multiple candidates)
    const candidate = response.candidates?.[0];
    if (!candidate) {
      return result;
    }

    // Process content parts
    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        result.content += part.text;
      } else if (part.functionCall) {
        result.toolCalls.push({
          id: part.functionCall.name, // Gemini doesn't provide a separate ID
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        });
      }
    }

    return result;
  }

  /**
   * Map Gemini finish reasons to standard stop reasons
   * @private
   */
  mapFinishReason(finishReason) {
    const reasonMap = {
      STOP: "stop",
      MAX_TOKENS: "max_tokens",
      SAFETY: "safety",
      RECITATION: "recitation",
      OTHER: "other",
    };
    return reasonMap[finishReason] || "unknown";
  }

  /**
   * Get maximum context size for Gemini models
   */
  getMaxContextTokens() {
    // Gemini 2.0 Flash has 1M context window
    if (this.model.includes("gemini-2.0")) {
      return 1000000;
    }
    // Gemini 1.5 Pro and Flash have 1M context window
    if (this.model.includes("gemini-1.5")) {
      return 1000000;
    }
    // Gemini 1.0 Pro has 32K context
    if (this.model.includes("gemini-1.0-pro")) {
      return 32000;
    }
    // Default to 1M for newer models
    return 1000000;
  }

  /**
   * Better token counting for Gemini models
   * Uses approximation: ~4 chars per token for English
   */
  countTokens(text) {
    // Gemini uses a similar tokenization approach to other models
    // ~4 chars per token is a reasonable approximation
    return Math.ceil(text.length / 4);
  }
}
