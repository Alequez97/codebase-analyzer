import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a domain testing analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @param {boolean} params.includeRequirements - Whether to include requirements in analysis
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeTestingTask(
  { domainId, files, includeRequirements = false },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.TESTING);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  const task = {
    id: generateTaskId("analyze-testing"),
    type: TASK_TYPES.TESTING,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      includeRequirements: !!includeRequirements,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-domain-testing.md",
    outputFile: `.code-analysis/domains/${domainId}/testing/content.json`,
    generateMetadata: true,
    metadataFile: `.code-analysis/domains/${domainId}/testing/metadata.json`,
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
