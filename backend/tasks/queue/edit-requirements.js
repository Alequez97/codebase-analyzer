import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
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
 * Create a requirements edit task (AI chat)
 *
 * @param {Object} params
 * @param {string} params.domainId
 * @param {string} params.chatId  - Stable session UUID from the frontend
 * @param {string} [params.delegatedByTaskId] - ID of the parent task that delegated this one
 * @returns {Promise<Object>} The created task
 */
export async function queueEditRequirementsTask({
  domainId,
  chatId,
  model = null,
  delegatedByTaskId = null,
}) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.EDIT_REQUIREMENTS, model);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.EDIT_REQUIREMENTS);
  const task = {
    id: taskId,
    type: TASK_TYPES.EDIT_REQUIREMENTS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      sectionType: "requirements",
      chatId,
      ...(delegatedByTaskId && { delegatedByTaskId }),
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.EDIT_REQUIREMENTS,
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
