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

  // Always include the output file so Aider knows to create/edit it
  if (task.outputFile) {
    files.push(task.outputFile);
  }

  const filesArg = files.length > 0 ? files.map((f) => `"${f}"`).join(" ") : "";

  // Determine API key based on model
  const modelApiKey = getApiKeyForModel(
    config.aider.model,
    config.aider.apiKeys,
  );

  // Build Aider command with smart context management
  const commandParts = [
    "aider",
    "--yes-always", // Auto-approve all changes
    "--exit", // Exit after processing message file
    "--no-suggest-shell-commands", // Don't suggest additional shell commands
    "--edit-format whole", // Use whole-file format (better for creating new files)
    "--map-refresh auto", // Auto-refresh repo map
    "--map-tokens 4096", // Use repo map to manage large codebases
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

  // Use createWriteStream for proper streaming writes
  const fsSync = await import("fs");
  const logStream = fsSync.default.createWriteStream(logFile, { flags: "w" });

  // Update task with log file path (relative to .code-analysis/)
  task.logFile = `logs/${task.id}.log`;

  // Import task persistence to save logFile reference
  const { writeTask } = await import("../persistence/tasks.js");
  await writeTask(task);

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

        // Close stdin immediately - we're using --message-file, no interaction needed
        if (aiderProcess.stdin) {
          aiderProcess.stdin.end();
        }

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
          // End the write stream and wait for it to finish
          logStream.end();
          await new Promise((resolveStream) =>
            logStream.on("finish", resolveStream),
          );

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
          // Close the log stream
          logStream.end();
          await new Promise((resolveStream) =>
            logStream.on("finish", resolveStream),
          );

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
        // Close the log stream even on import failure
        logStream.end();
        await new Promise((resolveStream) =>
          logStream.on("finish", resolveStream),
        );

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
