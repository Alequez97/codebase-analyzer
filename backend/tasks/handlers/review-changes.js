import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import {
  queueEditCodebaseAnalysisTask,
  queueEditDocumentationTask,
  queueEditDiagramsTask,
  queueEditRequirementsTask,
  queueEditBugsSecurityTask,
  queueEditRefactoringAndTestingTask,
} from "../queue/index.js";

/**
 * All queue functions available to the delegation executor for review-changes tasks.
 * The orchestrating agent uses delegate_task to hand off to any of these.
 */
const REVIEW_CHANGES_QUEUE_FUNCTIONS = {
  "edit-codebase-analysis": queueEditCodebaseAnalysisTask,
  "edit-documentation": queueEditDocumentationTask,
  "edit-diagrams": queueEditDiagramsTask,
  "edit-requirements": queueEditRequirementsTask,
  "edit-bugs-security": queueEditBugsSecurityTask,
  "edit-refactoring-and-testing": queueEditRefactoringAndTestingTask,
};

/**
 * Handler for review-changes task.
 *
 * Enables command tools (git diff) and delegation tools (edit-* agents).
 * Grants full project read access so the agent can read source files for context.
 * Streams progress via socket while the agent analyses and delegates.
 */
export function reviewChangesHandler(task, taskLogger, agent) {
  const taskId = task.id;
  const { baseBranch = null, domainIds = null } = task.params || {};

  if (agent) {
    agent.enableDelegationTools(taskId, REVIEW_CHANGES_QUEUE_FUNCTIONS);
    taskLogger.info("Delegation tools enabled");
  }

  const scopeLines = [];
  if (baseBranch) scopeLines.push(`Compare against branch: ${baseBranch}`);
  if (domainIds?.length) {
    scopeLines.push(`Scope review to domains: ${domainIds.join(", ")}`);
  }

  const initialMessage =
    scopeLines.length > 0
      ? `Begin the review as specified in the instructions.\n\n${scopeLines.join("\n")}`
      : "Begin the review as specified in the instructions.";

  return {
    initialMessage,

    onStart: () => {
      taskLogger.progress("Reviewing changes...", {
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

    onComplete: async () => ({ success: true }),
  };
}
