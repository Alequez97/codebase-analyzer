import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a full codebase analysis task
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createFullCodebaseAnalysisTask({
  executeNow = false,
} = {}) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.CODEBASE_ANALYSIS);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const task = {
    id: generateTaskId("analyze-codebase"),
    type: TASK_TYPES.CODEBASE_ANALYSIS,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-full-codebase.md",
    outputFile: ".code-analysis/analysis/codebase-analysis.json",
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Import dynamically to avoid circular dependency
    const { executeTask } = await import("../../orchestrators/task.js");
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskFactory",
      });
    });
  }

  return task;
}
