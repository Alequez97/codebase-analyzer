import { randomBytes } from "crypto";
import fs from "fs/promises";
import config from "../config.js";
import * as tasksPersistence from "../persistence/tasks.js";
import { getAgent, getAgentConfig } from "../agents/index.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_TYPES } from "../constants/task-types.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
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
export async function createFullCodebaseAnalysisTask(executeNow) {
  const agentConfig = getAgentConfig(TASK_TYPES.CODEBASE_ANALYSIS);

  const task = {
    id: generateTaskId("analyze-codebase"),
    type: TASK_TYPES.CODEBASE_ANALYSIS,
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      targetDirectory: config.target.directory,
    },
    agentConfig,
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
 * Create a domain documentation analysis task
 * @param {string} domainId - The domain ID
 * @param {string[]} files - Files in the domain
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeDocumentationTask(
  domainId,
  files,
  executeNow,
) {
  const agentConfig = getAgentConfig(TASK_TYPES.DOCUMENTATION);

  const task = {
    id: generateTaskId("analyze-documentation"),
    type: TASK_TYPES.DOCUMENTATION,
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-domain-documentation.md",
    outputFile: `.code-analysis/domains/${domainId}/documentation.json`,
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
 * Create a domain requirements analysis task
 * @param {string} domainId - The domain ID
 * @param {string[]} files - Files in the domain
 * @param {string} userContext - Optional user-provided context
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeRequirementsTask(
  domainId,
  files,
  userContext,
  includeDocumentation,
  executeNow,
) {
  const agentConfig = getAgentConfig(TASK_TYPES.REQUIREMENTS);

  const task = {
    id: generateTaskId("analyze-requirements"),
    type: TASK_TYPES.REQUIREMENTS,
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      userContext: userContext || "",
      includeDocumentation: includeDocumentation === true,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-domain-requirements.md",
    outputFile: `.code-analysis/domains/${domainId}/requirements.json`,
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
 * Create a domain bugs & security analysis task
 * @param {string} domainId - The domain ID
 * @param {string[]} files - Files in the domain
 * @param {boolean} includeRequirements - Whether to include requirements in analysis
 * @param {boolean} executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createAnalyzeBugsSecurityTask(
  domainId,
  files,
  includeRequirements,
  executeNow,
) {
  const agentConfig = getAgentConfig(TASK_TYPES.BUGS_SECURITY);

  const task = {
    id: generateTaskId("analyze-bugs-security"),
    type: TASK_TYPES.BUGS_SECURITY,
    status: "pending",
    createdAt: new Date().toISOString(),
    params: {
      domainId,
      files,
      includeRequirements: !!includeRequirements,
      targetDirectory: config.target.directory,
    },
    agentConfig,
    instructionFile: "backend/instructions/analyze-domain-bugs-security.md",
    outputFile: `.code-analysis/domains/${domainId}/bugs-security.json`,
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
 * Post-process analysis output files to add task metadata
 * @param {Object} task - The task object
 */
async function enhanceOutputWithTaskMetadata(task) {
  if (!task.outputFile) {
    return;
  }

  try {
    // Read the output file that was just created by the agent
    const outputPath = task.outputFile;
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
      } catch (parseError) {
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

    if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
      const metadata =
        analysis.metadata && typeof analysis.metadata === "object"
          ? { ...analysis.metadata }
          : {};

      if (!metadata.logFile) {
        metadata.logFile = task.logFile || null;
      }

      if (!metadata.taskId) {
        metadata.taskId = task.id;
      }

      analysis.metadata = metadata;
    }

    // Add task metadata to the analysis
    analysis.taskId = task.id;
    analysis.logFile = task.logFile || null;

    // Add analyzedAt if not present
    if (!analysis.analyzedAt && !analysis.timestamp) {
      analysis.analyzedAt = new Date().toISOString();
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

    // Write back the enhanced analysis
    await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), "utf-8");

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
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status !== "pending") {
    throw new Error(`Task ${taskId} is not pending (status: ${task.status})`);
  }

  const agent = await getAgent(task.agentConfig?.agent);
  const result = await agent.execute(task);

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
    // Task failed - emit failure event
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
  return tasksPersistence.deleteTask(taskId);
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
        executeTask(task.id).catch((err) => {
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
