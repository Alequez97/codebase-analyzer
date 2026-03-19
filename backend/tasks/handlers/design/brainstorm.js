/**
 * Handler for design brainstorm tasks
 */
import { appendChatMessage } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../../utils/task-progress.js";
import { SOCKET_EVENTS } from "../../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../../constants/progress-stages.js";
import { emitSocketEvent } from "../../../utils/socket-emitter.js";
import {
  describeDesignToolCall,
  getPublicDesignProgress,
  getHistoryMessages,
} from "./utils.js";

export function designBrainstormHandler(task, taskLogger) {
  return {
    initialMessage: task.params.userInstruction,
    priorMessages: getHistoryMessages(task.params?.history),

    onStart: () => {
      ensureProgressDirectory(task.id).catch((error) =>
        taskLogger.warn(
          `Failed to prepare progress directory: ${error.message}`,
        ),
      );
      taskLogger.progress("Thinking...", {
        stage: PROGRESS_STAGES.PROCESSING,
        publicLogText: "Brainstorming design ideas...",
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Brainstorming...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing brainstorm context..."
          : "Compacting brainstorm conversation...";
      taskLogger.progress(message, {
        stage: PROGRESS_STAGES.COMPACTING,
        publicLogText: message,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      // Emit brainstorm messages to chat
      emitSocketEvent(SOCKET_EVENTS.DESIGN_CHAT_MESSAGE, {
        taskId: task.id,
        role,
        content,
        timestamp: new Date().toISOString(),
      });

      await appendChatMessage(task.id, { role, content }).catch((error) =>
        taskLogger.warn(`Failed to save chat message: ${error.message}`),
      );
    },

    onToolCall: (toolName, args) => {
      const { stage, message } = describeDesignToolCall(toolName);
      taskLogger.info(`Tool ${toolName} invoked`, {
        filePath: args?.path || args?.file_path || null,
      });
      taskLogger.progress(message, {
        stage,
        publicLogText: message,
      });
    },

    onComplete: async () => {
      taskLogger.progress("Brainstorming complete", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Brainstorming complete",
      });

      await markProgressComplete(task.id).catch(() => {});
      return { success: true };
    },
  };
}
