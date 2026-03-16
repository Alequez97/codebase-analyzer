import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import { initChatHistory } from "../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  getProgressFileRelativePath,
} from "../../utils/task-progress.js";

export async function queueDesignBrainstormTask({ prompt, history = [], model = null }) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.DESIGN_BRAINSTORM, model);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const taskId = generateTaskId(TASK_TYPES.DESIGN_BRAINSTORM);
  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_BRAINSTORM,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      prompt,
      history,
      userInstruction: prompt,
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.DESIGN_BRAINSTORM,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, { taskType: TASK_TYPES.DESIGN_BRAINSTORM });
  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
