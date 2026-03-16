/**
 * Socket event constants
 * Shared between client and server to ensure consistency
 */

export const SOCKET_EVENTS = {
  // Client events
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // Task events
  TASK_QUEUED: "task:queued",
  TASK_COMPLETED: "task:completed",
  TASK_FAILED: "task:failed",
  TASK_CANCELED: "task:canceled",
  TASK_RESTARTED: "task:restarted",
  TASK_PROGRESS: "task:progress",

  // Task-specific logs
  LOG_CODEBASE_ANALYSIS: "log:codebase-analysis",
  LOG_DOCUMENTATION: "log:documentation",
  LOG_DIAGRAMS: "log:diagrams",
  LOG_REQUIREMENTS: "log:requirements",
  LOG_BUGS_SECURITY: "log:bugs-security",
  LOG_REFACTORING_AND_TESTING: "log:refactoring-and-testing",
  LOG_IMPLEMENT_FIX: "log:implement-fix",
  LOG_IMPLEMENT_TEST: "log:implement-test",
  LOG_APPLY_REFACTORING: "log:apply-refactoring",

  // Edit task logs (AI chat)
  LOG_EDIT_DOCUMENTATION: "log:edit-documentation",
  LOG_EDIT_DIAGRAMS: "log:edit-diagrams",
  LOG_EDIT_REQUIREMENTS: "log:edit-requirements",
  LOG_EDIT_BUGS_SECURITY: "log:edit-bugs-security",
  LOG_EDIT_REFACTORING_AND_TESTING: "log:edit-refactoring-and-testing",
  LOG_EDIT_CODEBASE_ANALYSIS: "log:edit-codebase-analysis",

  // Documentation analysis/edit result pushed directly via socket
  // isEdit: true when triggered by AI chat (shows diff), false for fresh analysis
  DOCUMENTATION_UPDATED: "documentation:updated",

  // Generic AI chat message event - used by all section chat tasks
  // chatId links the message to the originating task
  CHAT_MESSAGE: "chat:message",

  // Custom codebase task events (floating agent chat)
  CUSTOM_TASK_THINKING: "custom-task:thinking",
  CUSTOM_TASK_PROGRESS: "custom-task:progress",
  CUSTOM_TASK_FILE_UPDATED: "custom-task:file-updated",
  CUSTOM_TASK_DOC_UPDATED: "custom-task:doc-updated",
  CUSTOM_TASK_CONFLICT_DETECTED: "custom-task:conflict-detected",
  CUSTOM_TASK_AWAITING_RESPONSE: "custom-task:awaiting-response",
  CUSTOM_TASK_CANCELLED: "custom-task:cancelled",
  CUSTOM_TASK_COMPLETED: "custom-task:completed",
  CUSTOM_TASK_FAILED: "custom-task:failed",
  CUSTOM_TASK_MESSAGE: "custom-task:message",
  LOG_CUSTOM_CODEBASE_TASK: "log:custom-codebase-task",

  // Review changes task log
  LOG_REVIEW_CHANGES: "log:review-changes",

  // Market research task logs
  LOG_MARKET_RESEARCH_INITIAL: "log:market-research-initial",
  LOG_MARKET_RESEARCH_COMPETITOR: "log:market-research-competitor",
  LOG_MARKET_RESEARCH_SUMMARY: "log:market-research-summary",

  // Market research completed — carries sessionId in params
  MARKET_RESEARCH_COMPLETED: "market-research:completed",

  // Market research final report assembled — carries sessionId + taskId
  MARKET_RESEARCH_REPORT_READY: "market-research:report-ready",

  // Emitted when a competitor sub-task is queued — lets the UI show a skeleton card immediately
  MARKET_RESEARCH_COMPETITOR_FOUND: "market-research:competitor-found",
  MARKET_RESEARCH_COMPETITOR_UPDATED: "market-research:competitor-updated",
};
