import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../executors/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
import { getMarketResearchCompetitorOutputPath } from "../../constants/task-output-paths.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Queue a market research competitor sub-task.
 * Spawned by the market-research-initial agent via delegate_task.
 *
 * @param {Object} params
 * @param {string} params.sessionId - UUID for this research session
 * @param {string} params.competitorId - kebab-case identifier (e.g. "stripe", "paypal")
 * @param {string} params.competitorName - Full display name (e.g. "Stripe")
 * @param {string} params.competitorUrl - Website URL (e.g. "stripe.com")
 * @param {string} [params.competitorDescription] - Brief description of what they do
 * @param {string} [params.delegatedByTaskId] - ID of the master task that spawned this
 * @returns {Promise<Object>} The created task, or { success: false, error, code }
 */
export async function queueMarketResearchCompetitorTask({
  sessionId,
  competitorId,
  competitorName,
  competitorUrl,
  competitorDescription,
  competitorBriefing,
  delegatedByTaskId = null,
} = {}) {
  if (!sessionId || !competitorId || !competitorName || !competitorUrl) {
    return {
      success: false,
      error:
        "sessionId, competitorId, competitorName, and competitorUrl are required",
    };
  }

  const agentConfigResult = getAgentConfig(
    TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
  );
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;
  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_COMPETITOR);

  const task = {
    id: taskId,
    type: TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      sessionId,
      competitorId,
      competitorName,
      competitorUrl,
      competitorDescription: competitorDescription || "",
      ...(competitorBriefing && { competitorBriefing }),
      targetDirectory: config.target.directory,
      ...(delegatedByTaskId && { delegatedByTaskId }),
    },
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.MARKET_RESEARCH_COMPETITOR,
    outputFile: getMarketResearchCompetitorOutputPath(sessionId, competitorId),
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  logger.info("Queued market research competitor task", {
    component: "MarketResearchCompetitorQueue",
    taskId,
    sessionId,
    competitorId,
    delegatedByTaskId,
  });

  return task;
}
