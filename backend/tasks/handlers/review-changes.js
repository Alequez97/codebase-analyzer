import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitTaskProgress } from "../../utils/socket-emitter.js";
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

  // Enable delegation tools (git commands are enabled globally in task-handler-builder)
  if (agent) {
    agent.enableDelegationTools(taskId, REVIEW_CHANGES_QUEUE_FUNCTIONS);

    taskLogger.info("🔧 Delegation tools enabled");
  }

  // Build the initial message from task params so the agent knows the scope
  const scopeLines = [];
  if (baseBranch) scopeLines.push(`Compare against branch: ${baseBranch}`);
  if (domainIds?.length)
    scopeLines.push(`Scope review to domains: ${domainIds.join(", ")}`);

  const initialMessage =
    scopeLines.length > 0
      ? `Begin the review as specified in the instructions.\n\n${scopeLines.join("\n")}`
      : "Begin the review as specified in the instructions.";

  return {
    initialMessage,

    onStart: () => {
      taskLogger.info("🔍 Reviewing changes…");
      emitTaskProgress(task, PROGRESS_STAGES.PROCESSING, "Reviewing changes…");
    },

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`);
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
      taskLogger.info(`🗜️  ${msg}`);
      emitTaskProgress(task, PROGRESS_STAGES.COMPACTING, msg);
    },

    onToolCall: (toolName, args, result) => {
      taskLogger.log(`[${toolName}] ${result?.slice?.(0, 200) ?? ""}`);
    },

    // Results flow via delegated tasks — no validation needed
    onComplete: async () => ({ success: true }),
  };
}
