import config from "../../../config.js";
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
import * as logger from "../../../utils/logger.js";

/**
 * Create a full codebase analysis task
 * @returns {Promise<Object>} The created task
 */
export async function queueCodebaseAnalysisTask() {
  const agentConfigResult = getTaskAgentConfig(TASK_TYPES.CODEBASE_ANALYSIS);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.CODEBASE_ANALYSIS);
  const task = {
    id: taskId,
    type: TASK_TYPES.CODEBASE_ANALYSIS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.ANALYZE_FULL_CODEBASE,
    outputFile: getCodebaseAnalysisOutputPath(),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
