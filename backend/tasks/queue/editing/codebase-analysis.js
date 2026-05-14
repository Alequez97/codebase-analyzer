import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { getCodebaseAnalysisOutputPath } from "../../../persistence/task-output-paths.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId, getTaskAgentConfig } from "../../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../../utils/task-progress.js";

/**
 * Create a codebase analysis edit task (AI chat)
 *
 * Used by review-changes agent to update codebase-analysis.json when:
 * - Files are added or removed
 * - Domains are added or removed
 * - File-to-domain mappings change
 *
 * @param {Object} params - Task parameters
 * @param {string} [params.delegatedByTaskId] - ID of the parent task that delegated this one
 * @param {string} [params.requestInstructions] - Additional instructions passed from delegating task
 * @returns {Promise<Object>} The created task
 */
export async function queueEditCodebaseAnalysisTask({
  model = null,
  delegatedByTaskId = null,
  requestInstructions = null,
}) {
  const agentConfigResult = getTaskAgentConfig(
    TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.EDIT_CODEBASE_ANALYSIS);
  const task = {
    id: taskId,
    type: TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      ...(delegatedByTaskId && { delegatedByTaskId }),
      ...(requestInstructions && { requestInstructions }),
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.EDIT_CODEBASE_ANALYSIS,
    outputFile: getCodebaseAnalysisOutputPath(),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
