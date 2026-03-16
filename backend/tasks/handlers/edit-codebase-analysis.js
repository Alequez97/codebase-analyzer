import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import * as logger from "../../utils/logger.js";
import * as codebaseAnalysisPersistence from "../../persistence/codebase-analysis.js";

/**
 * Handler for edit-codebase-analysis task.
 *
 * Updates codebase-analysis.json based on user instructions.
 * Instructions are passed via task.params.requestInstructions.
 */
export function editCodebaseAnalysisHandler(task, taskLogger, _agent) {
  const taskId = task.id;
  const { requestInstructions = null } = task.params || {};

  const initialMessage = requestInstructions
    ? `Update the codebase analysis structure based on these instructions:\n\n${requestInstructions}`
    : "Update the codebase analysis structure as needed.";

  return {
    initialMessage,

    onStart: () => {
      taskLogger.progress("Editing codebase analysis structure...", {
        stage: PROGRESS_STAGES.PROCESSING,
      });
    },

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.progress(progress.message, {
          stage: PROGRESS_STAGES.ANALYZING,
        });
        return;
      }

      if (progress.iteration && progress.iteration > 1) {
        const msg =
          progress.message || `Processing (iteration ${progress.iteration})`;
        taskLogger.progress(msg, { stage: PROGRESS_STAGES.PROCESSING });
      }
    },

    onCompaction: (phase, tokensAfter) => {
      const msg =
        phase === "complete"
          ? `Compaction complete. Tokens after: ~${tokensAfter}`
          : "Compacting context...";
      taskLogger.progress(msg, { stage: PROGRESS_STAGES.COMPACTING });
    },

    onToolCall: (toolName, args, result) => {
      taskLogger.log(`[${toolName}] ${result?.slice?.(0, 200) ?? ""}`);
    },

    onComplete: async () => {
      const updatedAnalysis =
        await codebaseAnalysisPersistence.readCodebaseAnalysis();

      if (!updatedAnalysis) {
        return {
          success: false,
          error: "Failed to read updated codebase analysis",
        };
      }

      logger.info("Codebase analysis structure updated", {
        taskId,
      });

      taskLogger.progress("Codebase analysis structure updated", {
        stage: PROGRESS_STAGES.COMPLETING,
      });

      return { success: true };
    },
  };
}
