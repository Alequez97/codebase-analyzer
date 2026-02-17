/**
 * Socket event emitter singleton
 * Avoids circular dependencies when agents need to emit socket events
 */

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
