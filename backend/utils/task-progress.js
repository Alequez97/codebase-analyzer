import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import * as logger from "./logger.js";

/**
 * Get the relative path (from project root) for a task's progress file.
 * Uses .code-analysis/temp/ so the LLM agent can write to it (only .code-analysis/ is writable).
 * These files are temporary — only needed during task execution, deleted on completion.
 * @param {string} taskId
 * @returns {string}
 */
export function getProgressFileRelativePath(taskId) {
  return `${PERSISTENCE_FILES.ANALYSIS_ROOT_DIR}/temp/progress/${taskId}.md`;
}

/**
 * Get the absolute file path for a task's progress file.
 * @param {string} taskId
 * @returns {string}
 */
export function getProgressFilePath(taskId) {
  return path.join(
    config.paths.targetAnalysis,
    "temp",
    "progress",
    `${taskId}.md`,
  );
}

/**
 * Ensure the progress directory exists so the model can write its own progress file
 * @param {string} taskId
 * @returns {Promise<string>} The file path the model should write to
 */
export async function ensureProgressDirectory(taskId) {
  const filePath = getProgressFilePath(taskId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  logger.debug(`Progress directory ready for task ${taskId}`, {
    component: "TaskProgress",
    filePath,
  });

  return filePath;
}

/**
 * Delete the progress file for a task (cleanup after completion)
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export async function deleteProgressFile(taskId) {
  const filePath = getProgressFilePath(taskId);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.warn(`Failed to delete progress file for task ${taskId}`, {
        component: "TaskProgress",
        error: error.message,
      });
    }
  }
}

/**
 * Read the progress file for a task
 * @param {string} taskId
 * @returns {Promise<string|null>}
 */
export async function readProgressFile(taskId) {
  const filePath = getProgressFilePath(taskId);

  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Append a note to the progress file
 * @param {string} taskId
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function appendProgressNote(taskId, note) {
  const filePath = getProgressFilePath(taskId);
  const timestamp = new Date().toISOString();

  try {
    await fs.appendFile(filePath, `\n[${timestamp}] ${note}\n`, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    logger.warn(`Progress file not found for task ${taskId}, skipping note`, {
      component: "TaskProgress",
    });
  }
}

/**
 * Mark progress file as complete
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export async function markProgressComplete(taskId) {
  const filePath = getProgressFilePath(taskId);
  const timestamp = new Date().toISOString();

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const updated = content.replace(
      "Status: in-progress",
      `Status: completed\nCompleted: ${timestamp}`,
    );
    await fs.writeFile(filePath, updated, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
