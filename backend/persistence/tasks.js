import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { tryReadJsonFile } from "./utils.js";
import { TASK_STATUS, TASK_FOLDERS } from "../constants/task-status.js";
import { TASK_TYPES } from "../constants/task-types.js";
import * as logger from "../utils/logger.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";

/**
 * Read a task from any folder (pending, running, completed, failed, or canceled)
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function readTask(taskId) {
  const locations = [
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.PENDING,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.RUNNING,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.WAITING_FOR_USER,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.COMPLETED,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.FAILED,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.CANCELED,
      `${taskId}.json`,
    ),
  ];

  for (const filePath of locations) {
    try {
      const task = await tryReadJsonFile(filePath, `task ${taskId}`);
      if (task) {
        return task;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return null;
}

/**
 * Enqueue task by writing it to the pending directory.
 * Also stamps the deterministic logFile path so no later in-flight update is needed.
 * @param {Object} task - The task object
 */
export async function enqueueTask(task) {
  // Stamp logFile once at queue time — it's deterministic and carries through all folder moves.
  if (!task.logFile) {
    task.logFile = `logs/${task.id}.log`;
  }
  const filePath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${task.id}.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(task, null, 2), "utf-8");

  emitSocketEvent(SOCKET_EVENTS.TASK_QUEUED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
    pageName: task.params?.pageName ?? null,
    agent: task.agentConfig?.agent ?? null,
    model: task.agentConfig?.model ?? null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Read all JSON task files from a given folder, sorted oldest-first.
 * @param {string} folder - TASK_FOLDERS constant
 * @returns {Promise<Object[]>}
 */
async function listTasksInFolder(folder) {
  try {
    const tasksDir = path.join(config.paths.targetAnalysis, "tasks", folder);
    const files = await fs.readdir(tasksDir);

    const tasks = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (file) => {
          const content = await fs.readFile(path.join(tasksDir, file), "utf-8");
          return JSON.parse(content);
        }),
    );

    // Oldest first (FIFO for queue processing)
    return tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * List all pending tasks (oldest-first, ready to be picked up by the queue processor)
 * @returns {Promise<Object[]>}
 */
export async function listPending() {
  return listTasksInFolder(TASK_FOLDERS.PENDING);
}

/**
 * List all currently running tasks
 * @returns {Promise<Object[]>}
 */
export async function listRunning() {
  return listTasksInFolder(TASK_FOLDERS.RUNNING);
}

/**
 * List tasks with optional filters (date range, status)
 * @param {Object} filters - Filter options
 * @param {string} [filters.dateFrom] - ISO date string (inclusive)
 * @param {string} [filters.dateTo] - ISO date string (inclusive)
 * @param {string[]} [filters.status] - Array of status values to include (e.g., ['pending', 'running', 'failed', 'canceled', 'completed'])
 * @returns {Promise<Object[]>}
 */
export async function listTasks(filters = {}) {
  const { dateFrom, dateTo, status } = filters;

  // Determine which folders to search based on status filter
  const foldersToSearch =
    status && status.length > 0
      ? status.map((s) => TASK_FOLDERS[s.toUpperCase()])
      : Object.values(TASK_FOLDERS);

  // Fetch from all relevant folders
  const allTasks = await Promise.all(
    foldersToSearch.map((folder) => listTasksInFolder(folder)),
  );
  let tasks = allTasks.flat();

  // Apply date filters if provided
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    tasks = tasks.filter((task) => new Date(task.createdAt) >= fromDate);
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    tasks = tasks.filter((task) => new Date(task.createdAt) <= toDate);
  }

  // Sort by createdAt (newest first for UI display)
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Move task from pending to running (claimed by the queue processor)
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The running task
 */
export async function moveToRunning(taskId) {
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );

  const content = await fs.readFile(pendingPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.RUNNING;
  task.startedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(runningPath), { recursive: true });
  await fs.writeFile(runningPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(pendingPath);

  return task;
}

/**
 * Move task from running to completed
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The completed task
 */
export async function moveToCompleted(taskId) {
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.COMPLETED,
    `${taskId}.json`,
  );

  const content = await fs.readFile(runningPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.COMPLETED;
  task.completedAt = new Date().toISOString();

  await fs.writeFile(completedPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(runningPath);

  return task;
}

/**
 * Move task to failed. Checks running/ first, then pending/ (for pre-execution failures).
 * @param {string} taskId - The task ID
 * @param {string} error - Error message
 * @returns {Promise<Object>} The failed task
 */
export async function moveToFailed(taskId, error) {
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const failedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.FAILED,
    `${taskId}.json`,
  );

  await fs.mkdir(path.dirname(failedPath), { recursive: true });

  // Try running/ first (normal case), fall back to pending/ (agent selection failure)
  let sourcePath = runningPath;
  try {
    await fs.access(runningPath);
  } catch {
    sourcePath = pendingPath;
  }

  const content = await fs.readFile(sourcePath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.FAILED;
  task.failedAt = new Date().toISOString();
  task.error = error || "Task execution failed";

  await fs.writeFile(failedPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(sourcePath);

  return task;
}

/**
 * Move task to canceled (user-initiated cancellation)
 * @param {string} taskId - The task ID
 * @returns {Promise<{success: boolean, code?: string, error?: string, task?: Object}>}
 */
export async function moveToCanceled(taskId) {
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const canceledPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.CANCELED,
    `${taskId}.json`,
  );

  // Find the task in running or pending
  let sourcePath = null;
  let task = null;

  for (const taskPath of [runningPath, pendingPath]) {
    try {
      const content = await fs.readFile(taskPath, "utf-8");
      task = JSON.parse(content);
      sourcePath = taskPath;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or cannot be canceled`,
    };
  }

  // Update task status
  task.status = TASK_STATUS.CANCELED;
  task.canceledAt = new Date().toISOString();

  // Write to canceled folder
  await fs.mkdir(path.dirname(canceledPath), { recursive: true });
  await fs.writeFile(canceledPath, JSON.stringify(task, null, 2), "utf-8");

  // Delete from source folder
  await fs.unlink(sourcePath);

  emitSocketEvent(SOCKET_EVENTS.TASK_CANCELED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    agent: task.agentConfig?.agent ?? null,
    model: task.agentConfig?.model ?? null,
    timestamp: new Date().toISOString(),
  });

  return { success: true, task };
}

/**
 * Move a stuck running task back to pending (used on server restart)
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The re-queued task
 */
export async function requeueRunningTask(taskId) {
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );

  const content = await fs.readFile(runningPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.PENDING;
  delete task.startedAt;

  await fs.writeFile(pendingPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(runningPath);

  return task;
}

/**
 * Restart a failed, pending, or canceled task by moving it back to pending
 * @param {string} taskId - The task ID
 * @returns {Promise<{success: boolean, code?: string, error?: string, task?: Object}>}
 */
export async function restartTask(taskId) {
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const failedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.FAILED,
    `${taskId}.json`,
  );
  const canceledPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.CANCELED,
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.COMPLETED,
    `${taskId}.json`,
  );
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );

  // Check if task is running
  try {
    await fs.access(runningPath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot restart a task that is currently running",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  // Check if task is completed
  try {
    await fs.access(completedPath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot restart a completed task",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  // Try to find task in pending, failed, or canceled
  let sourcePath = null;
  let task = null;

  for (const taskPath of [pendingPath, failedPath, canceledPath]) {
    try {
      const content = await fs.readFile(taskPath, "utf-8");
      task = JSON.parse(content);
      sourcePath = taskPath;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or cannot be restarted`,
    };
  }

  // Reset task to pending status
  task.status = TASK_STATUS.PENDING;
  delete task.startedAt;
  delete task.completedAt;
  delete task.failedAt;
  delete task.canceledAt;
  delete task.error;

  // Write back to pending folder
  await fs.mkdir(path.dirname(pendingPath), { recursive: true });
  await fs.writeFile(pendingPath, JSON.stringify(task, null, 2), "utf-8");

  // Delete from source folder if different
  if (sourcePath !== pendingPath) {
    await fs.unlink(sourcePath);
  }

  emitSocketEvent(SOCKET_EVENTS.TASK_RESTARTED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
    agent: task.agentConfig?.agent ?? null,
    model: task.agentConfig?.model ?? null,
    timestamp: new Date().toISOString(),
  });

  return { success: true, task };
}

/**
 * Delete a task from pending, running, or failed (not completed)
 * Also deletes associated log file if it exists
 * @param {string} taskId - The task ID
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export async function deleteTask(taskId) {
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.COMPLETED,
    `${taskId}.json`,
  );
  const failedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.FAILED,
    `${taskId}.json`,
  );
  const canceledPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.CANCELED,
    `${taskId}.json`,
  );

  // Check if task is completed - prevent deletion
  try {
    await fs.access(completedPath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot delete a completed task",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  // First read the task to get log file path
  let task = null;
  const paths = [pendingPath, runningPath, failedPath, canceledPath];

  for (const taskPath of paths) {
    try {
      const content = await fs.readFile(taskPath, "utf-8");
      task = JSON.parse(content);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  // Delete log file if it exists
  if (task && task.logFile) {
    const logPath = path.join(config.paths.targetAnalysis, task.logFile);
    try {
      await fs.unlink(logPath);
      logger.debug(`Deleted log file: ${task.logFile}`, { component: "Tasks" });
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.error(`Failed to delete log file ${task.logFile}`, {
          error,
          component: "Tasks",
        });
      }
    }
  }

  // Delete task file (try pending, running, failed, and canceled)
  let deleted = false;
  for (const taskPath of paths) {
    try {
      await fs.unlink(taskPath);
      deleted = true;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (!deleted) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or already completed`,
    };
  }

  return { success: true };
}

/**
 * Move task from running to waiting_for_user (agent is waiting for user response)
 * @param {string} taskId - The task ID
 * @param {Object} waitingMetadata - Metadata about what the agent is waiting for
 * @returns {Promise<Object>} The waiting task
 */
export async function moveToWaitingForUser(taskId, waitingMetadata = {}) {
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );
  const waitingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.WAITING_FOR_USER,
    `${taskId}.json`,
  );

  const content = await fs.readFile(runningPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.WAITING_FOR_USER;
  task.waitingSince = new Date().toISOString();
  task.waitingMetadata = {
    ...waitingMetadata,
    timestamp: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(waitingPath), { recursive: true });
  await fs.writeFile(waitingPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(runningPath);

  emitSocketEvent(SOCKET_EVENTS.TASK_WAITING_FOR_USER, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    waitingMetadata: task.waitingMetadata,
    timestamp: new Date().toISOString(),
  });

  return task;
}

