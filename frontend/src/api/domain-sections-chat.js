import client from "./client";

/**
 * Send a message to the AI assistant for domain sections editing
 *
 * @param {Object} params - Chat parameters
 * @param {string} params.domainId - Domain ID
 * @param {string} params.sectionType - Section type (documentation, requirements, testing, etc.)
 * @param {string} params.message - User's message
 * @param {Object} params.context - Current section content
 * @param {Array} params.history - Previous messages in the conversation
 * @returns {Promise} - AI response with message and hasSuggestion flag
 */
export const chatWithAI = ({
  domainId,
  sectionType,
  message,
  context,
  history,
}) =>
  client.post(`/chat/domain/${domainId}/${sectionType}`, {
    message,
    context,
    history,
  });
