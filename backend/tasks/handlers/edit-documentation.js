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

        // Message 1 = Description, Message 2 = Content
        const isDescription = messageCount === 1;
        const socketEvent = isDescription
          ? SOCKET_EVENTS.EDIT_DOCUMENTATION_DESCRIPTION
          : SOCKET_EVENTS.EDIT_DOCUMENTATION_CONTENT;

        taskLogger.info(
          `📨 Sending AI ${isDescription ? "description" : "content"} to client`,
          {
            component: "EditDocumentation",
            messageNumber: messageCount,
            contentLength: content.length,
          },
        );

        emitSocketEvent(socketEvent, {
          taskId: task.id,
          domainId: task.params.domainId,
          sectionType: task.params.sectionType,
          content,
          timestamp: new Date().toISOString(),
        });
      }
    },

    shouldContinue: (response) => {
      // After first message, prompt for the full updated content
      if (messageCount === 1) {
        taskLogger.info("📝 Requesting full updated content...", {
          component: "EditDocumentation",
        });

        // Add user message to request the full content
        agent.addUserMessage(
          "Now provide the complete updated documentation content in full. Include all sections and details.",
        );

        return true; // Continue to get the second message
      }

      // Stop after 2 messages (description + updated content)
      if (messageCount >= 2) {
        taskLogger.info("✅ Edit complete (2 messages received)", {
          component: "EditDocumentation",
          messagesStreamed: messageCount,
        });
        return false;
      }

      // If AI stops before first message, something went wrong
      if (
        messageCount === 0 &&
        (response.stopReason === "end_turn" ||
          response.stopReason === "stop_sequence" ||
          response.stopReason === "completed")
      ) {
        taskLogger.warn("⚠️  AI stopped before providing response", {
          component: "EditDocumentation",
        });
        return false;
      }

      return true;
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
