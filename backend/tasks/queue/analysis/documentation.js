import config from "../../../config.js";
import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import {
  DOMAIN_SECTION_IDS,
  getDomainSectionContentMarkdownOutputPath,
} from "../../../persistence/task-output-paths.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId, getTaskAgentConfig } from "../../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../../utils/task-progress.js";
import * as logger from "../../../utils/logger.js";

/**
 * Create a domain documentation analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @returns {Promise<Object>} The created task
 */
export async function queueAnalyzeDocumentationTask({ domainId, files }) {
  const agentConfigResult = getTaskAgentConfig(TASK_TYPES.DOCUMENTATION);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.DOCUMENTATION);
  const task = {
    id: taskId,
    type: TASK_TYPES.DOCUMENTATION,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile:
      SYSTEM_INSTRUCTION_PATHS.ANALYZE_DOMAIN_DOCUMENTATION,
    outputFile: getDomainSectionContentMarkdownOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.DOCUMENTATION,
    ),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
