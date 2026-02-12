import { randomBytes } from "crypto";
import config from "../config.js";
import * as tasksPersistence from "../persistence/tasks.js";
import { executeTask } from "../agents/index.js";

/**
 * Generate a unique task ID
 * @param {string} prefix - Prefix for the task ID
 * @returns {string} Unique task ID
 */
function generateTaskId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const random = randomBytes(3).toString("hex");
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create a full codebase analysis task
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createFullCodebaseAnalysisTask(executeNow = false) {
  const task = {
    id: generateTaskId("analyze-codebase"),
    type: "codebase-analysis",
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      targetDirectory: config.target.directory,
    },
    instructionFile: "backend/instructions/analyze-full-codebase.md",
    outputFile: ".code-analysis/codebase-analysis.json",
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Trigger agent execution asynchronously
    executeTask(task.id).catch((err) => {
      console.error(`Failed to execute task ${task.id}:`, err);
    });
  }

  return task;
}

/**
 * Create a module analysis task
 * @param {string} moduleId - The module ID
 * @param {string} moduleName - The module name
 * @param {string[]} files - Files in the module
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeTask(
  moduleId,
  moduleName,
  files,
  executeNow = false,
) {
  const task = {
    id: generateTaskId("analyze"),
    type: "analyze",
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      moduleId,
      moduleName,
      files,
      targetDirectory: config.target.directory,
    },
    instructionFile: "backend/instructions/analyze-module.md",
    outputFile: `.code-analysis/modules/${moduleId}.json`,
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Trigger agent execution asynchronously
    executeTask(task.id).catch((err) => {
      console.error(`Failed to execute task ${task.id}:`, err);
    });
  }

  return task;
}

/**
 * Get all pending tasks
 * @returns {Promise<Array>} Array of pending tasks
 */
export async function getPendingTasks() {
  return tasksPersistence.listPending();
}

/**
 * Delete a task
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  return tasksPersistence.deleteTask(taskId);
}
