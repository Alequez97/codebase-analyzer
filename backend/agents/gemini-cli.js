import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";

const execAsync = promisify(exec);
const GEMINI_COMMAND = process.platform === "win32" ? "gemini.cmd" : "gemini";

function buildPrompt(task, instructionContent) {
  const files = task.params?.files || [];

  return [
    instructionContent.trim(),
    "",
    "Execution context:",
    `- Working directory: ${config.target.directory}`,
    files.length > 0
      ? `- Focus files: ${files.join(", ")}`
      : "- Focus files: analyze based on repository context",
    task.outputFile
      ? `- Required output file: ${task.outputFile} (create/update it as valid JSON).`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function detectCommand(command) {
  try {
    await execAsync(`${command} --version`);
    return true;
  } catch {
    return false;
  }
}

function emitTaskLog(io, task, stream, data) {
  io.emit(SOCKET_EVENTS.TASK_LOG, {
    taskId: task.id,
    type: task.type,
    stream,
    data,
  });
}

export async function detect() {
  const available = await detectCommand(GEMINI_COMMAND);

  if (!available) {
    console.log("Gemini CLI not detected");
  }

  return available;
}

export async function execute(task) {
  const isAvailable = await detect();

  if (!isAvailable) {
    throw new Error("Gemini CLI is not installed or not in PATH");
  }

  const instructionPath = path.join(
    config.paths.analyzerRoot,
    task.instructionFile,
  );
  const instructionContent = await fs.readFile(instructionPath, "utf-8");
  const prompt = buildPrompt(task, instructionContent);
  const args = ["--prompt", prompt, "--output-format", "stream-json"];

  const logDir = path.join(config.paths.targetAnalysis, "logs");
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${task.id}.log`);
  const logStream = await fs.open(logFile, "w");

  // Update task with log file path (relative to .code-analysis/)
  task.logFile = `logs/${task.id}.log`;

  // Import task persistence to save logFile reference
  const { writeTask } = await import("../persistence/tasks.js");
  await writeTask(task);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    import("../index.js")
      .then(({ io }) => {
        emitTaskLog(
          io,
          task,
          "stdout",
          `[gemini] Starting Gemini CLI (${GEMINI_COMMAND})\n`,
        );

        const geminiProcess = spawn(GEMINI_COMMAND, args, {
          cwd: config.target.directory,
          shell: false,
          windowsHide: true,
        });

        emitTaskLog(io, task, "stdout", `[gemini] Prompt dispatched\n`);

        geminiProcess.stdout.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          logStream.write(text);

          emitTaskLog(io, task, "stdout", text);
        });

        geminiProcess.stderr.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          logStream.write(`[STDERR] ${text}`);

          emitTaskLog(io, task, "stderr", text);
        });

        geminiProcess.on("close", async (code) => {
          await logStream.close();

          emitTaskLog(
            io,
            task,
            code === 0 ? "stdout" : "stderr",
            `[gemini] Process exited with code ${code}\n`,
          );

          if (code === 0) {
            resolve({
              success: true,
              stdout,
              stderr,
              taskId: task.id,
              logFile,
            });
            return;
          }

          resolve({
            success: false,
            error: `Gemini CLI exited with code ${code}`,
            stdout,
            stderr,
            taskId: task.id,
            logFile,
          });
        });

        geminiProcess.on("error", async (error) => {
          await logStream.close();

          emitTaskLog(
            io,
            task,
            "stderr",
            `[gemini] Process error: ${error.message}\n`,
          );

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
      .catch(async () => {
        await logStream.close();

        resolve({
          success: false,
          error: "Failed to setup socket streaming",
          taskId: task.id,
          logFile,
        });
      });
  });
}
