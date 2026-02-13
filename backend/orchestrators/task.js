import { randomBytes } from "crypto";
import config from "../config.js";
import * as tasksPersistence from "../persistence/tasks.js";
import { executeTask } from "../agents/index.js";
import * as logger from "../utils/logger.js";

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
export async function createFullCodebaseAnalysisTask(executeNow, agent) {
  const task = {
    id: generateTaskId("analyze-codebase"),
    type: "codebase-analysis",
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      agent,
      targetDirectory: config.target.directory,
    },
    instructionFile: "backend/instructions/analyze-full-codebase.md",
    outputFile: ".code-analysis/analysis/codebase-analysis.json",
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Trigger agent execution asynchronously
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskOrchestrator",
      });
    });
  }

  return task;
}

/**
 * Create a domain analysis task
 * @param {string} domainId - The domain ID
 * @param {string} domainName - The domain name
 * @param {string[]} files - Files in the domain
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeTask(
  domainId,
  domainName,
  files,
  executeNow,
  agent,
) {
  const task = {
    id: generateTaskId("analyze"),
    type: "analyze",
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      agent,
      domainId,
      domainName,
      files,
      targetDirectory: config.target.directory,
    },
    instructionFile: "backend/instructions/analyze-domain.md",
    outputFile: `.code-analysis/domains/${domainId}.json`,
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Trigger agent execution asynchronously
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskOrchestrator",
      });
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
 * Get a specific task by ID
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTask(taskId) {
  return tasksPersistence.readTask(taskId);
}

/**
 * Delete a task
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  return tasksPersistence.deleteTask(taskId);
}
