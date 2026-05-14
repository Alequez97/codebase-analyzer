import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId, getTaskAgentConfig } from "../../utils.js";
import {
  initChatHistory,
  appendChatMessage,
} from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  getProgressFileRelativePath,
} from "../../../utils/task-progress.js";

export async function queueDesignAssistantTask({
  prompt,
  history = [],
  model = null,
}) {
  const agentConfigResult = getTaskAgentConfig(
    TASK_TYPES.DESIGN_ASSISTANT,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const taskId = generateTaskId(TASK_TYPES.DESIGN_ASSISTANT);
  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_ASSISTANT,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      prompt,
      history,
      userInstruction: prompt,
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.DESIGN_ASSISTANT,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, { taskType: TASK_TYPES.DESIGN_ASSISTANT });

  // Store the user's initial message
  await appendChatMessage(taskId, {
    role: "user",
    content: prompt.trim(),
  });

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}

