import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { tryReadJsonFile } from "./utils.js";
import { TASK_STATUS, TASK_FOLDERS } from "../constants/task-status.js";
import * as logger from "../utils/logger.js";

/**
 * Read a task from pending or completed
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
 * Write task to pending directory
 * @param {Object} task - The task object
 */
export async function writeTask(task) {
  const filePath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${task.id}.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(task, null, 2), "utf-8");
}

/**
 * List all pending tasks
 * @returns {Promise<Object[]>} Array of pending task objects
 */
export async function listPending() {
  try {
    const tasksDir = path.join(
      config.paths.targetAnalysis,
      "tasks",
      TASK_FOLDERS.PENDING,
    );
    const files = await fs.readdir(tasksDir);

    const tasks = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (file) => {
          const content = await fs.readFile(path.join(tasksDir, file), "utf-8");
          return JSON.parse(content);
        }),
    );

    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Move task from pending to completed
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The completed task
 */
export async function moveToCompleted(taskId) {
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.PENDING,
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    TASK_FOLDERS.COMPLETED,
    `${taskId}.json`,
  );

  const content = await fs.readFile(pendingPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.COMPLETED;
  task.completedAt = new Date().toISOString();

  await fs.writeFile(completedPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(pendingPath);

  return task;
}

/**
 * Move task from pending to failed
 * @param {string} taskId - The task ID
 * @param {string} error - Error message
 * @returns {Promise<Object>} The failed task
 */
export async function moveToFailed(taskId, error) {
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

  // Ensure failed directory exists
  const failedDir = path.dirname(failedPath);
  await fs.mkdir(failedDir, { recursive: true });

  const content = await fs.readFile(pendingPath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.FAILED;
  task.failedAt = new Date().toISOString();
  task.error = error || "Task execution failed";

  await fs.writeFile(failedPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(pendingPath);

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
  const paths = [pendingPath, completedPath, failedPath];

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

  // Delete task file (try all locations)
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
