import * as llmApi from "./llm-api.js";
import * as aider from "./aider.js";
import config from "../config.js";
import { AGENT_ERROR_CODES } from "../constants/agent-error-codes.js";
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
    agent: llmApi,
  },
  [AGENT_TYPES.AIDER]: {
    id: AGENT_TYPES.AIDER,
    name: "Aider",
    purpose: "Edits files and writes code",
    installUrl: "https://aider.chat/docs/install.html",
    agent: aider,
  },
};

/**
 * Get agent configuration for a specific task type
 * @param {string} taskType - The task type from TASK_TYPES
 * @returns {{success: boolean, agentConfig?: Object, error?: string, code?: string}}
 */
export function getAgentConfig(taskType) {
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
      agent: taskConfig.agent,
      model: taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations || 30,
      reasoningEffort: taskConfig.reasoningEffort,
    },
  };
}

/**
 * Get available agent based on config and detection
 * @param {string} agentId - The agent ID to retrieve
 * @returns {Promise<{success: boolean, agent?: Object, error?: string, code?: string}>}
 */
export async function getAgent(agentId) {
  const selectedId = agentId || AGENT_TYPES.LLM_API;
  const agentEntry = AGENTS[selectedId];

  if (!agentEntry) {
    return {
      success: false,
      code: AGENT_ERROR_CODES.UNSUPPORTED_AGENT,
      error: `Unsupported AI agent: ${selectedId}`,
    };
  }

  const selectedAgent = agentEntry.agent;

  const available = await selectedAgent.detect();
  if (!available) {
    return {
      success: false,
      code: AGENT_ERROR_CODES.AGENT_UNAVAILABLE,
      error: `${agentEntry.name} is not available on this machine`,
    };
  }

  return {
    success: true,
    agent: selectedAgent,
  };
}

/**
 * Detect which agents are available
 * @returns {Promise<Object>} Available agents
 */
export async function detectAvailableAgents() {
  const entries = await Promise.all(
    Object.values(AGENTS).map(async (agentEntry) => [
      agentEntry.id,
      await agentEntry.agent.detect(),
    ]),
  );

  return Object.fromEntries(entries);
}

/**
 * Get tools currently supported by backend execution flow
 * @returns {string[]} Supported tool IDs
 */
export function getSupportedAgents() {
  return Object.values(AGENTS).map(
    ({ agent: _agent, ...agentEntry }) => agentEntry,
  );
}
