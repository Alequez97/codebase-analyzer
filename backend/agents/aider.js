import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { emitTaskLog } from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";

const execAsync = promisify(exec);

/**
 * Replace template variables in instruction content
 * @param {string} content - The instruction content with template variables
 * @param {Object} task - The task object containing parameters
 * @returns {string} Content with replaced variables
 */
function replaceTemplateVariables(content, task) {
  const { params } = task;

  // Get domain name from codebase analysis if available
  let domainName = params.domainId || "Unknown Domain";

  // Create a map of variables to replace
  const variables = {
    CODEBASE_PATH: params.targetDirectory || config.target.directory,
    DOMAIN_ID: params.domainId || "",
    DOMAIN_NAME: domainName,
    FILES: params.files || [],
    USER_CONTEXT: params.userContext || "",
  };

  // Replace simple {{VARIABLE}} patterns
  let result = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });

  // Replace {{#if VARIABLE}} blocks
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, varName, blockContent) => {
      const value = variables[varName];
      // Only include block if variable exists and is not empty
      if (value && (typeof value !== "string" || value.trim() !== "")) {
        return blockContent.replace(/\{\{(\w+)\}\}/g, (m, v) => {
          return variables[v] !== undefined ? variables[v] : m;
        });
      }
      return "";
    },
  );

  // Replace {{#each FILES}} blocks
  result = result.replace(
    /\{\{#each FILES\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, itemTemplate) => {
      const files = variables.FILES || [];
      return files
        .map((file) => {
          return itemTemplate.replace(/\{\{this\}\}/g, file);
        })
        .join("\n");
    },
  );

  return result;
}

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
    logger.debug(`Aider detected: ${stdout.trim()}`, { component: "Aider" });
    return true;
  } catch (error) {
    logger.debug("Aider not detected", { component: "Aider" });
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

  let instructionContent = await fs.readFile(instructionPath, "utf-8");

  // Replace template variables in the instruction
  instructionContent = replaceTemplateVariables(instructionContent, task);

  // Create a temporary instruction file with replaced variables
  const tempInstructionPath = path.join(
    config.paths.targetAnalysis,
    "temp",
    `instruction-${task.id}.md`,
  );
  await fs.mkdir(path.dirname(tempInstructionPath), { recursive: true });
  await fs.writeFile(tempInstructionPath, instructionContent, "utf-8");

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
    `"${tempInstructionPath}"`,
    filesArg,
  ].filter(Boolean);

  const command = commandParts.join(" ");
  logger.info(`Executing Aider: ${command}`, {
    component: "Aider",
    taskId: task.id,
  });

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

      // Emit to socket with task-specific event
      emitTaskLog(task, {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stdout",
        log: text,
      });

      logger.debug(`${text.trim()}`, {
        component: "Aider",
        taskId: task.id,
      });
    });

    aiderProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;

      // Log to file
      logStream.write(`[STDERR] ${text}`);

      // Emit to socket with task-specific event
      emitTaskLog(task, {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stderr",
        log: text,
      });

      logger.error(`${text.trim()}`, {
        component: "Aider",
        taskId: task.id,
        stream: "stderr",
      });
    });

    aiderProcess.on("close", async (code) => {
      // End the write stream and wait for it to finish
      logStream.end();
      await new Promise((resolveStream) =>
        logStream.on("finish", resolveStream),
      );

      // Clean up temporary instruction file
      try {
        await fs.unlink(tempInstructionPath);
      } catch (err) {
        // Ignore cleanup errors
        logger.debug(
          `Failed to cleanup temp instruction file: ${err.message}`,
          {
            component: "Aider",
          },
        );
      }

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

      // Clean up temporary instruction file
      try {
        await fs.unlink(tempInstructionPath);
      } catch (err) {
        // Ignore cleanup errors
        logger.debug(
          `Failed to cleanup temp instruction file: ${err.message}`,
          {
            component: "Aider",
          },
        );
      }

      logger.error(`Aider execution error for task ${task.id}`, {
        error,
        component: "Aider",
        taskId: task.id,
      });

      resolve({
        success: false,
        error: error.message,
        stdout,
        stderr,
        taskId: task.id,
        logFile,
      });
    });
  });
}
