/**
 * Available AI models grouped by provider.
 * Model values must match the backend constants/models.js strings.
 */

export const MODELS_BY_PROVIDER = [
  {
    provider: "openai",
    label: "OpenAI",
    models: [
      { value: "gpt-5-mini", label: "GPT-5 mini" },
      { value: "gpt-5.2", label: "GPT-5.2" },
      { value: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
      { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5" },
    ],
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    models: [
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
      { value: "deepseek-chat", label: "DeepSeek Chat" },
    ],
  },
  {
    provider: "google",
    label: "Google",
    models: [
      {
        value: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro Preview",
      },
      {
        value: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
      },
      {
        value: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
      },
    ],
  },
];

/**
 * Flat model-value → display-label lookup.
 * Derived from MODELS_BY_PROVIDER so it's always in sync.
 */
export const MODEL_LABELS = Object.fromEntries(
  MODELS_BY_PROVIDER.flatMap(({ models }) =>
    models.map(({ value, label }) => [value, label]),
  ),
);
