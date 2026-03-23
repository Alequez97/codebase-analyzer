/**
 * AI provider identifiers
 */
export const PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  DEEPSEEK: "deepseek",
  KIMI: "kimi",
  OPENROUTER: "openrouter",
  GOOGLE: "google",
  GLM: "glm",
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES = {
  [PROVIDERS.OPENAI]: "OpenAI",
  [PROVIDERS.ANTHROPIC]: "Anthropic",
  [PROVIDERS.DEEPSEEK]: "DeepSeek",
  [PROVIDERS.KIMI]: "Kimi (Moonshot)",
  [PROVIDERS.OPENROUTER]: "OpenRouter",
  [PROVIDERS.GOOGLE]: "Google",
  [PROVIDERS.GLM]: "GLM (Z.AI)",
};

/**
 * Provider API base URLs
 */
export const PROVIDER_URLS = {
  [PROVIDERS.OPENAI]: "https://api.openai.com/v1",
  [PROVIDERS.ANTHROPIC]: "https://api.anthropic.com/v1",
  [PROVIDERS.DEEPSEEK]: "https://api.deepseek.com",
  [PROVIDERS.KIMI]: "https://api.moonshot.ai/v1",
  [PROVIDERS.OPENROUTER]: "https://openrouter.ai/api/v1",
  [PROVIDERS.GOOGLE]: "https://generativelanguage.googleapis.com/v1",
  [PROVIDERS.GLM]: "https://api.z.ai/api/paas/v4",
};
