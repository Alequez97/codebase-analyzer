import { emitSocketEvent } from "../../utils/socket-emitter.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import * as logger from "../../utils/logger.js";
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_TYPES,
} from "../../constants/tool-error-codes.js";

/**
 * Message tools that LLM can use to communicate with users
 */

/**
 * Tool definitions for LLM
 */
export const MESSAGE_TOOLS = [
  {
    name: "message_user",
    description:
      "Send a message or question to the user and wait for their response. Use this to present options, clarify requirements, or gather feedback before proceeding. The user's response will be returned as the tool result. This is blocking - the agent will pause until the user responds.",
    parameters: {
      message: {
        type: "string",
        description:
          "The message or question to send to the user. Be clear and specific. When providing user_options, keep this message concise — the options themselves carry the detail.",
      },
      expectResponse: {
        type: "boolean",
        description:
          "If true (default), wait for user response. If false, just notify without blocking.",
      },
      user_options: {
        type: "array",
        description:
          "Optional list of predefined choices to present to the user as clickable buttons. Each entry is a short label string (e.g. 'Deep Professional', 'Bright Focus'). When provided, the UI renders these as interactive options instead of a free-text input.",
        items: { type: "string" },
      },
      selectionType: {
        type: "string",
        enum: ["single", "multiple"],
        description:
          "When user_options is provided: 'single' (default) means the user picks exactly one option; 'multiple' means the user can pick several before confirming.",
      },
    },
    required: ["message"],
  },
];

/**
 * MessageToolExecutor - Handles user communication tools
 */
export class MessageToolExecutor {
  /**
   * @param {string} taskId - Current task ID (for correlation)
   * @param {Object} responseHandler - Handler for waiting for user responses
   * @param {Function} responseHandler.waitForResponse - Function that returns a promise resolving to user's response
   */
  constructor(taskId, responseHandler) {
    this.taskId = taskId;
    this.responseHandler = responseHandler;
  }

  /**
   * Get human-readable description for progress display
   * @param {string} _toolName - Tool name (ignored, we only handle one tool)
   * @param {Object} args - Tool arguments
   * @returns {string} Human-readable description
   */
  getToolDescription(_toolName, args) {
    return "Asking user a question...";
  }

  /**
   * Execute message_user tool
   * @param {string} _toolName - Tool name (ignored, we only handle message_user)
   * @param {Object} args - Tool arguments
   * @returns {Promise<string>} Tool result
   */
  async execute(_toolName, args) {
    return this.messageUser(args);
  }

  /**
   * Send a message to the user (optionally wait for response)
   * @private
   */
  async messageUser(args) {
    const {
      message,
      expectResponse = true,
      user_options,
      selectionType = "single",
    } = args;

    if (!message || typeof message !== "string" || !message.trim()) {
      const error = new Error(
        "message parameter is required and must be non-empty",
      );
      error.code = TOOL_ERROR_CODES.INVALID_ARGUMENTS;
      error.type = TOOL_ERROR_TYPES.VALIDATION;
      throw error;
    }

    logger.info("Agent sending message to user", {
      component: "MessageToolExecutor",
      taskId: this.taskId,
      expectResponse,
      messageLength: message.length,
    });

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Emit message to frontend via socket
    emitSocketEvent(SOCKET_EVENTS.TASK_MESSAGE_TO_USER, {
      taskId: this.taskId,
      messageId,
      message: message.trim(),
      expectResponse,
      timestamp: new Date().toISOString(),
      ...(Array.isArray(user_options) && user_options.length > 0
        ? { user_options, selectionType }
        : {}),
    });

    // If not expecting a response, return immediately
    if (!expectResponse) {
      logger.debug("Message sent (no response expected)", {
        component: "MessageToolExecutor",
        taskId: this.taskId,
      });

      return JSON.stringify({
        success: true,
        notified: true,
        message: "Message sent to user (no response expected)",
      });
    }

    // Wait for user response
    logger.info("Waiting for user response...", {
      component: "MessageToolExecutor",
      taskId: this.taskId,
      messageId,
    });

    try {
      const userResponse =
        await this.responseHandler.waitForResponse(messageId);

      logger.info("User response received", {
        component: "MessageToolExecutor",
        taskId: this.taskId,
        messageId,
        responseLength: userResponse?.length,
      });

      // Return the user's response as the tool result
      // The LLM will see this in the next iteration
      return JSON.stringify({
        success: true,
        userResponse: userResponse.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error waiting for user response", {
        component: "MessageToolExecutor",
        taskId: this.taskId,
        messageId,
        error: error.message,
      });

      // If timeout or other error, return an error result
      // The LLM can decide how to proceed
      return JSON.stringify({
        success: false,
        error: error.message || "Failed to receive user response",
        message:
          "User did not respond in time. Consider proceeding with defaults or asking again differently.",
      });
    }
  }
}
