/**
 * Handler for design page generation tasks (delegated page agent)
 */
import fs from "fs/promises";
import {
  getDesignHtmlOutputPath,
  getDesignCssOutputPath,
  getDesignJsOutputPath,
  getAbsoluteDesignPath,
} from "../../queue/design/shared.js";
import { appendChatMessage } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../../utils/task-progress.js";
import { SOCKET_EVENTS } from "../../../constants/socket-events.js";
import { PROGRESS_STAGES } from "@jet-source/agent-core";
import { emitSocketEvent } from "../../../utils/socket-emitter.js";
import { loadDesignManifest } from "../../../utils/design-manifest.js";
import { DESIGN_TECHNOLOGIES } from "../../../constants/design-technologies.js";
import {
  describeDesignToolCall,
  getPublicDesignProgress,
  getHistoryMessages,
} from "./utils.js";

export function designGeneratePageHandler(task, taskLogger) {
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
        publicLogText: `Generating page: ${task.params?.pageName || "page"}...`,
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Generating page...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing page context..."
          : "Compacting page conversation...";
      taskLogger.progress(message, {
        stage: PROGRESS_STAGES.COMPACTING,
        publicLogText: message,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      // Page generation messages are NOT emitted to chat (internal work only)
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
      taskLogger.progress("Finalizing page...", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Finalizing page...",
      });

      const designId = task.params?.designId;
      const pageId = task.params?.pageId;
      const technology = task.params?.technology;

      // For React Vite, we don't check for specific files here
      // The post-processing task (with dependsOn) will verify the build
      if (technology === DESIGN_TECHNOLOGIES.REACT_VITE) {
        taskLogger.info(
          `React Vite page generation completed for ${pageId}. Skipping file verification - will be handled by post-processing task.`,
        );

        emitSocketEvent(SOCKET_EVENTS.DESIGN_MANIFEST_UPDATED, {
          taskId: task.id,
          manifest: loadDesignManifest(),
          timestamp: new Date().toISOString(),
        });

        await markProgressComplete(task.id).catch(() => {});
        return { success: true };
      }

      // For static HTML, verify the expected files exist
      const expectedPaths = [
        getDesignHtmlOutputPath(designId, pageId),
        getDesignCssOutputPath(designId, pageId),
        getDesignJsOutputPath(designId, pageId),
      ];

      for (const relativePath of expectedPaths) {
        try {
          await fs.access(getAbsoluteDesignPath(relativePath));
        } catch {
          return {
            success: false,
            error: `Design page generation did not produce required file: ${relativePath}`,
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
