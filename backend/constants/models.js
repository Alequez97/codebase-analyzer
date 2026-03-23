/**
 * Available AI models
 */
export const MODELS = {
  // OpenAI models
  GPT_4: "gpt-4",
  GPT_4_TURBO: "gpt-4-turbo",
  GPT_5_MINI: "gpt-5-mini",
  GPT_5_2: "gpt-5.2",
  GPT_5_3_CODEX: "gpt-5.3-codex",

  // Anthropic models
  CLAUDE_OPUS_4: "claude-opus-4-20250514",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
  CLAUDE_HAIKU_3_5: "claude-3-5-haiku-20241022",

  // DeepSeek models
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",

  // Kimi (Moonshot) models
  KIMI_K2_5: "kimi-k2.5",
  KIMI_K2_THINKING: "kimi-k2-thinking",
  KIMI_K2_THINKING_TURBO: "kimi-k2-thinking-turbo",

  // Google Gemini models
  GEMINI_3_1_PRO_PREVIEW: "gemini-3.1-pro-preview",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",

  // GLM (Z.AI) models
  GLM_5: "glm-5",
  GLM_5_TURBO: "glm-5-turbo",
  GLM_4_7: "glm-4.7",
  GLM_4_6: "glm-4.6",
  GLM_4_5: "glm-4.5",
};

/**
 * Model display names
 */
export const MODEL_NAMES = {
  [MODELS.GPT_4]: "GPT-4",
  [MODELS.GPT_4_TURBO]: "GPT-4 Turbo",
  [MODELS.GPT_5_MINI]: "GPT-5 mini",
  [MODELS.GPT_5_2]: "GPT-5.2",
  [MODELS.GPT_5_3_CODEX]: "GPT-5.3-Codex",
  [MODELS.CLAUDE_OPUS_4]: "Claude Opus 4",
  [MODELS.CLAUDE_OPUS_4_6]: "Claude Opus 4.6",
  [MODELS.CLAUDE_SONNET_4_5]: "Claude Sonnet 4.5",
  [MODELS.CLAUDE_SONNET_4_6]: "Claude Sonnet 4.6",
  [MODELS.CLAUDE_HAIKU_3_5]: "Claude Haiku 3.5",
  [MODELS.DEEPSEEK_CHAT]: "DeepSeek Chat",
  [MODELS.DEEPSEEK_REASONER]: "DeepSeek Reasoner",
  [MODELS.KIMI_K2_5]: "Kimi K2.5",
  [MODELS.KIMI_K2_THINKING]: "Kimi K2 Thinking",
  [MODELS.KIMI_K2_THINKING_TURBO]: "Kimi K2 Thinking Turbo",
  [MODELS.GEMINI_3_1_PRO_PREVIEW]: "Gemini 3.1 Pro Preview",
  [MODELS.GEMINI_2_5_PRO]: "Gemini 2.5 Pro Preview",
  [MODELS.GEMINI_2_5_FLASH]: "Gemini 2.5 Flash Preview",
  [MODELS.GEMINI_2_0_FLASH_EXP]: "Gemini 2.0 Flash (Experimental)",
  [MODELS.GEMINI_2_0_FLASH_THINKING_EXP]:
    "Gemini 2.0 Flash Thinking (Experimental)",
  [MODELS.GEMINI_EXP_1206]: "Gemini Experimental 1206",
  [MODELS.GEMINI_1_5_PRO]: "Gemini 1.5 Pro",
  [MODELS.GEMINI_1_5_FLASH]: "Gemini 1.5 Flash",
  [MODELS.GEMINI_1_5_FLASH_8B]: "Gemini 1.5 Flash-8B",
  [MODELS.GLM_5]: "GLM-5",
  [MODELS.GLM_5_TURBO]: "GLM-5 Turbo",
  [MODELS.GLM_4_7]: "GLM-4.7",
  [MODELS.GLM_4_6]: "GLM-4.6",
  [MODELS.GLM_4_5]: "GLM-4.5",
};
