import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_TYPES } from "../constants/task-types.js";
import config from "../config.js";
import * as logger from "./logger.js";
import { emitTaskLog } from "./socket-emitter.js";
import fs from "fs/promises";
import path from "path";

/**
 * Map task type to socket log event
 * @param {string} taskType - The task type
 * @returns {{success: boolean, eventName?: string, error?: string}} Mapping result
 */
export function getLogEventForTaskType(taskType) {
  const eventMap = {
    [TASK_TYPES.CODEBASE_ANALYSIS]: SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS,
    [TASK_TYPES.DOCUMENTATION]: SOCKET_EVENTS.LOG_DOCUMENTATION,
    [TASK_TYPES.DIAGRAMS]: SOCKET_EVENTS.LOG_DIAGRAMS,
    [TASK_TYPES.REQUIREMENTS]: SOCKET_EVENTS.LOG_REQUIREMENTS,
    [TASK_TYPES.BUGS_SECURITY]: SOCKET_EVENTS.LOG_BUGS_SECURITY,
    [TASK_TYPES.TESTING]: SOCKET_EVENTS.LOG_TESTING,
    [TASK_TYPES.APPLY_FIX]: SOCKET_EVENTS.LOG_APPLY_FIX,
    [TASK_TYPES.APPLY_TEST]: SOCKET_EVENTS.LOG_APPLY_TEST,
    // Edit tasks
    [TASK_TYPES.EDIT_DOCUMENTATION]: SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION,
    [TASK_TYPES.EDIT_DIAGRAMS]: SOCKET_EVENTS.LOG_EDIT_DIAGRAMS,
    [TASK_TYPES.EDIT_REQUIREMENTS]: SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS,
    [TASK_TYPES.EDIT_BUGS_SECURITY]: SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY,
    [TASK_TYPES.EDIT_TESTING]: SOCKET_EVENTS.LOG_EDIT_TESTING,
  };

  const event = eventMap[taskType];

  if (!event) {
    return {
      success: false,
      error: `Unknown task type: ${taskType}. Cannot determine log event.`,
    };
  }

  return {
    success: true,
    eventName: event,
  };
}

/**
 * Set up task logger and log files
 * @param {Object} task - The task object
 * @returns {Promise<Object>} Object containing taskLogger, logStream, and logFile path
 */
export async function setupTaskLogger(task) {
  const logDir = path.join(config.paths.targetAnalysis, "logs");
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${task.id}.log`);

  task.logFile = `logs/${task.id}.log`;
  const { writeTask } = await import("../persistence/tasks.js");
  await writeTask(task);

  const fsSync = await import("fs");
  const logStream = fsSync.default.createWriteStream(logFile, { flags: "w" });
  const taskLogger = logger.createLogger([logStream]);

  return { taskLogger, logStream, logFile };
}

/**
 * Log task header information
 * @param {Object} taskLogger - The task logger instance
 * @param {Object} task - The task object
 */
export function logTaskHeader(taskLogger, task) {
  taskLogger.raw("=".repeat(80));
  taskLogger.info(`🚀 STARTING ${task.type.toUpperCase()} TASK`, {
    component: "TaskLogger",
    taskId: task.id,
  });
  taskLogger.info(`📋 Type: ${task.type}`, { component: "TaskLogger" });
  taskLogger.info(`📁 Output: ${task.outputFile}`, {
    component: "TaskLogger",
  });
  taskLogger.info(`🎯 Target: ${config.target.directory}`, {
    component: "TaskLogger",
  });
  taskLogger.raw("=".repeat(80));
  taskLogger.raw("");
}

/**
 * Log task success with metadata
 * @param {Object} taskLogger - The task logger instance
 * @param {Object} task - The task object
 * @param {Object} agent - The agent instance with metadata
 */
export function logTaskSuccess(taskLogger, task, agent) {
  const metadata = agent.getMetadata();
  taskLogger.raw("");
  taskLogger.raw("=".repeat(80));
  taskLogger.info(`🎉 TASK COMPLETED SUCCESSFULLY`, {
    component: "TaskLogger",
    taskId: task.id,
  });
  taskLogger.info(`🔄 Iterations: ${metadata.iterations}`, {
    component: "TaskLogger",
  });
  taskLogger.info(
    `🪙 Tokens: ${metadata.tokenUsage.total.toLocaleString()} (${metadata.tokenUsage.input.toLocaleString()} in / ${metadata.tokenUsage.output.toLocaleString()} out)`,
    { component: "TaskLogger" },
  );
  taskLogger.raw("=".repeat(80));
}

/**
 * Log task error
 * @param {Object} taskLogger - The task logger instance
 * @param {Object} task - The task object
 * @param {Error} error - The error that occurred
 */
export function logTaskError(taskLogger, task, error) {
  taskLogger.raw("");
  taskLogger.raw("=".repeat(80));
  taskLogger.error(`❌ TASK FAILED`, {
    error: error.message,
    stack: error.stack,
    component: "TaskLogger",
    taskId: task.id,
  });
  taskLogger.raw("=".repeat(80));

  emitTaskLog(task, {
    taskId: task.id,
    domainId: task.params?.domainId,
    type: task.type,
    stream: "stderr",
    log: `\n${"=".repeat(80)}\n❌ [FAILED] ${error.message}\n${"=".repeat(80)}\n`,
  });
}
