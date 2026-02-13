import * as aider from "./aider.js";
import * as geminiCli from "./gemini-cli.js";
import * as tasksPersistence from "../persistence/tasks.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";

const AGENTS = {
  aider: {
    id: "aider",
    name: "Aider",
    installUrl: "https://aider.chat/docs/install.html",
    module: aider,
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    installUrl: "https://geminicli.com/docs/get-started/installation",
    module: geminiCli,
  },
};

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
    // Move task to completed
    await tasksPersistence.moveToCompleted(taskId);

    // Emit event via socket
    try {
      const { io } = await import("../index.js");
      io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
        taskId,
        type: task.type,
        moduleId: task.params?.moduleId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to emit socket event:", err);
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
