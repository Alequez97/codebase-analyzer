import client from "./client";

/**
 * Start a custom codebase task via the floating agent chat
 *
 * @param {Object} params
 * @param {string} params.userInstruction - User's requested operation
 * @param {string} [params.domainId] - Optional current domain context
 * @param {Array} [params.history] - Previous messages in the conversation
 * @returns {Promise} - { taskId, message }
 */
export const startCustomCodebaseTask = ({
  userInstruction,
  domainId = null,
  history = [],
}) => client.post("/chat/codebase", { userInstruction, domainId, history });
