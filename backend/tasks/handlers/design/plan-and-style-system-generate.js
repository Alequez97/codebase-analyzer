/**
 * Handler for design plan and style system generation tasks (orchestrator)
 */
import fs from "fs/promises";
import {
  getDesignAppManifestRelativePath,
  getDesignBriefRelativePath,
  getDesignSystemManifestRelativePath,
  getAbsoluteDesignPath,
} from "../../queue/design/shared.js";
import { appendChatMessage } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../../utils/task-progress.js";
import { SOCKET_EVENTS } from "../../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../../constants/progress-stages.js";
import { emitSocketEvent } from "../../../utils/socket-emitter.js";
import { loadDesignManifest } from "../../../utils/design-manifest.js";
import {
  describeDesignToolCall,
  getPublicDesignProgress,
  getHistoryMessages,
} from "./utils.js";

export function designPlanAndStyleSystemGenerateHandler(task, taskLogger) {
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
        publicLogText: "Planning design system and pages...",
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Planning design...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing design context..."
          : "Compacting design conversation...";
      taskLogger.progress(message, {
        stage: PROGRESS_STAGES.COMPACTING,
        publicLogText: message,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      // Emit orchestrator messages to chat
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
      taskLogger.progress("Finalizing design system...", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Finalizing design system...",
      });

      const designId = task.params?.designId;
      const expectedPaths = [
        getDesignBriefRelativePath(designId),
        getDesignAppManifestRelativePath(designId),
        getDesignSystemManifestRelativePath(designId),
        task.params?.tokensPath,
      ];

      for (const relativePath of expectedPaths.filter(Boolean)) {
        try {
          await fs.access(getAbsoluteDesignPath(relativePath));
        } catch {
          return {
            success: false,
            error: `Design orchestration did not produce required file: ${relativePath}`,
          };
        }
      }

      emitSocketEvent(SOCKET_EVENTS.DESIGN_MANIFEST_UPDATED, {
        taskId: task.id,
        manifest: loadDesignManifest(),
        timestamp: new Date().toISOString(),
      });

      await markProgressComplete(task.id).catch(() => {});
      return { success: true };
    },
  };
}
