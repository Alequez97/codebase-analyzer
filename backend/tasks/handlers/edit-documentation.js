import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitSocketEvent } from "../../utils/socket-emitter.js";

/**
 * Handler for edit-documentation task
 * Defines how AI chat editing works for documentation
 * Only overrides what's different from default
 */
export function editDocumentationHandler(task, taskLogger, agent) {
  return {
    initialMessage: task.params.userMessage,

    // Emit thinking indicator when the AI starts processing
    onProgress: (progress) => {
      if (
        progress.stage === PROGRESS_STAGES.PROCESSING &&
        progress.iteration === 1
      ) {
        taskLogger.info("🤔 AI is thinking...", {
          component: "EditDocumentation",
        });

        emitSocketEvent(SOCKET_EVENTS.CHAT_MESSAGE, {
          chatId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          thinking: true,
          timestamp: new Date().toISOString(),
        });
      }
    },

    // Emit each AI text message as a chat message
    onMessage: (role, content) => {
      if (role === "assistant") {
        taskLogger.info(`📨 Sending AI chat message to client`, {
          component: "EditDocumentation",
          contentLength: content.length,
        });

        emitSocketEvent(SOCKET_EVENTS.CHAT_MESSAGE, {
          chatId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          content,
          timestamp: new Date().toISOString(),
        });
      }
    },

    postProcess: async (result, task, agent, taskLogger) => {
      const outputPath = path.join(config.target.directory, task.outputFile);
      const content = await fs.readFile(outputPath, "utf-8");

      if (!content || content.length < 10) {
        return {
          success: false,
          error: `AI did not write updated documentation to file`,
        };
      }

      emitSocketEvent(SOCKET_EVENTS.DOCUMENTATION_UPDATED, {
        chatId: task.id,
        domainId: task.params?.domainId,
        content,
        isEdit: true,
      });

      taskLogger.info("✅ Updated documentation sent via socket", {
        component: "EditDocumentation",
        contentLength: content.length,
      });

      return { success: true };
    },
  };
}
