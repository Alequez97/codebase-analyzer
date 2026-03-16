import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
import { getMarketResearchSummaryOutputPath } from "../../constants/task-output-paths.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

export async function queueMarketResearchSummaryTask({
  sessionId,
  idea,
  dependsOn,
} = {}) {
  if (!sessionId || !idea) {
    return {
      success: false,
      error: "sessionId and idea are required",
    };
  }

  const agentConfigResult = getAgentConfig(TASK_TYPES.MARKET_RESEARCH_SUMMARY);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;
  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_SUMMARY);

  const task = {
    id: taskId,
    type: TASK_TYPES.MARKET_RESEARCH_SUMMARY,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    dependsOn: Array.isArray(dependsOn) ? dependsOn : [],
    params: {
      sessionId,
      idea,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.MARKET_RESEARCH_SUMMARY,
    outputFile: getMarketResearchSummaryOutputPath(sessionId),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  logger.info("Queued market research summary task", {
    component: "MarketResearchSummaryQueue",
    taskId,
    sessionId,
    dependencyCount: task.dependsOn.length,
  });

  return task;
}
