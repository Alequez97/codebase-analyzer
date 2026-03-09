import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";
import * as tasksPersistence from "./tasks.js";

function createHttpError(status, error, message) {
  const httpError = new Error(message);
  httpError.status = status;
  httpError.error = error;
  httpError.message = message;
  return httpError;
}

function normalizeLogFilePath(relativeLogFile) {
  if (typeof relativeLogFile !== "string" || !relativeLogFile.trim()) {
    return null;
  }

  const normalizedRelative = path
    .normalize(relativeLogFile)
    .replace(/\\/g, "/");
  if (
    path.isAbsolute(relativeLogFile) ||
    normalizedRelative.startsWith("../") ||
    normalizedRelative.includes("/../")
  ) {
    return null;
  }

  const absolutePath = path.resolve(
    config.paths.targetAnalysis,
    normalizedRelative,
  );
  const analysisRoot = path.resolve(config.paths.targetAnalysis);
  const isWithinAnalysisRoot =
    absolutePath === analysisRoot ||
    absolutePath.startsWith(`${analysisRoot}${path.sep}`);

  if (!isWithinAnalysisRoot) {
    return null;
  }

  return {
    normalizedRelative,
    absolutePath,
  };
}

async function readLogContent(logFile) {
  const normalizedPath = normalizeLogFilePath(logFile);
  if (!normalizedPath) {
    throw createHttpError(
      400,
      "Invalid log file path",
      `Invalid log file path: ${logFile}`,
    );
  }

  try {
    const content = await fs.readFile(normalizedPath.absolutePath, "utf-8");
    return {
      content,
      logFile: normalizedPath.normalizedRelative,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createHttpError(
        404,
        "Log file not found",
        `Log file not found: ${normalizedPath.normalizedRelative}`,
      );
    }

    throw error;
  }
}

export async function readCodebaseAnalysisLogs() {
  const empty = {
    taskId: null,
    logFile: null,
    content: "",
    source: "codebase-analysis",
  };

  const metadataPath = path.join(
    config.paths.targetAnalysis,
    "analysis",
    "metadata.json",
  );

  let metadata = null;
  try {
    metadata = await tryReadJsonFile(
      metadataPath,
      "codebase-analysis metadata",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (!metadata?.revisions?.length) {
    return empty;
  }

  const lastRevision = metadata.revisions[metadata.revisions.length - 1];
  const taskId = lastRevision?.taskId;
  if (!taskId) {
    return empty;
  }

  const task = await tasksPersistence.readTask(taskId);
  if (!task?.logFile) {
    return { ...empty, taskId };
  }

  const logResult = await readLogContent(task.logFile);
  return {
    taskId,
    logFile: logResult.logFile,
    content: logResult.content,
    source: "codebase-analysis",
  };
}

export async function readTaskLogs(taskId) {
  const task = await tasksPersistence.readTask(taskId);
  if (!task) {
    throw createHttpError(
      404,
      "Task not found",
      `No task found with ID: ${taskId}`,
    );
  }

  if (!task.logFile) {
    // Return empty content instead of 404 - task exists but not executed yet
    return {
      taskId,
      logFile: null,
      content: "",
      taskType: task.type,
      taskStatus: task.status,
    };
  }

  const logResult = await readLogContent(task.logFile);
  return {
    taskId,
    logFile: logResult.logFile,
    content: logResult.content,
    taskType: task.type,
    taskStatus: task.status,
  };
}
