import * as tasksPersistence from "../../../persistence/tasks.js";
import { getAgentConfig } from "../../executors/index.js";
import { getDesignPageSystemInstructionPath } from "../../../constants/design-system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { DESIGN_TECHNOLOGIES } from "../../../constants/design-technologies.js";
import { generateTaskId } from "../../utils.js";
import { initChatHistory } from "../../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  getProgressFileRelativePath,
} from "../../../utils/task-progress.js";
import {
  getDesignAppManifestRelativePath,
  getDesignCssOutputPath,
  getDesignHtmlOutputPath,
  getDesignJsOutputPath,
  getDesignSystemManifestRelativePath,
  getDesignTokensOutputPath,
  slugifyDesignId,
  slugifyDesignPageId,
} from "./shared.js";

export async function queueDesignGeneratePageTask({
  designId,
  pageId,
  pageName,
  route = "",
  designBriefing,
  technology = DESIGN_TECHNOLOGIES.STATIC_HTML,
  model = null,
  delegatedByTaskId = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.DESIGN_GENERATE_PAGE,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const normalizedDesignId = slugifyDesignId(designId);
  const normalizedPageId = slugifyDesignPageId(pageId || pageName);

  const taskId = generateTaskId(TASK_TYPES.DESIGN_GENERATE_PAGE);
  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_GENERATE_PAGE,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      designId: normalizedDesignId,
      pageId: normalizedPageId,
      pageName: pageName || normalizedPageId,
      route,
      designBriefing: designBriefing || "",
      technology,
      appManifestPath: getDesignAppManifestRelativePath(normalizedDesignId),
      designSystemPath: getDesignSystemManifestRelativePath(normalizedDesignId),
      tokensPath: getDesignTokensOutputPath(normalizedDesignId),
      htmlOutputPath: getDesignHtmlOutputPath(
        normalizedDesignId,
        normalizedPageId,
      ),
      cssOutputPath: getDesignCssOutputPath(
        normalizedDesignId,
        normalizedPageId,
      ),
      jsOutputPath: getDesignJsOutputPath(normalizedDesignId, normalizedPageId),
      userInstruction: designBriefing || pageName || normalizedPageId,
      delegatedByTaskId,
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: getDesignPageSystemInstructionPath(technology),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, { taskType: TASK_TYPES.DESIGN_GENERATE_PAGE });
  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
