import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import * as tasksPersistence from "../persistence/tasks.js";
import { getAgent } from "../agents/index.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { TASK_TYPES } from "../constants/task-types.js";
import { TASK_STATUS } from "../constants/task-status.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";

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
 * Post-process analysis output files to add task metadata
 * @param {Object} task - The task object
 */
async function enhanceOutputWithTaskMetadata(task) {
  if (!task.outputFile) {
    return;
  }

  // Skip enhancement for documentation tasks - they output .md files, not JSON
  // Documentation metadata is generated programatically in the orchestrator
  if (task.type === TASK_TYPES.DOCUMENTATION) {
    return;
  }

  try {
    // Read the output file that was just created by the agent
    const outputPath = path.isAbsolute(task.outputFile)
      ? task.outputFile
      : path.join(config.target.directory, task.outputFile);
    const shouldGenerateMetadata = task.generateMetadata === true;
    const metadataOutputPath = path.join(
      path.dirname(outputPath),
      PERSISTENCE_FILES.METADATA_JSON,
    );
    const usesSeparateMetadataFile = metadataOutputPath !== outputPath;
    let content;
    let analysis;

    try {
      content = await fs.readFile(outputPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        logger.debug(
          `Output file ${outputPath} does not exist, creating minimal metadata file`,
          { component: "TaskOrchestrator", taskId: task.id },
        );
        content = "";
      } else {
        throw error;
      }
    }

    // Handle empty or invalid files - create minimal structure with taskId
    if (!content || content.trim() === "") {
      logger.debug(
        `Output file ${outputPath} is empty, creating minimal metadata structure`,
        { component: "TaskOrchestrator", taskId: task.id },
      );
      analysis = {
        taskId: task.id,
        logFile: task.logFile || null,
        status: "incomplete",
        message: "Agent did not write analysis output. Check logs for details.",
        analyzedAt: new Date().toISOString(),
      };
    } else {
      try {
        analysis = JSON.parse(content);
      } catch {
        logger.debug(
          `Output file ${outputPath} contains invalid JSON, creating minimal metadata structure`,
          { component: "TaskOrchestrator", taskId: task.id },
        );
        analysis = {
          taskId: task.id,
          logFile: task.logFile || null,
          status: "invalid",
          message: "Agent wrote invalid JSON output. Check logs for details.",
          rawContent: content.substring(0, 500), // Include first 500 chars for debugging
          analyzedAt: new Date().toISOString(),
        };
      }
    }

    const analyzedAt = new Date().toISOString();
    const existingMetadata =
      analysis &&
      typeof analysis === "object" &&
      !Array.isArray(analysis) &&
      analysis.metadata &&
      typeof analysis.metadata === "object"
        ? { ...analysis.metadata }
        : {};

    if (
      shouldGenerateMetadata &&
      usesSeparateMetadataFile &&
      analysis &&
      typeof analysis === "object" &&
      !Array.isArray(analysis)
    ) {
      delete analysis.metadata;
    }

    // Auto-calculate summary for bugs-security analysis if findings exist
    if (
      task.type === TASK_TYPES.BUGS_SECURITY &&
      analysis.findings &&
      Array.isArray(analysis.findings)
    ) {
      const summary = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: analysis.findings.length,
      };

      analysis.findings.forEach((finding) => {
        const severity = finding.severity?.toLowerCase();
        if (severity === "critical") summary.critical++;
        else if (severity === "high") summary.high++;
        else if (severity === "medium") summary.medium++;
        else if (severity === "low") summary.low++;
      });

      analysis.summary = summary;
    }

    // Write back enhanced analysis content
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), "utf-8");

    if (shouldGenerateMetadata && usesSeparateMetadataFile) {
      const taskMetadata = {
        ...existingMetadata,
        taskId: task.id,
        logFile: task.logFile || null,
        analyzedAt,
        status: TASK_STATUS.COMPLETED,
      };

      await fs.mkdir(path.dirname(metadataOutputPath), { recursive: true });
      await fs.writeFile(
        metadataOutputPath,
        JSON.stringify(taskMetadata, null, 2),
        "utf-8",
      );
    } else if (
      shouldGenerateMetadata &&
      analysis &&
      typeof analysis === "object" &&
      !Array.isArray(analysis)
    ) {
      const taskMetadata = {
        ...existingMetadata,
        taskId: task.id,
        logFile: task.logFile || null,
        analyzedAt,
        status: TASK_STATUS.COMPLETED,
      };

      analysis.metadata = taskMetadata;
      await fs.writeFile(
        outputPath,
        JSON.stringify(analysis, null, 2),
        "utf-8",
      );
    }

    logger.debug(
      `Enhanced ${outputPath} with task metadata (taskId: ${task.id})`,
      { component: "TaskOrchestrator", taskId: task.id },
    );
  } catch (error) {
    // Log error but don't fail the task
    logger.error(`Failed to enhance output with task metadata`, {
      error,
      component: "TaskOrchestrator",
      taskId: task.id,
    });
  }
}

