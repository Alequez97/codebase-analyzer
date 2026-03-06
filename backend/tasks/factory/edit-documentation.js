import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import {
  DOMAIN_SECTION_IDS,
  getDomainSectionContentMarkdownOutputPath,
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
 * Create a documentation edit task (AI chat)
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string} params.userMessage - User's message/request
 * @param {Array} params.history - Conversation history
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createEditDocumentationTask(
  { domainId, userMessage, history },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.EDIT_DOCUMENTATION);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const taskId = generateTaskId(TASK_TYPES.EDIT_DOCUMENTATION);
  const task = {
    id: taskId,
    type: TASK_TYPES.EDIT_DOCUMENTATION,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      userMessage,
      history,
      sectionType: "documentation",
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.EDIT_DOMAIN_SECTION,
    outputFile: getDomainSectionContentMarkdownOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.DOCUMENTATION,
    ),
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Import dynamically to avoid circular dependency
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
