import * as llmApi from "./llm-api.js";
import * as aider from "./aider.js";
import * as tasksPersistence from "../persistence/tasks.js";
import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as domainsPersistence from "../persistence/domains.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import path from "path";
import fs from "fs/promises";
import * as logger from "../utils/logger.js";

/**
 * Available AI agents
 * - llm-api: Direct LLM API calls for generating analysis JSON
 * - aider: AI coding assistant for editing files and writing code
 */
const AGENTS = {
  "llm-api": {
    id: "llm-api",
    name: "LLM API",
    purpose: "Generates analysis JSON files",
    module: llmApi,
  },
  aider: {
    id: "aider",
    name: "Aider",
    purpose: "Edits files and writes code",
    installUrl: "https://aider.chat/docs/install.html",
    module: aider,
  },
};

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
          { component: "AgentOrchestrator", taskId: task.id },
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
        { component: "AgentOrchestrator", taskId: task.id },
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
          { component: "AgentOrchestrator", taskId: task.id },
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

    // Add task metadata to the analysis
    analysis.taskId = task.id;
    analysis.logFile = task.logFile || null;

    // Add analyzedAt if not present
    if (!analysis.analyzedAt && !analysis.timestamp) {
      analysis.analyzedAt = new Date().toISOString();
    }

    // Write back the enhanced analysis
    await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), "utf-8");

    logger.debug(
      `Enhanced ${outputPath} with task metadata (taskId: ${task.id})`,
      { component: "AgentOrchestrator", taskId: task.id },
    );
  } catch (error) {
    // Log error but don't fail the task
    logger.error(`Failed to enhance output with task metadata`, {
      error,
      component: "AgentOrchestrator",
      taskId: task.id,
    });
  }
}

/**
 * Get available agent based on config and detection
 * @returns {Promise<Object>} Agent module with detect() and execute() functions
 */
async function getAgent(agentId) {
  const selectedId = agentId || "aider";
  const agent = AGENTS[selectedId];

  if (!agent) {
    throw new Error(`Unsupported AI agent: ${selectedId}`);
  }

  const available = await agent.module.detect();
  if (!available) {
    throw new Error(`${agent.name} is not available on this machine`);
  }

  return agent.module;
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

  const agent = await getAgent(task.params?.agent);
  const result = await agent.execute(task);

  if (result.success) {
    // Enhance output file with task metadata (taskId, logFile, timestamp)
    await enhanceOutputWithTaskMetadata(task);

    // Move task to completed
    await tasksPersistence.moveToCompleted(taskId);

    // Emit event via socket
    try {
      const { io } = await import("../index.js");
      io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
        taskId,
        type: task.type,
        domainId: task.params?.domainId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to emit socket event", {
        error: err,
        component: "AgentOrchestrator",
        taskId,
      });
      // Don't fail the task if socket emit fails
    }
  }

  return result;
}

/**
 * Detect which agents are available
 * @returns {Promise<Object>} Available agents
 */
export async function detectAvailableAgents() {
  const entries = await Promise.all(
    Object.values(AGENTS).map(async (agent) => [
      agent.id,
      await agent.module.detect(),
    ]),
  );

  return Object.fromEntries(entries);
}

/**
 * Get tools currently supported by backend execution flow
 * @returns {string[]} Supported tool IDs
 */
export function getSupportedAgents() {
  return Object.values(AGENTS).map(({ module, ...agent }) => agent);
}
