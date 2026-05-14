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
import {
  getDesignAppManifestRelativePath,
  getDesignBriefRelativePath,
  getDesignSystemManifestRelativePath,
  getDesignVariantRelativePath,
  getNextDesignVersion,
  slugifyDesignId,
} from "./shared.js";
import { DESIGN_TECHNOLOGIES } from "../../../constants/design-technologies.js";

/**
 * Queue a design reverse-engineer task.
 * The agent scans the project's existing source pages, extracts the design
 * language, and produces a standalone React + Vite prototype with mock data.
 *
 * @param {Object} params
 * @param {string} params.description - Natural language description of what to reverse-engineer
 * @param {string} [params.designId] - Target design version ID (auto-generated if null)
 * @param {string|null} [params.model] - LLM model override
 * @param {string|null} [params.delegatedByTaskId] - Parent task ID if delegated
 */
export async function queueDesignReverseEngineerTask({
  description,
  designId = null,
  model = null,
  delegatedByTaskId = null,
}) {
  const agentConfigResult = getTaskAgentConfig(
    TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const normalizedDesignId = designId
    ? slugifyDesignId(designId)
    : await getNextDesignVersion();

  const taskId = generateTaskId(TASK_TYPES.DESIGN_REVERSE_ENGINEER);

  const userInstruction = description;

  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      description,
      designId: normalizedDesignId,
      technology: DESIGN_TECHNOLOGIES.REACT_VITE,
      designPath: getDesignVariantRelativePath(normalizedDesignId),
      briefPath: getDesignBriefRelativePath(normalizedDesignId),
      appManifestPath: getDesignAppManifestRelativePath(normalizedDesignId),
      designSystemPath: getDesignSystemManifestRelativePath(normalizedDesignId),
      tokensPath: `${getDesignVariantRelativePath(normalizedDesignId)}/src/styles/tokens.css`,
      userInstruction,
      ...(delegatedByTaskId && { delegatedByTaskId }),
    },
    agentConfig: agentConfigResult.agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.DESIGN_REVERSE_ENGINEER,
    progressFile: getProgressFileRelativePath(taskId),
  };

  await initChatHistory(taskId, {
    taskType: TASK_TYPES.DESIGN_REVERSE_ENGINEER,
  });

  await appendChatMessage(taskId, {
    role: "user",
    content: userInstruction,
  });

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
