import * as tasksPersistence from "../../../persistence/tasks.js";
import { getAgentConfig } from "../../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId } from "../../utils.js";
import { initChatHistory } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  getProgressFileRelativePath,
} from "../../../utils/task-progress.js";
import {
  getDesignAppManifestRelativePath,
  getDesignBriefRelativePath,
  getDesignSystemManifestRelativePath,
  getDesignTokensOutputPath,
  getDesignVariantRelativePath,
  slugifyDesignId,
} from "./shared.js";

export async function queueDesignPlanAndStyleSystemGenerateTask({
  prompt,
  brief,
  history = [],
  designId = null,
  model = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const normalizedDesignId = slugifyDesignId(designId || prompt);
  const taskId = generateTaskId(
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  );
  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      prompt,
      brief,
      history,
      designId: normalizedDesignId,
      designPath: getDesignVariantRelativePath(normalizedDesignId),
      briefPath: getDesignBriefRelativePath(normalizedDesignId),
      appManifestPath: getDesignAppManifestRelativePath(normalizedDesignId),
      designSystemPath: getDesignSystemManifestRelativePath(normalizedDesignId),
      tokensPath: getDesignTokensOutputPath(normalizedDesignId),
      userInstruction: brief || prompt,
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile:
      SYSTEM_INSTRUCTION_PATHS.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, {
    taskType: TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  });
  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
