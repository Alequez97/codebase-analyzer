import * as logger from "../utils/logger.js";

/**
 * Chat State Manager
 * Manages conversation history, token counting, and context compaction
 */
export class ChatState {
  constructor(llmClient, options = {}) {
    this.client = llmClient;
    this.messages = [];
    this.maxContextTokens =
      options.maxContextTokens || this.client.getMaxContextTokens();
    this.compactionThreshold =
      options.compactionThreshold || Math.floor(this.maxContextTokens * 0.75);
    this.fileCache = new Map(); // Track which files we've already sent
  }

  /**
   * Add a system message (typically the initial instruction)
   */
  addSystemMessage(content) {
    this.messages.push({
      role: "system",
      content,
    });
  }

  /**
   * Add a user message
   */
  addUserMessage(content) {
    this.messages.push({
      role: "user",
      content,
    });
  }

  /**
   * Add an assistant message
   */
  addAssistantMessage(content) {
    this.messages.push({
      role: "assistant",
      content,
    });
  }

  /**
   * Add tool use by assistant (when LLM calls a tool)
   */
  addToolUse(toolCalls) {
    // Store tool calls in assistant message content
    // This follows Anthropic's format where tool_use is part of assistant message
    this.messages.push({
      role: "assistant",
      content: toolCalls,
    });
  }

  /**
   * Add tool result (response from executing a tool)
   */
  addToolResult(toolCallId, toolName, result) {
    this.messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolCallId,
          content: result,
        },
      ],
    });
  }

  /**
   * Get all messages
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Get current token count
   */
  getTokenCount() {
    return this.client.countMessageTokens(this.messages);
  }

  /**
   * Check if we're approaching token limits
   */
  needsCompaction() {
    return this.getTokenCount() > this.compactionThreshold;
  }

  /**
   * Compact the conversation to reduce token usage
   * Strategy: Keep system message, summarize middle, keep recent messages
   */
  async compact() {
    if (this.messages.length <= 3) {
      return; // Too few messages to compact
    }

    const tokenCount = this.getTokenCount();
    logger.debug(`Compacting context. Current tokens: ${tokenCount}`, {
      component: "ChatState",
    });

    // Separate messages into segments
    const systemMessages = this.messages.filter((m) => m.role === "system");
    const conversationMessages = this.messages.filter(
      (m) => m.role !== "system",
    );

    // Keep last N messages (recent context)
    const keepRecentCount = 4; // Keep last 2 exchanges (4 messages)
    const recentMessages = conversationMessages.slice(-keepRecentCount);
    const oldMessages = conversationMessages.slice(0, -keepRecentCount);

    if (oldMessages.length === 0) {
      return; // Nothing to compact
    }

    // Create summary of old messages
    const summary = this._summarizeMessages(oldMessages);

    // Rebuild messages: system + summary + recent
    this.messages = [
      ...systemMessages,
      {
        role: "user",
        content: `[Previous conversation summary]\n${summary}\n[End of summary. Continuing from recent context...]`,
      },
      ...recentMessages,
    ];

    const newTokenCount = this.getTokenCount();
    logger.debug(
      `Compaction complete. New tokens: ${newTokenCount} (saved ${tokenCount - newTokenCount})`,
      { component: "ChatState" },
    );
  }

  /**
   * Summarize messages for compaction
   * @private
   */
  _summarizeMessages(messages) {
    const summaryParts = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        const content = this._extractTextContent(msg.content);
        // Truncate long user messages
        const truncated =
          content.length > 200 ? content.slice(0, 200) + "..." : content;
        summaryParts.push(`User: ${truncated}`);
      } else if (msg.role === "assistant") {
        const content = this._extractTextContent(msg.content);
        const truncated =
          content.length > 300 ? content.slice(0, 300) + "..." : content;
        summaryParts.push(`Assistant: ${truncated}`);
      }
    }

    return summaryParts.join("\n\n");
  }

  /**
   * Extract text content from various message formats
   * @private
   */
  _extractTextContent(content) {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block) => {
          if (typeof block === "string") return block;
          if (block.type === "text") return block.text;
          if (block.type === "tool_result") return "[Tool result]";
          if (block.type === "tool_use") return `[Tool call: ${block.name}]`;
          return "";
        })
        .join(" ");
    }

    return JSON.stringify(content);
  }

  /**
   * Mark a file as cached (already sent to LLM)
   */
  markFileCached(filePath) {
    this.fileCache.set(filePath, true);
  }

  /**
   * Check if file was already sent
   */
  isFileCached(filePath) {
    return this.fileCache.has(filePath);
  }

  /**
   * Clear the conversation (start fresh)
   */
  clear() {
    this.messages = [];
    this.fileCache.clear();
  }

  /**
   * Get conversation stats
   */
  getStats() {
    return {
      messageCount: this.messages.length,
      tokenCount: this.getTokenCount(),
      maxTokens: this.maxContextTokens,
      utilizationPercent: Math.round(
        (this.getTokenCount() / this.maxContextTokens) * 100,
      ),
      cachedFiles: this.fileCache.size,
    };
  }
}
