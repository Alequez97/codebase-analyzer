/**
 * Task status constants
 * Used to identify the current state of analysis tasks
 * Must match backend constants in backend/constants/task-status.js
 */

export const TASK_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
};

/**
 * Task folder names (where tasks are stored based on status)
 */
export const TASK_FOLDERS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
};
