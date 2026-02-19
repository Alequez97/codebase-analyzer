/**
 * Available AI models
 */
export const MODELS = {
  // OpenAI models
  GPT_4: "gpt-4",
  GPT_4_TURBO: "gpt-4-turbo",
  GPT_5: "gpt-5.2",

  // Anthropic models
  CLAUDE_OPUS: "claude-opus-4-20250514",
  CLAUDE_SONNET: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU: "claude-3-5-haiku-20241022",

  // DeepSeek models
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",
};

/**
 * Model display names
 */
export const MODEL_NAMES = {
  [MODELS.GPT_4]: "GPT-4",
  [MODELS.GPT_4_TURBO]: "GPT-4 Turbo",
  [MODELS.GPT_5]: "GPT-5.2",
  [MODELS.CLAUDE_OPUS]: "Claude Opus 4",
  [MODELS.CLAUDE_SONNET]: "Claude Sonnet 4.5",
  [MODELS.CLAUDE_HAIKU]: "Claude Haiku 3.5",
  [MODELS.DEEPSEEK_CHAT]: "DeepSeek Chat",
  [MODELS.DEEPSEEK_REASONER]: "DeepSeek Reasoner",
};
