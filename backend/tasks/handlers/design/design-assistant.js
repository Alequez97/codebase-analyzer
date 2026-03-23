/**
 * Handler for design assistant tasks
 */
import { appendChatMessage } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../../utils/task-progress.js";
import { SOCKET_EVENTS } from "../../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../../constants/progress-stages.js";
import { emitSocketEvent } from "../../../utils/socket-emitter.js";
import { sanitizeDesignUserFacingText } from "../../../utils/user-facing-sanitizer.js";
import {
  describeDesignToolCall,
  getPublicDesignProgress,
  getHistoryMessages,
} from "./utils.js";

export function designAssistantHandler(task, taskLogger) {
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
        publicLogText: "Analyzing design request...",
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Working on design...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing design assistant context..."
          : "Compacting design assistant conversation...";
      taskLogger.progress(message, {
        stage: PROGRESS_STAGES.COMPACTING,
        publicLogText: message,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      const userFacingContent = sanitizeDesignUserFacingText(content);

      // Emit AI message to chat UI (generic event, routed by taskType on frontend)
      emitSocketEvent(SOCKET_EVENTS.TASK_MESSAGE, {
        taskId: task.id,
        taskType: task.type,
        role,
        content: userFacingContent,
        timestamp: new Date().toISOString(),
      });

      await appendChatMessage(task.id, {
        role,
        content: userFacingContent,
      }).catch((error) =>
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
      taskLogger.progress("Design task complete", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Design task complete",
      });

      await markProgressComplete(task.id).catch(() => {});

      emitSocketEvent(SOCKET_EVENTS.DESIGN_EDIT_COMPLETE, {
        taskId: task.id,
        designId: task.params?.designId ?? null,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    },
  };
}

