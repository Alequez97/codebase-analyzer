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
    [TASK_TYPES.REFACTORING_AND_TESTING]:
      SOCKET_EVENTS.LOG_REFACTORING_AND_TESTING,
    [TASK_TYPES.IMPLEMENT_FIX]: SOCKET_EVENTS.LOG_IMPLEMENT_FIX,
    [TASK_TYPES.IMPLEMENT_TEST]: SOCKET_EVENTS.LOG_IMPLEMENT_TEST,
    [TASK_TYPES.APPLY_REFACTORING]: SOCKET_EVENTS.LOG_APPLY_REFACTORING,
    // Edit tasks
    [TASK_TYPES.EDIT_DOCUMENTATION]: SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION,
    [TASK_TYPES.EDIT_DIAGRAMS]: SOCKET_EVENTS.LOG_EDIT_DIAGRAMS,
    [TASK_TYPES.EDIT_REQUIREMENTS]: SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS,
    [TASK_TYPES.EDIT_BUGS_SECURITY]: SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY,
    [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]:
      SOCKET_EVENTS.LOG_EDIT_REFACTORING_AND_TESTING,
    // Custom codebase task (floating agent chat)
    [TASK_TYPES.CUSTOM_CODEBASE_TASK]: SOCKET_EVENTS.LOG_CUSTOM_CODEBASE_TASK,
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
  const agentConfig = task.agentConfig || {};
  taskLogger.raw("=".repeat(80));
  taskLogger.info(`🚀 STARTING ${task.type.toUpperCase()} TASK`, {
    component: "TaskLogger",
    taskId: task.id,
  });
  taskLogger.info(`📋 Type:              ${task.type}`, {
    component: "TaskLogger",
  });
  taskLogger.info(`🤖 Agent:             ${agentConfig.agent || "unknown"}`, {
    component: "TaskLogger",
  });
  taskLogger.info(`🧠 Model:             ${agentConfig.model || "unknown"}`, {
    component: "TaskLogger",
  });
  if (agentConfig.reasoningEffort) {
    taskLogger.info(`💭 Reasoning effort:  ${agentConfig.reasoningEffort}`, {
      component: "TaskLogger",
    });
  }
  taskLogger.info(
    `🔢 Max tokens:        ${agentConfig.maxTokens ?? "default"}`,
    { component: "TaskLogger" },
  );
  taskLogger.info(
    `🔁 Max iterations:    ${agentConfig.maxIterations ?? "default"}`,
    { component: "TaskLogger" },
  );
  if (task.params?.domainId) {
    taskLogger.info(`🗂️  Domain:            ${task.params.domainId}`, {
      component: "TaskLogger",
    });
  }
  if (Array.isArray(task.params?.files) && task.params.files.length > 0) {
    taskLogger.info(
      `📄 Files (${task.params.files.length}):        ${task.params.files.join(", ")}`,
      { component: "TaskLogger" },
    );
  }
  taskLogger.info(`📁 Output:            ${task.outputFile}`, {
    component: "TaskLogger",
  });
  taskLogger.info(`🎯 Target:            ${config.target.directory}`, {
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
