import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { tryReadJsonFile } from "./utils.js";
import { TASK_STATUS, TASK_FOLDERS } from "../constants/task-status.js";
import * as logger from "../utils/logger.js";

/**
 * Read a task from any folder (pending, running, completed, or failed)
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
      TASK_FOLDERS.COMPLETED,
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.FAILED,
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
 * @param {string[]} [filters.status] - Array of status values to include (e.g., ['pending', 'running', 'failed'])
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
 * Delete a task from pending, completed, or failed
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

  // First read the task to get log file path
  let task = null;
  const paths = [pendingPath, runningPath, completedPath, failedPath];

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

  // Delete task file (try all locations, including running/)
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
      error: `Task ${taskId} not found in any location`,
    };
  }

  return { success: true };
}
