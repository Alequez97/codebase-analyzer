import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a documentation edit task (AI chat)
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string} params.userMessage - User's message/request
 * @param {string} params.currentContent - Current documentation content
 * @param {Array} params.history - Conversation history
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createEditDocumentationTask(
  { domainId, userMessage, currentContent, history },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.EDIT_DOCUMENTATION);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const task = {
    id: generateTaskId(TASK_TYPES.EDIT_DOCUMENTATION),
    type: TASK_TYPES.EDIT_DOCUMENTATION,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      userMessage,
      currentContent,
      history,
      sectionType: "documentation",
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.EDIT_DOMAIN_SECTION,
    generateMetadata: true,
    // No output file - results are streamed via socket
  };

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
