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
import { getDesignBriefRelativePath, getNextDesignVersion } from "./shared.js";

export async function queueDesignBrainstormTask({
  prompt,
  history = [],
  model = null,
  designId = null,
}) {
  const agentConfigResult = getTaskAgentConfig(TASK_TYPES.DESIGN_BRAINSTORM, model);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  // Determine design version: use provided designId or auto-generate next version
  const targetDesignId = designId || (await getNextDesignVersion());

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
      designId: targetDesignId,
      briefPath: getDesignBriefRelativePath(targetDesignId),
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.DESIGN_BRAINSTORM,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, { taskType: TASK_TYPES.DESIGN_BRAINSTORM });

  // Store the user's initial message
  await appendChatMessage(taskId, {
    role: "user",
    content: prompt.trim(),
  });

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
