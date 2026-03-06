import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitSocketEvent } from "../../utils/socket-emitter.js";

/**
 * Handler for edit-documentation task
 * Defines how AI chat editing works for documentation
 * Only overrides what's different from default
 */
export function editDocumentationHandler(task, taskLogger, agent) {
  let messageCount = 0;

  return {
    initialMessage: task.params.userMessage,

    // Emit thinking status when starting
    onProgress: (progress) => {
      if (
        progress.stage === PROGRESS_STAGES.PROCESSING &&
        progress.iteration === 1
      ) {
        taskLogger.info("🤔 AI is thinking...", {
          component: "EditDocumentation",
        });

        emitSocketEvent(SOCKET_EVENTS.EDIT_DOCUMENTATION_THINKING, {
          taskId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          thinking: true,
          timestamp: new Date().toISOString(),
        });
      }
    },

    // Stream each AI message to the client via socket
    onMessage: (role, content) => {
      if (role === "assistant") {
        messageCount++;

        taskLogger.info(`📨 Sending AI response to client`, {
          component: "EditDocumentation",
          messageNumber: messageCount,
          contentLength: content.length,
        });

        emitSocketEvent(SOCKET_EVENTS.EDIT_DOCUMENTATION_CONTENT, {
          taskId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          content,
          timestamp: new Date().toISOString(),
        });
      }
    },

    postProcess: async (result, task, agent, taskLogger) => {
      const metadata = agent.getMetadata();
      taskLogger.info(`✅ Streamed ${messageCount} messages to client`, {
        component: "EditDocumentation",
        messagesStreamed: messageCount,
      });

      return {
        metadata,
        messagesStreamed: messageCount,
      };
    },
  };
}
