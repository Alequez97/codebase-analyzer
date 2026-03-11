import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import {
  DOMAIN_SECTION_IDS,
  getDomainSectionContentJsonOutputPath,
} from "../../constants/task-output-paths.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFilePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a domain requirements analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @param {string} params.userContext - Optional user-provided context
 * @param {boolean} params.includeDocumentation - Whether to include documentation in analysis
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeRequirementsTask({
  domainId,
  files,
  userContext = "",
  includeDocumentation = false,
}) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.REQUIREMENTS);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.REQUIREMENTS);
  const task = {
    id: taskId,
    type: TASK_TYPES.REQUIREMENTS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      userContext,
      includeDocumentation: !!includeDocumentation,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.ANALYZE_DOMAIN_REQUIREMENTS,
    outputFile: getDomainSectionContentJsonOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.REQUIREMENTS,
    ),
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
