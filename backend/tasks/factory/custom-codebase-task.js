import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import { initChatHistory } from "../../utils/chat-history.js";
import {
  getProgressFilePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a custom codebase task (floating agent chat)
 * @param {Object} params - Task parameters
 * @param {string} params.userInstruction - User's requested operation
 * @param {string} [params.domainId] - Optional current domain context
 * @param {Array} [params.history] - Conversation history
 * @returns {Promise<Object>} The created task
 */
export async function createCustomCodebaseTask({
  userInstruction,
  domainId = null,
  history = [],
  model = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;
  const taskId = generateTaskId(TASK_TYPES.CUSTOM_CODEBASE_TASK);

  const task = {
    id: taskId,
    type: TASK_TYPES.CUSTOM_CODEBASE_TASK,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      userInstruction,
      domainId,
      history,
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.CUSTOM_CODEBASE_TASK,
    // Results streamed via socket - no single output file
    progressFile: getProgressFilePath(taskId),
  };

  // Initialize supporting files
  await initChatHistory(taskId, {
    taskType: TASK_TYPES.CUSTOM_CODEBASE_TASK,
    domainId,
  });

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
