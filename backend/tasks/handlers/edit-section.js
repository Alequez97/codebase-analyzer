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
 * Generic handler factory for all edit-section tasks (diagrams, requirements,
 * bugs-security, refactoring-and-testing).
 *
 * Behaviour mirrors editDocumentationHandler but is parameterised so each
 * section can specify its own component name, content-updated socket event,
 * and output validation strategy.
 *
 * @param {Object}   task
 * @param {Object}   taskLogger
 * @param {Object}   agent
 * @param {Object}   chatContext
 * @param {string}   chatContext.initialMessage     - Current user message
 * @param {Array}    chatContext.priorMessages       - Prior turns for multi-turn context
 * @param {Object}   options
 * @param {string}   options.componentName          - Log component label
 * @param {string}   options.contentUpdatedEvent    - SOCKET_EVENTS key to emit on completion
 * @param {boolean}  options.isJsonOutput           - true → validate as JSON; false → check length
 * @param {string}   options.sectionLabel           - Human-readable section name for error messages
 */
export function createEditSectionHandler(
  task,
  taskLogger,
  agent,
  { initialMessage, priorMessages = [] } = {},
  {
    componentName,
    contentUpdatedEvent,
    isJsonOutput = true,
    sectionLabel,
  } = {},
) {
  return {
    initialMessage,
    priorMessages,

    onProgress: (progress) => {
      if (
        progress.stage === PROGRESS_STAGES.PROCESSING &&
        progress.iteration === 1
      ) {
        taskLogger.info("🤔 AI is thinking...", { component: componentName });

        emitSocketEvent(SOCKET_EVENTS.CHAT_MESSAGE, {
          chatId: task.params.chatId,
          taskId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          thinking: true,
          timestamp: new Date().toISOString(),
        });
      }
    },

    onMessage: (role, content) => {
      if (role === "assistant") {
        taskLogger.info(`📨 Sending AI chat message to client`, {
          component: componentName,
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

        appendDomainSectionChatMessage(
          task.params.domainId,
          task.params.sectionType,
          { role: "assistant", content, chatId: task.params.chatId },
        ).catch((err) => {
          taskLogger.warn(`Failed to persist assistant message`, {
            component: componentName,
            error: err.message,
          });
        });
      }
    },

    postProcess: async (result, task, agent, taskLogger) => {
      const outputPath = path.join(config.target.directory, task.outputFile);
      let raw;
      try {
        raw = await fs.readFile(outputPath, "utf-8");
      } catch {
        return {
          success: false,
          error: `AI did not write updated ${sectionLabel} to file`,
        };
      }

      if (!raw || raw.trim().length < 10) {
        return {
          success: false,
          error: `AI did not write updated ${sectionLabel} to file`,
        };
      }

      let parsedContent = null;
      if (isJsonOutput) {
        try {
          parsedContent = JSON.parse(raw);
        } catch {
          return {
            success: false,
            error: `AI wrote invalid JSON for ${sectionLabel}`,
          };
        }
      }

      emitSocketEvent(contentUpdatedEvent, {
        chatId: task.params.chatId,
        taskId: task.id,
        domainId: task.params?.domainId,
        content: isJsonOutput ? parsedContent : raw,
        isEdit: true,
      });

      taskLogger.info(`✅ Updated ${sectionLabel} sent via socket`, {
        component: componentName,
        contentLength: raw.length,
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
