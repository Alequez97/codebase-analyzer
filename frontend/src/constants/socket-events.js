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
};

// Task types
export const TASK_TYPES = {
  SCAN: "scan",
  ANALYZE: "analyze",
};
