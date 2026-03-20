import * as tasksPersistence from "../../../persistence/tasks.js";
import { getAgentConfig } from "../../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId } from "../../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../../utils/task-progress.js";

/**
 * Queue a review-changes task.
 *
 * The agent reads the git diff, identifies which domains are affected, writes
 * delegation request files under .code-analysis/temp/delegation-requests/, and delegates
 * edit-* tasks for each relevant domain section via `delegate_task`.
 *
 * @param {Object} params
 * @param {string} [params.baseBranch] - Branch/commit to diff against. Defaults to agent-determined HEAD behaviour.
 * @param {string[]} [params.domainIds] - Scope review to specific domains. Omit for full-project review.
 * @param {string} [params.model] - Override LLM model.
 * @returns {Promise<Object>} The created task
 */
export async function queueReviewChangesTask({
  baseBranch = null,
  domainIds = null,
  model = null,
} = {}) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.REVIEW_CHANGES, model);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;
  const taskId = generateTaskId(TASK_TYPES.REVIEW_CHANGES);

  const task = {
    id: taskId,
    type: TASK_TYPES.REVIEW_CHANGES,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      ...(baseBranch && { baseBranch }),
      ...(domainIds && { domainIds }),
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.REVIEW_CHANGES,
    // Results flow via delegated tasks — no single output file
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
