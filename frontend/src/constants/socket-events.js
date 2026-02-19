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
  TASK_FAILED: "task:failed",
  TASK_PROGRESS: "task:progress",

  // Task-specific logs
  LOG_CODEBASE_ANALYSIS: "log:codebase-analysis",
  LOG_DOCUMENTATION: "log:documentation",
  LOG_REQUIREMENTS: "log:requirements",
  LOG_BUGS_SECURITY: "log:bugs-security",
  LOG_TESTING: "log:testing",
  LOG_APPLY_FIX: "log:apply-fix",
};
