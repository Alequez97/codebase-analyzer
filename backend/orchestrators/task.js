import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import * as tasksPersistence from "../persistence/tasks.js";

/** AbortControllers for in-flight tasks, keyed by taskId */
const runningTaskControllers = new Map();

/** Pending user response handlers, keyed by taskId -> { resolve, reject, messageId } */
const pendingUserResponses = new Map();

import { appendRevision } from "../persistence/utils.js";
import { getAgent } from "../tasks/executors/index.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { TASK_TYPES } from "../constants/task-types.js";
import { TASK_STATUS } from "../constants/task-status.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import { deleteProgressFile } from "../utils/task-progress.js";
import * as domainBugsSecurityPersistence from "../persistence/domain-bugs-security.js";
import * as logger from "../utils/logger.js";

/**
 * Get all pending tasks
 * @returns {Promise<Array>} Array of pending tasks
 */
export async function getPendingTasks() {
  return tasksPersistence.listPending();
}

/**
 * Get tasks with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasks(filters = {}) {
  return tasksPersistence.listTasks(filters);
}

/**
 * Get a specific task by ID
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTask(taskId) {
  return tasksPersistence.readTask(taskId);
}

/**
 * Post-process analysis output files to record a task revision in metadata.json.
 * For JSON-output tasks the agent's content file is also rewritten (clean, no embedded metadata).
 * @param {Object} task - The task object
 */
