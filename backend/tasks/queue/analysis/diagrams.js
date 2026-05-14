import config from "../../../config.js";
import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import {
  DOMAIN_SECTION_IDS,
  getDomainSectionMetadataOutputPath,
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
 * Create a domain diagrams analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @param {boolean} params.includeDocumentation - Whether to include documentation in analysis
 * @returns {Promise<Object>} The created task
 */
export async function queueAnalyzeDiagramsTask({
  domainId,
  files,
  includeDocumentation = true,
}) {
  const agentConfigResult = getTaskAgentConfig(TASK_TYPES.DIAGRAMS);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.DIAGRAMS);
  const task = {
    id: taskId,
    type: TASK_TYPES.DIAGRAMS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      includeDocumentation: !!includeDocumentation,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.ANALYZE_DOMAIN_DIAGRAMS,
    outputFile: getDomainSectionMetadataOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.DIAGRAMS,
    ),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
