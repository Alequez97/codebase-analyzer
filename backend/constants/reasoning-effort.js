/**
 * Reasoning effort levels for AI models
 * Used by reasoning models like DeepSeek Reasoner, OpenAI o1/o3, etc.
 */
export const REASONING_EFFORT = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

/**
 * Reasoning effort display names
 */
export const REASONING_EFFORT_NAMES = {
  [REASONING_EFFORT.LOW]: "Low",
  [REASONING_EFFORT.MEDIUM]: "Medium",
  [REASONING_EFFORT.HIGH]: "High",
};
