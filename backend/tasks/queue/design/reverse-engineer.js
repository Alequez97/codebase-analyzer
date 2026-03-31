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
import {
  getDesignAppManifestRelativePath,
  getDesignBriefRelativePath,
  getDesignSystemManifestRelativePath,
  getDesignVariantRelativePath,
  slugifyDesignId,
} from "./shared.js";
import { DESIGN_TECHNOLOGIES } from "../../../constants/design-technologies.js";

/**
 * Queue a design reverse-engineer task.
 * The agent scans the project's existing source pages, extracts the design
 * language, and produces a standalone React + Vite prototype with mock data.
 *
 * @param {Object} params
 * @param {Array<{name: string, route: string, sourcePaths: string[]}>} params.pages - Pages to reverse-engineer
 * @param {string} [params.designId] - Target design version ID (auto-generated if null)
 * @param {string|null} [params.model] - LLM model override
 * @param {string|null} [params.delegatedByTaskId] - Parent task ID if delegated
 */
export async function queueDesignReverseEngineerTask({
  pages,
  designId = null,
  model = null,
  delegatedByTaskId = null,
}) {
  const agentConfigResult = getAgentConfig(
    TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    model,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const normalizedDesignId = slugifyDesignId(designId || "reverse-engineer");

  const taskId = generateTaskId(TASK_TYPES.DESIGN_REVERSE_ENGINEER);

  const userInstruction = `Reverse-engineer the following pages into a standalone React + Vite prototype:\n${pages.map((p) => `- ${p.name} (${p.route})`).join("\n")}`;

  const task = {
    id: taskId,
    type: TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      pages,
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
