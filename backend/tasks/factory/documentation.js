import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a domain documentation analysis task
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {string[]} params.files - Files in the domain
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeDocumentationTask(
  { domainId, files },
  { executeNow = false } = {},
) {
  const agentConfig = getAgentConfig(TASK_TYPES.DOCUMENTATION);

  const task = {
    id: generateTaskId("analyze-documentation"),
    type: TASK_TYPES.DOCUMENTATION,
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-domain-documentation.md",
    outputFile: `.code-analysis/domains/${domainId}/documentation/content.md`,
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
