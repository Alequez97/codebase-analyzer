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
  LOG_DIAGRAMS: "log:diagrams",
  LOG_REQUIREMENTS: "log:requirements",
  LOG_BUGS_SECURITY: "log:bugs-security",
  LOG_TESTING: "log:testing",
  LOG_APPLY_FIX: "log:apply-fix",
  LOG_APPLY_TEST: "log:apply-test",

  // Edit task logs (AI chat)
  LOG_EDIT_DOCUMENTATION: "log:edit-documentation",
  LOG_EDIT_DIAGRAMS: "log:edit-diagrams",
  LOG_EDIT_REQUIREMENTS: "log:edit-requirements",
  LOG_EDIT_BUGS_SECURITY: "log:edit-bugs-security",
  LOG_EDIT_TESTING: "log:edit-testing",

  // Edit documentation events (AI chat)
  EDIT_DOCUMENTATION_THINKING: "edit:documentation:thinking",
  EDIT_DOCUMENTATION_DESCRIPTION: "edit:documentation:description",
  EDIT_DOCUMENTATION_CONTENT: "edit:documentation:content",
};
