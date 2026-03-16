import fs from "fs/promises";
import {
  getDesignBriefRelativePath,
  getDesignCssOutputPath,
  getDesignHtmlOutputPath,
  getDesignJsOutputPath,
  getAbsoluteDesignPath,
} from "../queue/design-shared.js";
import { appendChatMessage } from "../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../utils/task-progress.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { TASK_TYPES } from "../../constants/task-types.js";

export function designTaskHandler(task, taskLogger) {
  return {
    initialMessage: task.params.userInstruction,

    onStart: () => {
      ensureProgressDirectory(task.id).catch((error) =>
        taskLogger.warn(`Failed to prepare progress directory: ${error.message}`),
      );
      taskLogger.progress("Thinking...", { stage: PROGRESS_STAGES.PROCESSING });
    },

    onProgress: (progress) => {
      const message = progress.message || "Working on design task";
      taskLogger.progress(message, {
        stage: progress.stage || PROGRESS_STAGES.PROCESSING,
      });
    },

    onCompaction: (_phase, tokensAfter) => {
      taskLogger.progress(`Compaction complete. Tokens after: ~${tokensAfter}`, {
        stage: PROGRESS_STAGES.COMPACTING,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      await appendChatMessage(task.id, { role, content }).catch((error) =>
        taskLogger.warn(`Failed to save design chat message: ${error.message}`),
      );
    },

    onToolCall: (toolName, args) => {
      const filePath = args?.path || args?.file_path || null;
      if (filePath) {
        taskLogger.info(`Tool ${toolName} touched ${filePath}`);
      }
    },

    onComplete: async () => {
      if (task.type === TASK_TYPES.DESIGN_GENERATE) {
        const designId = task.params?.designId;
        const expectedPaths = [
          getDesignBriefRelativePath(designId),
          getDesignHtmlOutputPath(designId),
          getDesignCssOutputPath(designId),
          getDesignJsOutputPath(designId),
        ];

        for (const relativePath of expectedPaths) {
          try {
            await fs.access(getAbsoluteDesignPath(relativePath));
          } catch {
            return {
              success: false,
              error: `Design generation did not produce required file: ${relativePath}`,
            };
          }
        }
      }

      await markProgressComplete(task.id).catch(() => {});
      return { success: true };
    },
  };
}