async function persistTaskRevision(task) {
  // For IMPLEMENT_FIX tasks — record the fix as applied in the actions registry
  if (task.type === TASK_TYPES.IMPLEMENT_FIX) {
    const { domainId, findingId } = task.params || {};
    if (domainId && findingId) {
      try {
        await domainBugsSecurityPersistence.recordBugsSecurityFindingAction(
          domainId,
          { findingId, action: "apply" },
        );
        logger.debug(
          `Recorded fix action for finding ${findingId} in domain ${domainId}`,
          { component: "TaskOrchestrator", taskId: task.id },
        );
      } catch (error) {
        logger.error(`Failed to record fix action for finding ${findingId}`, {
          error,
          component: "TaskOrchestrator",
          taskId: task.id,
        });
      }
    }
    return;
  }

  if (!task.outputFile) {
    return;
  }

  const outputPath = path.isAbsolute(task.outputFile)
    ? task.outputFile
    : path.join(config.target.directory, task.outputFile);
  const metadataPath = path.join(
    path.dirname(outputPath),
    PERSISTENCE_FILES.METADATA_JSON,
  );

  // These task types produce markdown or directly-written JSON — skip the server-side JSON rewrite.
  // Edit tasks let the LLM write the file cleanly; no server-side mutation is needed.
  const SKIP_JSON_REWRITE_TYPES = [
    TASK_TYPES.DOCUMENTATION,
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  // For JSON output tasks — rewrite the content file cleanly (no embedded metadata).
  if (!SKIP_JSON_REWRITE_TYPES.includes(task.type)) {
    try {
      let raw = "";
      try {
        raw = await fs.readFile(outputPath, "utf-8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      if (raw && raw.trim()) {
        let analysis;
        try {
          analysis = JSON.parse(raw);
        } catch {
          analysis = null;
        }

        if (
          analysis &&
          typeof analysis === "object" &&
          !Array.isArray(analysis)
        ) {
          // Strip any previously embedded metadata field
          delete analysis.metadata;

          // Auto-calculate summary for bugs-security findings
          if (
            task.type === TASK_TYPES.BUGS_SECURITY &&
            Array.isArray(analysis.findings)
          ) {
            const summary = {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              total: analysis.findings.length,
            };
            analysis.findings.forEach(({ severity }) => {
              const s = severity?.toLowerCase();
              if (s === "critical") summary.critical++;
              else if (s === "high") summary.high++;
              else if (s === "medium") summary.medium++;
              else if (s === "low") summary.low++;
            });
            analysis.summary = summary;
          }

          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(
            outputPath,
            JSON.stringify(analysis, null, 2),
            "utf-8",
          );
        }
      }
    } catch (error) {
      logger.error(`Failed to rewrite JSON content for task`, {
        error,
        component: "TaskOrchestrator",
        taskId: task.id,
      });
    }
  }

  // Append a revision to metadata.json — never overwrite.
  try {
    await appendRevision(metadataPath, {
      taskId: task.id,
      type: task.type,
      completedAt: new Date().toISOString(),
    });
    logger.debug(`Appended revision to metadata for task ${task.id}`, {
      component: "TaskOrchestrator",
      taskId: task.id,
    });
  } catch (error) {
    logger.error(`Failed to append metadata revision for task`, {
      error,
      component: "TaskOrchestrator",
      taskId: task.id,
    });
  }
}

/**
 * Execute a task using the configured agent.
 * Called by the queue processor after it picks a pending task.
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Execution result
 */
export async function executeTask(taskId) {
  const task = await tasksPersistence.readTask(taskId);

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found`,
      taskId,
    };
  }

  if (
    task.status !== TASK_STATUS.PENDING &&
    task.status !== TASK_STATUS.RUNNING
  ) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: `Task ${taskId} is not pending (status: ${task.status})`,
      taskId,
    };
  }

  // Move to running only if still pending (queue processor may have already claimed it)
  if (task.status === TASK_STATUS.PENDING) {
    await tasksPersistence.moveToRunning(taskId);
  }

  const controller = new AbortController();
  runningTaskControllers.set(taskId, controller);

  // Create response handler for tasks that support user interaction
  const responseHandler = createUserResponseHandler(task);

  let result;
  try {
    const agentResult = await getAgent(task.agentConfig?.agent);
    if (!agentResult.success) {
      const selectionError = agentResult.error || "Agent selection failed";

      await tasksPersistence.moveToFailed(taskId, selectionError);

      // Keep progress file for debugging failed tasks

      emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
        taskId,
        type: task.type,
        domainId: task.params?.domainId,
        error: selectionError,
        code: agentResult.code,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        code: agentResult.code,
        error: selectionError,
        taskId,
        logFile: task.logFile,
      };
    }

    result = await agentResult.agent.execute(
      task,
      controller.signal,
      responseHandler,
    );
  } catch (error) {
    // Task was cancelled — skip moveToFailed/TASK_FAILED since the task file
    // was already removed by deleteTask() before the abort was triggered.
    if (controller.signal.aborted) {
      await deleteProgressFile(taskId);
      return { success: false, cancelled: true, taskId };
    }

    const executionError = error?.message || "Task execution failed";

    await tasksPersistence.moveToFailed(taskId, executionError);

    // Keep progress file for debugging failed tasks

    emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      error: executionError,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: executionError,
      taskId,
      logFile: task.logFile,
    };
  } finally {
    runningTaskControllers.delete(taskId);
  }

  if (result.success) {
    // Rewrite content file cleanly and append revision to metadata.json
    await persistTaskRevision(task);

    // Move task to completed
    await tasksPersistence.moveToCompleted(taskId);

    // Clean up temporary progress file
    await deleteProgressFile(taskId);

    // Emit event via socket
    emitSocketEvent(SOCKET_EVENTS.TASK_COMPLETED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      params: task.params,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Task was cleanly cancelled — file already removed, nothing to persist
    if (result.cancelled) {
      await deleteProgressFile(taskId);
      return result;
    }

    // Task failed - move to failed directory
    await tasksPersistence.moveToFailed(
      taskId,
      result.error || "Task execution failed",
    );

    // Keep progress file for debugging failed tasks

    // Emit failure event
    emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      error: result.error || "Task execution failed",
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Delete a task and abort any running agent for it.
 * Cannot delete completed tasks.
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  // Abort the in-flight agent loop (if any) before removing the file.
  const controller = runningTaskControllers.get(taskId);
  if (controller) {
    controller.abort();
    runningTaskControllers.delete(taskId);
    logger.info(`Aborted running agent for task ${taskId}`, {
      component: "TaskOrchestrator",
    });
  }

  const result = await tasksPersistence.deleteTask(taskId);

  if (!result.success) {
    return result;
  }

  return { success: true };
}

/**
 * Cancel a task and abort any running agent for it.
 * Moves task to canceled folder instead of deleting.
 * @param {string} taskId - The task ID
 * @returns {Promise<{success: boolean, code?: string, error?: string, task?: Object}>}
 */
export async function cancelTask(taskId) {
  // Abort the in-flight agent loop (if any) before moving the file.
  const controller = runningTaskControllers.get(taskId);
  if (controller) {
    controller.abort();
    runningTaskControllers.delete(taskId);
    logger.info(`Aborted running agent for task ${taskId}`, {
      component: "TaskOrchestrator",
    });
  }

  const result = await tasksPersistence.moveToCanceled(taskId);

  if (!result.success) {
    return result;
  }

  logger.info(`Task ${taskId} canceled by user`, {
    component: "TaskOrchestrator",
  });

  return { success: true, task: result.task };
}

/**
 * Restart a failed, pending, or canceled task by moving it back to pending.
 * Cannot restart running or completed tasks.
 * @param {string} taskId - The task ID
 * @returns {Promise<{success: boolean, code?: string, error?: string, task?: Object}>}
 */
export async function restartTask(taskId) {
  const result = await tasksPersistence.restartTask(taskId);

  if (!result.success) {
    return result;
  }

  logger.info(`Task ${taskId} restarted and moved back to pending`, {
    component: "TaskOrchestrator",
  });

  return { success: true, task: result.task };
}

/**
 * Recover orphaned tasks on server startup.
 * Tasks stuck in running/ (from a previous crash) are moved back to pending/
 * so the queue processor can pick them up.
 * @returns {Promise<Object>} Result with count of recovered tasks
 */
export async function recoverOrphanedTasks() {
  try {
    const runningTasks = await tasksPersistence.listRunning();

    if (runningTasks.length === 0) {
      logger.info("No orphaned running tasks to recover", {
        component: "TaskOrchestrator",
      });
      return { recovered: 0, tasks: [] };
    }

    logger.info(`Recovering ${runningTasks.length} orphaned running task(s)`, {
      component: "TaskOrchestrator",
    });

    const recoveredIds = [];
    for (const task of runningTasks) {
      try {
        await tasksPersistence.requeueRunningTask(task.id);
        logger.info(`Recovered task: ${task.id} (type: ${task.type})`, {
          component: "TaskOrchestrator",
        });
        recoveredIds.push(task.id);
      } catch (error) {
        logger.error(`Failed to recover task ${task.id}`, {
          error,
          component: "TaskOrchestrator",
        });
      }
    }

    return { recovered: recoveredIds.length, tasks: recoveredIds };
  } catch (error) {
    logger.error("Failed to recover orphaned tasks", {
      error,
      component: "TaskOrchestrator",
    });
    return { recovered: 0, tasks: [], error: error.message };
  }
}

/**
 * Create a response handler for agent message tools.
 * This allows the agent to pause and wait for user responses.
 * @param {Object} task - The task object
 * @returns {Object} Response handler with sendMessage and waitForResponse methods
 */
export function createUserResponseHandler(task) {
  const { id: taskId, type: taskType } = task;
  return {
    /**
     * Send a message to the user via socket.
     * The tool executor calls this instead of emitting directly.
     * @param {Object} messageData - Message payload fields
     */
    sendMessage(messageData) {
      emitSocketEvent(SOCKET_EVENTS.TASK_MESSAGE_TO_USER, {
        ...messageData,
        taskId,
        taskType,
      });
    },

    /**
     * Wait for user response (blocks until response arrives or timeout)
     * @param {string} messageId - The message ID we're waiting for
     * @returns {Promise<string>} The user's response
     */
    async waitForResponse(messageId) {
      logger.info(`Task ${taskId} waiting for user response`, {
        component: "TaskOrchestrator",
        messageId,
      });

      // Move task to WAITING_FOR_USER status
      await tasksPersistence.moveToWaitingForUser(taskId, {
        messageId,
        waitingFor: "user_response",
      });

      // Create a promise that will be resolved when user responds
      return new Promise((resolve, reject) => {
        // Store the resolver
        pendingUserResponses.set(taskId, { resolve, reject, messageId });

        // Timeout after 10 minutes (adjustable based on use case)
        const timeout = setTimeout(() => {
          if (pendingUserResponses.has(taskId)) {
            pendingUserResponses.delete(taskId);
            reject(
              new Error(
                "User response timeout (10 minutes). Task remains paused and can be resumed later.",
              ),
            );
          }
        }, 600000); // 10 minutes

        // Clean up timeout when promise resolves/rejects
        const originalResolve = resolve;
        const originalReject = reject;

        const wrappedResolve = (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        };

        const wrappedReject = (error) => {
          clearTimeout(timeout);
          originalReject(error);
        };

        pendingUserResponses.set(taskId, {
          resolve: wrappedResolve,
          reject: wrappedReject,
          messageId,
        });
      });
    },
  };
}

/**
 * Provide user response to a waiting task and resume execution.
 * This is called by the API endpoint when user responds.
 * @param {string} taskId - The task ID
 * @param {string} response - The user's response
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function provideUserResponse(taskId, response) {
  const pending = pendingUserResponses.get(taskId);

  if (!pending) {
    logger.warn(`No pending response handler for task ${taskId}`, {
      component: "TaskOrchestrator",
    });
    return {
      success: false,
      error: "No pending response request for this task",
    };
  }

  logger.info(`User response received for task ${taskId}`, {
    component: "TaskOrchestrator",
    messageId: pending.messageId,
    responseLength: response?.length,
  });

  // Resume task from waiting_for_user back to running
  await tasksPersistence.resumeFromWaitingForUser(taskId, response);

  // Resolve the promise that agent is waiting on
  pending.resolve(response);
  pendingUserResponses.delete(taskId);

  return { success: true };
}
