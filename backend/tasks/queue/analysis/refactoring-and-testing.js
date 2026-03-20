import config from "../../../config.js";
import * as tasksPersistence from "../../../persistence/tasks.js";
import { getAgentConfig } from "../../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import {
  DOMAIN_SECTION_IDS,
  getDomainSectionContentJsonOutputPath,
} from "../../../constants/task-output-paths.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId } from "../../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../../utils/task-progress.js";
import * as logger from "../../../utils/logger.js";

/**
 * Create a domain testing analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @param {boolean} params.includeRequirements - Whether to include requirements in analysis
 * @returns {Promise<Object>} The created task
 */
export async function queueAnalyzeRefactoringAndTestingTask({
  domainId,
  files,
  includeRequirements = false,
}) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.REFACTORING_AND_TESTING);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.REFACTORING_AND_TESTING);
  const task = {
    id: taskId,
    type: TASK_TYPES.REFACTORING_AND_TESTING,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      includeRequirements: !!includeRequirements,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile:
      SYSTEM_INSTRUCTION_PATHS.ANALYZE_DOMAIN_REFACTORING_AND_TESTING,
    outputFile: getDomainSectionContentJsonOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.REFACTORING_AND_TESTING,
    ),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
