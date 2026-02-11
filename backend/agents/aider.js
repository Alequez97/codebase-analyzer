import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";

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
  const instructionPath = path.join(config.paths.root, task.instructionFile);
  const instruction = await fs.readFile(instructionPath, "utf-8");

  // Build file list for Aider to work with
  const files = task.params.files || [];
  const filesArg = files
    .map((f) => `"${path.join(task.params.codebasePath, f)}"`)
    .join(" ");

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

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: task.params.codebasePath,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      success: true,
      stdout,
      stderr,
      taskId: task.id,
    };
  } catch (error) {
    console.error(`Aider execution failed for task ${task.id}:`, error);

    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      taskId: task.id,
    };
  }
}
