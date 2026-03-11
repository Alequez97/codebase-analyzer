import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitTaskLog, emitTaskProgress } from "../../utils/socket-emitter.js";
import {
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
    agent.enableCommandTools({ timeoutMs: 60_000 });
    agent.enableDelegationTools(taskId, REVIEW_CHANGES_QUEUE_FUNCTIONS);

    taskLogger.info("🔧 Command + delegation tools enabled", {
      component: "ReviewChanges",
    });
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

    onProgress: (progress) => {
      if (
        progress.stage === PROGRESS_STAGES.PROCESSING &&
        progress.iteration === 1
      ) {
        taskLogger.info("🔍 Reviewing changes…", {
          component: "ReviewChanges",
        });
        emitTaskProgress(
          task,
          PROGRESS_STAGES.PROCESSING,
          "Reviewing changes…",
        );
        return;
      }

      if (
        progress.compacting ||
        progress.stage === PROGRESS_STAGES.COMPACTING
      ) {
        const msg =
          progress.tokensAfterCompaction != null
            ? `Compaction complete. Tokens after: ~${progress.tokensAfterCompaction}`
            : "Compacting context…";
        taskLogger.info(`🗜️  ${msg}`, { component: "ReviewChanges" });
        emitTaskProgress(task, PROGRESS_STAGES.COMPACTING, msg);
        return;
      }

      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`, {
          component: "ReviewChanges",
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

    onToolCall: (toolName, args, result) => {
      emitTaskLog(task, {
        taskId,
        type: task.type,
        stream: "stdout",
        log: `[${toolName}] ${result?.slice?.(0, 200) ?? ""}`,
      });
    },
  };
}
