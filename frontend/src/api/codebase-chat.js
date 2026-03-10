import client from "./client";

/**
 * Start a custom codebase task via the floating agent chat
 *
 * @param {Object} params
 * @param {string} params.userInstruction - User's requested operation
 * @param {string} [params.domainId] - Optional current domain context
 * @param {Array} [params.history] - Previous messages in the conversation
 * @param {Object|null} [params.agentsOverrides] - Agent overrides incl. model, maxTokens, reasoningEffort, temperature
 * @returns {Promise} - { taskId, message }
 */
export const startCustomCodebaseTask = ({
  userInstruction,
  domainId = null,
  history = [],
  agentsOverrides = null,
}) =>
  client.post("/chat/codebase", {
    userInstruction,
    domainId,
    history,
    agentsOverrides,
  });
