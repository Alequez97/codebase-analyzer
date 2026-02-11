import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";

const execAsync = promisify(exec);

/**
 * Helper function to determine the API key flag for a given model
 * @param {string} model - The model name
 * @param {Object} apiKeys - Object containing API keys
 * @returns {string|null} The API key flag or null
 */
function getApiKeyForModel(model, apiKeys) {
  if (!model) return null;

  // Handle OpenRouter models
  if (model.startsWith("openrouter/")) {
    return apiKeys.openrouter
      ? `--api-key openrouter=${apiKeys.openrouter}`
      : null;
  }

  // Handle specific providers
  const providerMap = {
    deepseek: "deepseek",
    sonnet: "anthropic",
    "claude-3": "anthropic",
    claude: "anthropic",
    gpt: "openai",
    o1: "openai",
    o3: "openai",
  };

  for (const [prefix, provider] of Object.entries(providerMap)) {
    if (model.toLowerCase().includes(prefix)) {
      const apiKey = apiKeys[provider];
      return apiKey ? `--api-key ${provider}=${apiKey}` : null;
    }
  }

  return null;
}

/**
 * Detect if Aider is installed and accessible
 * @returns {Promise<boolean>} True if Aider is available
 */
export async function detect() {
  try {
    const { stdout } = await execAsync("aider --version");
    console.log(`Aider detected: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log("Aider not detected");
    return false;
  }
}

/**
 * Execute a task using Aider
 * @param {Object} task - The task object
 * @returns {Promise<Object>} Execution result
 */
export async function execute(task) {
  const isAvailable = await detect();

  if (!isAvailable) {
    throw new Error("Aider is not installed or not in PATH");
  }

  // Read instruction file
  const instructionPath = path.join(
    config.paths.analyzerRoot,
    task.instructionFile,
  );

  // Build file list for Aider to work with
  const files = task.params.files || [];
  const filesArg = files.length > 0 ? files.map((f) => `"${f}"`).join(" ") : "";

  // Determine API key based on model
  const modelApiKey = getApiKeyForModel(
    config.aider.model,
    config.aider.apiKeys,
  );

  // Build Aider command
  const commandParts = [
    "aider",
    "--yes-always",
    config.aider.model ? `--model ${config.aider.model}` : null,
    modelApiKey ? modelApiKey : null,
    config.aider.extraArgs || null,
    "--message-file",
    `"${instructionPath}"`,
    filesArg,
  ].filter(Boolean);

  const command = commandParts.join(" ");
  console.log(`Executing Aider: ${command}`);

  // Create log directory
  const logDir = path.join(config.paths.targetAnalysis, "logs");
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${task.id}.log`);
  const logStream = await fs.open(logFile, "w");

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    // Import io dynamically to emit events
    import("../index.js")
      .then(({ io }) => {
        const aiderProcess = spawn(command, {
          cwd: config.target.directory,
          shell: true,
        });

        aiderProcess.stdout.on("data", (data) => {
          const text = data.toString();
          stdout += text;

          // Log to file
          logStream.write(text);

          // Emit to socket
          io.emit(SOCKET_EVENTS.TASK_LOG, {
            taskId: task.id,
            type: task.type,
            stream: "stdout",
            data: text,
          });

          console.log(`[Aider] ${text.trim()}`);
        });

        aiderProcess.stderr.on("data", (data) => {
          const text = data.toString();
          stderr += text;

          // Log to file
          logStream.write(`[STDERR] ${text}`);

          // Emit to socket
          io.emit(SOCKET_EVENTS.TASK_LOG, {
            taskId: task.id,
            type: task.type,
            stream: "stderr",
            data: text,
          });

          console.error(`[Aider Error] ${text.trim()}`);
        });

        aiderProcess.on("close", async (code) => {
          await logStream.close();

          const success = code === 0;

          if (success) {
            resolve({
              success: true,
              stdout,
              stderr,
              taskId: task.id,
              logFile,
            });
          } else {
            resolve({
              success: false,
              error: `Aider exited with code ${code}`,
              stdout,
              stderr,
              taskId: task.id,
              logFile,
            });
          }
        });

        aiderProcess.on("error", async (error) => {
          await logStream.close();

          console.error(`Aider execution error for task ${task.id}:`, error);

          resolve({
            success: false,
            error: error.message,
            stdout,
            stderr,
            taskId: task.id,
            logFile,
          });
        });
      })
      .catch(async (err) => {
        await logStream.close();
        console.error("Failed to import io:", err);

        resolve({
          success: false,
          error: "Failed to setup socket streaming",
          taskId: task.id,
          logFile,
        });
      });
  });
}
