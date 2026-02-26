import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { emitTaskLog } from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";
import { loadInstructionForTask } from "../utils/instruction-loader.js";
import { getProviderFromModel } from "../utils/model-utils.js";
import { getApiKeyForProvider } from "../utils/api-keys.js";
import { createLineBufferedStream } from "../utils/line-buffered-stream.js";

const execAsync = promisify(exec);
const shouldMirrorAiderStreamLogs = process.env.AIDER_STREAM_LOGS === "true";

/**
 * Detect if Aider is installed and accessible
 * @returns {Promise<boolean>} True if Aider is available
 */
export async function detect() {
  try {
    const { stdout } = await execAsync("aider --version");
    logger.debug(`Aider detected: ${stdout.trim()}`, { component: "Aider" });
    return true;
  } catch {
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

  // Load and process instruction template
  const instructionContent = await loadInstructionForTask(task);

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

  // Determine API key flag based on model
  const provider = getProviderFromModel(task.agentConfig.model);
  const apiKey = provider
    ? getApiKeyForProvider(provider, config.apiKeys)
    : null;
  const apiKeyFlag =
    apiKey && provider ? `--api-key ${provider}=${apiKey}` : null;

  // Build Aider command with smart context management
  const commandParts = [
    "aider",
    "--yes-always", // Auto-approve all changes
    "--exit", // Exit after processing message file
    "--no-auto-commits", // Never create git commits automatically
    "--no-suggest-shell-commands", // Don't suggest additional shell commands
    "--edit-format whole", // Use whole-file format (better for creating new files)
    "--map-refresh auto", // Auto-refresh repo map
    "--map-tokens 4096", // Use repo map to manage large codebases
    task.agentConfig.model ? `--model ${task.agentConfig.model}` : null,
    apiKeyFlag,
    "--message-file",
    `"${tempInstructionPath}"`,
    filesArg,
  ].filter(Boolean);

  const command = commandParts.join(" ");

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
    const stdoutLineBuffer = createLineBufferedStream((line) => {
      if (shouldMirrorAiderStreamLogs) {
        logger.info(line);
      }
    });
    const stderrLineBuffer = createLineBufferedStream((line) => {
      logger.error(line);
    });

    const startupTime = new Date().toISOString();
    const startupBanner = `\n${"=".repeat(80)}\n🚀 [AGENT STARTING] Aider is preparing task ${task.id}\n📌 Type: ${task.type}\n📂 Domain: ${task.params?.domainId || "n/a"}\n🕒 ${startupTime}\n${"=".repeat(80)}\n`;

    logStream.write(startupBanner);
    emitTaskLog(task, {
      taskId: task.id,
      domainId: task.params?.domainId,
      type: task.type,
      stream: "stdout",
      log: startupBanner,
    });

    const aiderProcess = spawn(command, {
      cwd: config.target.directory,
      shell: true,
    });

    const startedBanner = `✅ [AGENT STARTED] Aider process launched (pid: ${aiderProcess.pid || "unknown"})\n`;
    logStream.write(startedBanner);
    emitTaskLog(task, {
      taskId: task.id,
      domainId: task.params?.domainId,
      type: task.type,
      stream: "stdout",
      log: startedBanner,
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

      stdoutLineBuffer.push(text);
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

      stderrLineBuffer.push(text);
    });

    aiderProcess.on("close", async (code) => {
      stdoutLineBuffer.flush();
      stderrLineBuffer.flush();

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
