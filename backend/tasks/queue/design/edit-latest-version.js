import * as tasksPersistence from "../../../persistence/tasks.js";
import { getAgentConfig } from "../../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId } from "../../utils.js";
import {
  initChatHistory,
  appendChatMessage,
} from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  getProgressFileRelativePath,
} from "../../../utils/task-progress.js";

export async function queueDesignEditLatestVersionTask({
  prompt,
  history = [],
  model = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.EDIT_DESIGN_LATEST,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const taskId = generateTaskId(TASK_TYPES.EDIT_DESIGN_LATEST);
  const task = {
    id: taskId,
    type: TASK_TYPES.EDIT_DESIGN_LATEST,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      prompt,
      history,
      userInstruction: prompt,
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.EDIT_DESIGN_LATEST,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, { taskType: TASK_TYPES.EDIT_DESIGN_LATEST });

  // Store the user's initial message
  await appendChatMessage(taskId, {
    role: "user",
    content: prompt.trim(),
  });

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
