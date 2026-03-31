/**
 * Handler for design reverse-engineer tasks (orchestrator)
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
import { sanitizeDesignUserFacingText } from "../../../utils/user-facing-sanitizer.js";
import { describeDesignToolCall, getPublicDesignProgress } from "./utils.js";

export function designReverseEngineerHandler(task, taskLogger) {
  return {
    initialMessage: task.params.userInstruction,
    priorMessages: [],

    onStart: () => {
      ensureProgressDirectory(task.id).catch((error) =>
        taskLogger.warn(
          `Failed to prepare progress directory: ${error.message}`,
        ),
      );
      taskLogger.progress("Scanning source files...", {
        stage: PROGRESS_STAGES.PROCESSING,
        publicLogText: "Scanning existing pages...",
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Reverse engineering...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing reverse-engineer context..."
          : "Compacting reverse-engineer conversation...";
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
      taskLogger.progress("Finalizing reverse-engineered design...", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Finalizing reverse-engineered design...",
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
            error: `Reverse-engineer did not produce required file: ${relativePath}`,
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
