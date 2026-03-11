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
 *
 * Conversation history and the user message are persisted separately in the
 * per-session chat history file (domain-{domainId}-documentation-{taskId}.json)
 * and are loaded at execution time.  Task params intentionally contain only
 * the minimal routing data needed to identify the task — NOT the chat content.
 *
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @returns {Promise<Object>} The created task
 */
export async function createEditDocumentationTask({
  domainId,
  chatId,
  model = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.EDIT_DOCUMENTATION,
    model,
  );
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
      sectionType: "documentation",
      // chatId is the stable session ID supplied by the frontend.
      // It identifies the chat history file and the socket channel.
      // It is NOT the taskId — a new task is created for every user message.
      chatId,
    },
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.EDIT_DOCUMENTATION,
    outputFile: getDomainSectionContentMarkdownOutputPath(
      domainId,
      DOMAIN_SECTION_IDS.DOCUMENTATION,
    ),
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
