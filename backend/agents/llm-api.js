import config from "../config.js";
import * as logger from "../utils/logger.js";

/**
 * Detect if the LLM API agent is available.
 * This is a placeholder until the direct LLM API executor is implemented.
 * @returns {Promise<boolean>}
 */
export async function detect() {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasApiKey) {
    logger.debug("LLM API agent not available (missing ANTHROPIC_API_KEY)", {
      component: "LLM-API",
    });
  }
  return false;
}

/**
 * Execute a task using the LLM API agent.
 * Not implemented yet.
 * @param {Object} task
 * @returns {Promise<Object>}
 */
export async function execute() {
  throw new Error("LLM API agent is not implemented yet");
}
