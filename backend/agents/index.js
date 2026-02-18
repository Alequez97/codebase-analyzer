import * as llmApi from "./llm-api.js";
import * as aider from "./aider.js";

/**
 * Available AI agents
 * - llm-api: Direct LLM API calls for generating analysis JSON
 * - aider: AI coding assistant for editing files and writing code
 */
const AGENTS = {
  "llm-api": {
    id: "llm-api",
    name: "LLM API",
    purpose: "Generates analysis JSON files",
    module: llmApi,
  },
  aider: {
    id: "aider",
    name: "Aider",
    purpose: "Edits files and writes code",
    installUrl: "https://aider.chat/docs/install.html",
    module: aider,
  },
};

/**
 * Default agents for different task types
 */
export const DEFAULT_AGENTS = {
  CODEBASE_ANALYSIS: "llm-api",
  DOMAIN_DOCUMENTATION: "llm-api",
  DOMAIN_REQUIREMENTS: "llm-api",
  DOMAIN_BUGS_SECURITY: "llm-api",
  DOMAIN_TESTING: "llm-api",
};

/**
 * Get available agent based on config and detection
 * @param {string} agentId - The agent ID to retrieve
 * @returns {Promise<Object>} Agent module with detect() and execute() functions
 */
export async function getAgent(agentId) {
  const selectedId = agentId || "llm-api";
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