/**
 * Execute a task using the configured agent
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Execution result
 */
export async function executeTask(taskId) {
  const task = await tasksPersistence.readTask(taskId);

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found`,
      taskId,
    };
  }

  if (task.status !== TASK_STATUS.PENDING) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: `Task ${taskId} is not pending (status: ${task.status})`,
      taskId,
    };
  }

  let result;
  try {
    const agentResult = await getAgent(task.agentConfig?.agent);
    if (!agentResult.success) {
      const selectionError = agentResult.error || "Agent selection failed";

      await tasksPersistence.moveToFailed(taskId, selectionError);

      emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
        taskId,
        type: task.type,
        domainId: task.params?.domainId,
        error: selectionError,
        code: agentResult.code,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        code: agentResult.code,
        error: selectionError,
        taskId,
        logFile: task.logFile,
      };
    }

    result = await agentResult.agent.execute(task);
  } catch (error) {
    const executionError = error?.message || "Task execution failed";

    await tasksPersistence.moveToFailed(taskId, executionError);

    emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      error: executionError,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: executionError,
      taskId,
      logFile: task.logFile,
    };
  }

  if (result.success) {
    // Enhance output file with task metadata (taskId, logFile, timestamp)
    await enhanceOutputWithTaskMetadata(task);

    // Move task to completed
    await tasksPersistence.moveToCompleted(taskId);

    // Emit event via socket
    emitSocketEvent(SOCKET_EVENTS.TASK_COMPLETED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Task failed - move to failed directory
    await tasksPersistence.moveToFailed(
      taskId,
      result.error || "Task execution failed",
    );

    // Emit failure event
    emitSocketEvent(SOCKET_EVENTS.TASK_FAILED, {
      taskId,
      type: task.type,
      domainId: task.params?.domainId,
      error: result.error || "Task execution failed",
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Delete a task
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  const result = await tasksPersistence.deleteTask(taskId);

  if (!result.success) {
    return result;
  }

  return { success: true };
}

/**
 * Restart all pending tasks (called on server startup)
 * @returns {Promise<Object>} Result with count of restarted tasks
 */
export async function restartPendingTasks() {
  try {
    const pendingTasks = await getPendingTasks();

    if (pendingTasks.length === 0) {
      logger.info("No pending tasks to restart", {
        component: "TaskOrchestrator",
      });
      return { restarted: 0, tasks: [] };
    }

    logger.info(`Restarting ${pendingTasks.length} pending task(s)`, {
      component: "TaskOrchestrator",
    });

    const restartedTasks = [];

    for (const task of pendingTasks) {
      try {
        logger.info(`Restarting task: ${task.id} (type: ${task.type})`, {
          component: "TaskOrchestrator",
        });

        // Execute task asynchronously
        executeTask(task.id)
          .then((executionResult) => {
            if (!executionResult.success) {
              logger.error(`Failed to restart task ${task.id}`, {
                error: executionResult.error,
                component: "TaskOrchestrator",
              });
            }
          })
          .catch((err) => {
            logger.error(`Failed to restart task ${task.id}`, {
              error: err,
              component: "TaskOrchestrator",
            });
          });

        restartedTasks.push(task.id);
      } catch (error) {
        logger.error(`Error restarting task ${task.id}`, {
          error,
          component: "TaskOrchestrator",
        });
      }
    }

    logger.info(`Successfully restarted ${restartedTasks.length} task(s)`, {
      component: "TaskOrchestrator",
    });

    return {
      restarted: restartedTasks.length,
      tasks: restartedTasks,
    };
  } catch (error) {
    logger.error("Failed to restart pending tasks", {
      error,
      component: "TaskOrchestrator",
    });
    return { restarted: 0, tasks: [], error: error.message };
  }
}
