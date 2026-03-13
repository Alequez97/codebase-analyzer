import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitTaskLog, emitTaskProgress } from "../../utils/socket-emitter.js";
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

  // Build the initial message from requestInstructions
  const initialMessage = requestInstructions
    ? `Update the codebase analysis structure based on these instructions:\n\n${requestInstructions}`
    : "Update the codebase analysis structure as needed.";

  return {
    initialMessage,

    onStart: () => {
      taskLogger.info("📝 Editing codebase analysis structure…", {
        component: "EditCodebaseAnalysis",
      });
      emitTaskProgress(
        task,
        PROGRESS_STAGES.PROCESSING,
        "Editing codebase analysis structure…",
      );
    },

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`, {
          component: "EditCodebaseAnalysis",
        });
        emitTaskProgress(task, PROGRESS_STAGES.ANALYZING, progress.message);
        return;
      }

      if (progress.iteration && progress.iteration > 1) {
        const msg =
          progress.message || `Processing (iteration ${progress.iteration})`;
        emitTaskProgress(task, PROGRESS_STAGES.PROCESSING, msg);
      }
    },

    onCompaction: (phase, tokensAfter) => {
      const msg =
        phase === "complete"
          ? `Compaction complete. Tokens after: ~${tokensAfter}`
          : "Compacting context…";
      taskLogger.info(`🗜️  ${msg}`, { component: "EditCodebaseAnalysis" });
      emitTaskProgress(task, PROGRESS_STAGES.COMPACTING, msg);
    },

    onToolCall: (toolName, args, result) => {
      emitTaskLog(task, {
        taskId,
        type: task.type,
        stream: "stdout",
        log: `[${toolName}] ${result?.slice?.(0, 200) ?? ""}`,
      });
    },

    onComplete: async () => {
      // Read the updated codebase analysis
      const updatedAnalysis =
        await codebaseAnalysisPersistence.readCodebaseAnalysis();

      if (!updatedAnalysis) {
        return {
          success: false,
          error: "Failed to read updated codebase analysis",
        };
      }

      logger.info("✅ Codebase analysis structure updated", {
        component: "EditCodebaseAnalysis",
        taskId,
      });

      // Emit socket event to notify frontend
      emitTaskProgress(
        task,
        PROGRESS_STAGES.COMPLETED,
        "Codebase analysis structure updated",
      );

      return { success: true };
    },
  };
}
