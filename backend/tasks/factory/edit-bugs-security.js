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
 * Create a bugs & security edit task (AI chat)
 *
 * @param {Object} params
 * @param {string} params.domainId
 * @param {string} params.chatId  - Stable session UUID from the frontend
 * @param {Object} options
 * @param {boolean} options.executeNow
 * @returns {Promise<Object>} The created task
 */
export async function createEditBugsSecurityTask(
  { domainId, chatId, model = null },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.EDIT_BUGS_SECURITY,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.EDIT_BUGS_SECURITY);
  const task = {
    id: taskId,
    type: TASK_TYPES.EDIT_BUGS_SECURITY,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      sectionType: "bugs-security",
      chatId,
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.EDIT_BUGS_SECURITY,
    outputFile: getDomainSectionContentJsonOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.BUGS_SECURITY,
    ),
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.writeTask(task);

  if (executeNow) {
    const { executeTask } = await import("../../orchestrators/task.js");
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskFactory",
      });
    });
  }

  return task;
}
