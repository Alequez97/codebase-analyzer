import * as llmApi from "./llm-api.js";
import * as aider from "./aider.js";
import config from "../config.js";
import { AGENTS as AGENT_TYPES } from "../constants/agents.js";

/**
 * Available AI agents
 * - llm-api: Direct LLM API calls for generating analysis JSON
 * - aider: AI coding assistant for editing files and writing code
 */
const AGENTS = {
  [AGENT_TYPES.LLM_API]: {
    id: AGENT_TYPES.LLM_API,
    name: "LLM API",
    purpose: "Generates analysis JSON files",
    module: llmApi,
  },
  [AGENT_TYPES.AIDER]: {
    id: AGENT_TYPES.AIDER,
    name: "Aider",
    purpose: "Edits files and writes code",
    installUrl: "https://aider.chat/docs/install.html",
    module: aider,
  },
};

/**
 * Get agent configuration for a specific task type
 * @param {string} taskType - The task type from TASK_TYPES
 * @returns {Object} Agent configuration with agent, model, maxTokens, maxIterations, reasoningEffort
 */
export function getAgentConfig(taskType) {
  const taskConfig = config.tasks[taskType];

  if (!taskConfig) {
    throw new Error(`No configuration found for task type: ${taskType}`);
  }

  return {
    agent: taskConfig.agent,
    model: taskConfig.model,
    maxTokens: taskConfig.maxTokens,
    maxIterations: taskConfig.maxIterations || 30,
    reasoningEffort: taskConfig.reasoningEffort,
  };
}

/**
 * Get available agent based on config and detection
 * @param {string} agentId - The agent ID to retrieve
 * @returns {Promise<Object>} Agent module with detect() and execute() functions
 */
export async function getAgent(agentId) {
  const selectedId = agentId || AGENT_TYPES.LLM_API;
  const agent = AGENTS[selectedId];

  if (!agent) {
    throw new Error(`Unsupported AI agent: ${selectedId}`);
  }

  const available = await agent.module.detect();
  if (!available) {
    throw new Error(`${agent.name} is not available on this machine`);
  }

  return agent.module;
}

/**
 * Detect which agents are available
 * @returns {Promise<Object>} Available agents
 */
export async function detectAvailableAgents() {
  const entries = await Promise.all(
    Object.values(AGENTS).map(async (agent) => [
      agent.id,
      await agent.module.detect(),
    ]),
  );

  return Object.fromEntries(entries);
}

/**
 * Get tools currently supported by backend execution flow
 * @returns {string[]} Supported tool IDs
 */
export function getSupportedAgents() {
  return Object.values(AGENTS).map(({ module, ...agent }) => agent);
}
