import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

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
      "pending",
      `${taskId}.json`,
    ),
    path.join(
      config.paths.targetAnalysis,
      "tasks",
      "completed",
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
    "pending",
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
    const tasksDir = path.join(config.paths.targetAnalysis, "tasks", "pending");
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
    "pending",
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    "completed",
    `${taskId}.json`,
  );

  const content = await fs.readFile(pendingPath, "utf-8");
  const task = JSON.parse(content);
  task.status = "completed";
  task.completedAt = new Date().toISOString();

  await fs.writeFile(completedPath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(pendingPath);

  return task;
}

/**
 * Delete a task from pending or completed
 * Also deletes associated log file if it exists
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  const pendingPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    "pending",
    `${taskId}.json`,
  );
  const completedPath = path.join(
    config.paths.targetAnalysis,
    "tasks",
    "completed",
    `${taskId}.json`,
  );

  // First read the task to get log file path
  let task = null;
  try {
    const content = await fs.readFile(pendingPath, "utf-8");
    task = JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        const content = await fs.readFile(completedPath, "utf-8");
        task = JSON.parse(content);
      } catch (err) {
        // Task doesn't exist anywhere
      }
    }
  }

  // Delete log file if it exists
  if (task && task.logFile) {
    const logPath = path.join(config.paths.targetAnalysis, task.logFile);
    try {
      await fs.unlink(logPath);
      console.log(`Deleted log file: ${task.logFile}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Failed to delete log file ${task.logFile}:`, error);
      }
    }
  }

  // Delete task file
  try {
    await fs.unlink(pendingPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    // Try completed
    await fs.unlink(completedPath);
  }
}
