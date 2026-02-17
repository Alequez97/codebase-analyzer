/**
 * Socket event constants
 * Shared between client and server to ensure consistency
 */

export const SOCKET_EVENTS = {
  // Client events
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // Task events
  TASK_COMPLETED: "task:completed",

  // Task-specific logs
  LOG_CODEBASE_ANALYSIS: "log:codebase-analysis",
  LOG_DOCUMENTATION: "log:documentation",
  LOG_REQUIREMENTS: "log:requirements",
  LOG_TESTING: "log:testing",
};
