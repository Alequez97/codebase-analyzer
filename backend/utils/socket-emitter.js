/**
 * Socket event emitter singleton
 * Avoids circular dependencies when agents need to emit socket events
 */

import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { getLogEventForTaskType } from "./task-logger.js";

let socketInstance = null;

/**
 * Initialize the socket instance
 * Called once from index.js after creating the Socket.IO server
 * @param {Server} io - Socket.IO server instance
 */
export function initSocketEmitter(io) {
  socketInstance = io;
}

/**
 * Emit a socket event
 * @param {string} eventName - Event name
 * @param {*} data - Event data
 */
export function emitSocketEvent(eventName, data) {
  if (!socketInstance) {
    // Socket not initialized - skip emission silently
    // This can happen during tests or if called before server starts
    return;
  }

  try {
    socketInstance.emit(eventName, data);
  } catch (error) {
    // Log but don't throw - socket errors shouldn't break the application
    console.error("Socket emission error:", error);
  }
}

/**
 * Check if socket is initialized
 * @returns {boolean}
 */
export function isSocketReady() {
  return socketInstance !== null;
}

/**
 * Emit a task log event using task type -> socket event mapping
 * @param {Object} task - Task object with id, type, and params
 * @param {Object} payload - Additional payload fields (e.g. log, stream)
 */
export function emitTaskLog(task, payload = {}) {
  const logEventName = getLogEventForTaskType(task.type);
  emitSocketEvent(logEventName, {
    taskId: task.id,
    domainId: task.params?.domainId,
    type: task.type,
    stream: "stdout",
    ...payload,
  });
}

/**
 * Emit task progress event
 * Convenience helper for emitting task progress updates
 * @param {Object} task - Task object with id, type, and params
 * @param {string} stage - Progress stage (initializing, analyzing, compacting, saving, etc.)
 * @param {string} message - Progress message to display
 */
export function emitTaskProgress(task, stage, message) {
  emitSocketEvent(SOCKET_EVENTS.TASK_PROGRESS, {
    taskId: task.id,
    domainId: task.params?.domainId,
    type: task.type,
    stage,
    message,
  });

  emitTaskLog(task, {
    log: `[${String(stage || "").toUpperCase()}] ${message}\n`,
  });
}
