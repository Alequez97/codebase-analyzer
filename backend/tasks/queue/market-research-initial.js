import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
import { getMarketResearchReportOutputPath } from "../../constants/task-output-paths.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Queue a market research initial task.
 * @param {Object} params
 * @param {string} params.sessionId - UUID for this research session (from frontend)
 * @param {string} params.idea - The startup idea text to research
 * @returns {Promise<Object>} The created task, or { success: false, error, code }
 */
export async function queueMarketResearchInitialTask({ sessionId, idea } = {}) {
  if (!sessionId || !idea) {
    return { success: false, error: "sessionId and idea are required" };
  }

  const agentConfigResult = getAgentConfig(TASK_TYPES.MARKET_RESEARCH_INITIAL);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;
  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_INITIAL);

  const task = {
    id: taskId,
    type: TASK_TYPES.MARKET_RESEARCH_INITIAL,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      sessionId,
      idea,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.MARKET_RESEARCH_INITIAL,
    outputFile: getMarketResearchReportOutputPath(sessionId),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  logger.info("Queued market research initial task", {
    component: "MarketResearchInitialQueue",
    taskId,
    sessionId,
  });

  return task;
}
