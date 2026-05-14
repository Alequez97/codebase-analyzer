import { randomBytes } from "crypto";
import config from "../config.js";
import { AGENT_ERROR_CODES } from "@jet-source/llm-core";

/**
 * Generate a unique task ID
 * @param {string} prefix - Prefix for the task ID
 * @returns {string} Unique task ID
 */
export function generateTaskId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const random = randomBytes(3).toString("hex");
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Get the agent configuration for a given task type.
 * @param {string} taskType - The task type from TASK_TYPES
 * @param {string|null} [modelOverride] - Optional model ID to override the configured default
 * @returns {{success: boolean, agentConfig?: Object, error?: string, code?: string}}
 */
export function getTaskAgentConfig(taskType, modelOverride = null) {
  const taskConfig = config.tasks[taskType];

  if (!taskConfig) {
    return {
      success: false,
      code: AGENT_ERROR_CODES.TASK_CONFIG_MISSING,
      error: `No configuration found for task type: ${taskType}`,
    };
  }

  return {
    success: true,
    agentConfig: {
      model: modelOverride || taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations || 30,
      reasoningEffort: taskConfig.reasoningEffort,
    },
  };
}
