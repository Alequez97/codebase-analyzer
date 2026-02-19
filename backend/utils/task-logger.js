import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_TYPES } from "../constants/task-types.js";

/**
 * Map task type to socket log event
 * @param {string} taskType - The task type
 * @returns {string} The socket event name for logging
 */
export function getLogEventForTaskType(taskType) {
  const eventMap = {
    [TASK_TYPES.CODEBASE_ANALYSIS]: SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS,
    [TASK_TYPES.DOCUMENTATION]: SOCKET_EVENTS.LOG_DOCUMENTATION,
    [TASK_TYPES.REQUIREMENTS]: SOCKET_EVENTS.LOG_REQUIREMENTS,
    [TASK_TYPES.BUGS_SECURITY]: SOCKET_EVENTS.LOG_BUGS_SECURITY,
    [TASK_TYPES.TESTING]: SOCKET_EVENTS.LOG_TESTING,
    [TASK_TYPES.APPLY_FIX]: SOCKET_EVENTS.LOG_APPLY_FIX,
  };

  const event = eventMap[taskType];

  if (!event) {
    throw new Error(
      `Unknown task type: ${taskType}. Cannot determine log event.`,
    );
  }

  return event;
}