/**
 * Resume a task from waiting_for_user back to running
 * @param {string} taskId - The task ID
 * @param {string} userResponse - The user's response
 * @returns {Promise<Object>} The resumed task
 */
export async function resumeFromWaitingForUser(taskId, userResponse) {
  const waitingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.WAITING_FOR_USER,
    `${taskId}.json`,
  );
  const runningPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.RUNNING,
    `${taskId}.json`,
  );

  const content = await fs.readFile(waitingPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.RUNNING;
  task.resumedAt = new Date().toISOString();

  // Store the user response in task metadata for reference
  if (!task.userResponses) {
    task.userResponses = [];
  }
  task.userResponses.push({
    messageId: task.waitingMetadata?.messageId,
    message: task.waitingMetadata?.message,
    response: userResponse,
    respondedAt: new Date().toISOString(),
  });

  // Clear waiting metadata
  delete task.waitingSince;
  delete task.waitingMetadata;

  await fs.mkdir(path.dirname(runningPath), { recursive: true });
  await fs.writeFile(runningPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(waitingPath);

  emitSocketEvent(SOCKET_EVENTS.TASK_RESUMED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    timestamp: new Date().toISOString(),
  });

  return task;
}

/**
 * Update task metadata in place without moving it
 * Useful for storing state (e.g., design version) during execution
 * @param {string} taskId - The task ID
 * @param {Object} updates - Fields to update in task.params or root
 * @returns {Promise<Object>} The updated task
 */
export async function updateTask(taskId, updates) {
  const folders = Object.values(TASK_FOLDERS);
  let taskPath = null;
  let task = null;

  // Find the task in any folder
  for (const folder of folders) {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "tasks",
      folder,
      `${taskId}.json`,
    );
    try {
      const content = await fs.readFile(filePath, "utf-8");
      task = JSON.parse(content);
      taskPath = filePath;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Apply updates
  Object.assign(task, updates);

  // Write back to the same location
  await fs.writeFile(taskPath, JSON.stringify(task, null, 2), "utf-8");

  return task;
}
