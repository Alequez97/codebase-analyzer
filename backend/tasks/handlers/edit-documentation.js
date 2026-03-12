import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitSocketEvent } from "../../utils/socket-emitter.js";
import {
  appendDomainSectionChatMessage,
  deleteDomainSectionChatHistory,
} from "../../utils/chat-history.js";

/**
 * Handler for edit-documentation task
 * Defines how AI chat editing works for documentation
 * Only overrides what's different from default
 *
 * @param {Object} task
 * @param {Object} taskLogger
 * @param {Object} agent
 * @param {Object} chatContext - Conversation context loaded from the session file
 * @param {string} chatContext.initialMessage - The current user message to process
 * @param {Array}  chatContext.priorMessages  - Prior turns for multi-turn context
 */
export function editDocumentationHandler(
  task,
  taskLogger,
  agent,
  { initialMessage, priorMessages = [] } = {},
) {
  return {
    initialMessage,
    priorMessages,

    onStart: () => {
      taskLogger.info("🤔 AI is thinking...", {
        component: "EditDocumentation",
      });

      emitSocketEvent(SOCKET_EVENTS.CHAT_MESSAGE, {
        // Use the stable session chatId, NOT task.id.
        // The frontend routes socket events by this stable chatId.
        chatId: task.params.chatId,
        taskId: task.id,
        domainId: task.params.domainId,
        sectionType: task.params.sectionType,
        thinking: true,
        timestamp: new Date().toISOString(),
      });
    },

    onProgress: () => {
      // No progress-specific logic needed
    },

    // Emit each AI text message as a chat message and persist it
    onMessage: (role, content) => {
      if (role === "assistant") {
        taskLogger.info(`📨 Sending AI chat message to client`, {
          component: "EditDocumentation",
          contentLength: content.length,
        });

        emitSocketEvent(SOCKET_EVENTS.CHAT_MESSAGE, {
          chatId: task.params.chatId,
          taskId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          content,
          timestamp: new Date().toISOString(),
        });

        // Persist assistant reply to the session file on the backend.
        // This is the authoritative persistence path — the frontend must NOT
        // also call appendDomainSectionChatMessage for assistant messages.
        appendDomainSectionChatMessage(
          task.params.domainId,
          task.params.sectionType,
          { role: "assistant", content, chatId: task.params.chatId },
        ).catch((err) => {
          taskLogger.warn(`Failed to persist assistant message`, {
            component: "EditDocumentation",
            error: err.message,
          });
        });
      }
    },

    onComplete: async (_result) => {
      const outputPath = path.join(config.target.directory, task.outputFile);
      const content = await fs.readFile(outputPath, "utf-8");

      if (!content || content.length < 10) {
        return {
          success: false,
          error: `AI did not write updated documentation to file`,
        };
      }

      emitSocketEvent(SOCKET_EVENTS.DOCUMENTATION_UPDATED, {
        chatId: task.params.chatId,
        taskId: task.id,
        domainId: task.params?.domainId,
        content,
        isEdit: true,
      });

      taskLogger.info("✅ Updated documentation sent via socket", {
        component: "EditDocumentation",
        contentLength: content.length,
      });

      // Clean up the synthetic chat history file created by the delegation layer
      if (task.params.delegatedByTaskId) {
        await deleteDomainSectionChatHistory(
          task.params.domainId,
          task.params.sectionType,
          task.params.chatId,
        );
      }

      return { success: true };
    },
  };
}
