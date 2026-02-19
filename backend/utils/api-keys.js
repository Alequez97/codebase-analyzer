/**
 * API Key Management Utility
 * Handles API key retrieval for LLM providers
 */

/**
 * Get API key for a specific provider
 * @param {string} provider - The provider name (e.g., "openai", "anthropic")
 * @param {Object} apiKeys - Object containing API keys by provider
 * @returns {string|null} The API key or null if not found
 */
export function getApiKeyForProvider(provider, apiKeys) {
  return apiKeys[provider] || null;
}
