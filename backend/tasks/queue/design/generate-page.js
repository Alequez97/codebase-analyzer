import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { getDesignPageSystemInstructionPath } from "../../../utils/design-system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { DESIGN_TECHNOLOGIES } from "../../../constants/design-technologies.js";
import { generateTaskId, getTaskAgentConfig } from "../../utils.js";
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
  getDesignVariantRelativePath,
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
  outputPath = null, // For React Vite: e.g., "src/features/auth/pages/LoginPage"
}) {
  const agentConfigResult = getTaskAgentConfig(
    TASK_TYPES.DESIGN_GENERATE_PAGE,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const normalizedDesignId = slugifyDesignId(designId);
  const normalizedPageId = slugifyDesignPageId(pageId || pageName);

  const taskId = generateTaskId(TASK_TYPES.DESIGN_GENERATE_PAGE);

  // Build output path for React Vite if not provided
  let finalOutputPath = outputPath;
  if (technology === DESIGN_TECHNOLOGIES.REACT_VITE && !finalOutputPath) {
    // Default to src/pages/<PageName>/ if no output path specified
    finalOutputPath = `src/pages/${normalizedPageId.charAt(0).toUpperCase() + normalizedPageId.slice(1)}/`;
  }

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
      // For static HTML
      htmlOutputPath: getDesignHtmlOutputPath(
        normalizedDesignId,
        normalizedPageId,
      ),
      cssOutputPath: getDesignCssOutputPath(
        normalizedDesignId,
        normalizedPageId,
      ),
      jsOutputPath: getDesignJsOutputPath(normalizedDesignId, normalizedPageId),
      // For React Vite
      outputPath: finalOutputPath,
      designRootPath: getDesignVariantRelativePath(normalizedDesignId),
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
