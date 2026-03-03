import { spawn } from "child_process";
import * as logger from "../../utils/logger.js";

/**
 * Default timeout for command execution (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Maximum output length returned to the LLM (characters)
 */
const MAX_OUTPUT_LENGTH = 8_000;

/**
 * Prefixes of commands that are safe to execute.
 * Only test-runner-style commands are permitted.
 */
const SAFE_COMMAND_PREFIXES = [
  "npm test",
  "npm run test",
  "npx jest",
  "npx vitest",
  "npx mocha",
  "npx jasmine",
  "yarn test",
  "yarn run test",
  "pnpm test",
  "pnpm run test",
  "pytest",
  "python -m pytest",
  "python3 -m pytest",
  "go test",
  "cargo test",
  "dotnet test",
  "mvn test",
  "gradle test",
  "rake test",
  "bundle exec rspec",
  "php artisan test",
  "vendor/bin/phpunit",
];

/**
 * Tool definitions for LLM — command execution
 */
export const COMMAND_TOOLS = [
  {
    name: "execute_command",
    description:
      "Execute a test command in the project root directory. Use this AFTER writing a test file to verify the tests pass. Only test-runner commands are allowed (e.g., 'npm test', 'npx jest path/to/test.js', 'pytest tests/test_foo.py'). Do NOT use this for arbitrary shell commands.",
    parameters: {
      command: {
        type: "string",
        description:
          "The test command to run in the project root (e.g. 'npx jest src/auth/login.test.js --no-coverage').",
      },
    },
    required: ["command"],
  },
];

/**
 * Executor for command tools
 */
export class CommandToolExecutor {
  /**
   * @param {string} workingDirectory - Directory to run commands in (project root)
   * @param {Object} [options]
   * @param {number} [options.timeoutMs] - Command timeout in milliseconds
   * @param {string[]} [options.additionalAllowedPrefixes] - Extra safe command prefixes
   */
  constructor(workingDirectory, options = {}) {
    this.workingDirectory = workingDirectory;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.allowedPrefixes = [
      ...SAFE_COMMAND_PREFIXES,
      ...(options.additionalAllowedPrefixes || []),
    ];
  }

  /**
   * Execute a tool call
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<string>}
   */
  async executeTool(toolName, args) {
    if (toolName === "execute_command") {
      return this.executeCommand(args.command);
    }
    throw new Error(`Unknown command tool: ${toolName}`);
  }

  /**
   * Run a shell command safely
   * @param {string} command - The command string to run
   * @returns {Promise<string>} Combined stdout + stderr output
   */
  async executeCommand(command) {
    if (!command || typeof command !== "string") {
      return "Error: command must be a non-empty string";
    }

    const trimmed = command.trim();

    if (!this._isSafeCommand(trimmed)) {
      const allowed = this.allowedPrefixes.join(", ");
      return `Error: Command not allowed for security reasons. Only test-runner commands are permitted. Allowed prefixes: ${allowed}`;
    }

    logger.info(`Executing command: ${trimmed}`, {
      component: "CommandToolExecutor",
      cwd: this.workingDirectory,
    });

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const child = spawn(trimmed, {
        cwd: this.workingDirectory,
        shell: true,
        env: { ...process.env },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        resolve(
          `Error: Command timed out after ${this.timeoutMs / 1000}s\n\nPartial stdout:\n${stdout}\n\nPartial stderr:\n${stderr}`,
        );
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (timedOut) return;
        clearTimeout(timer);

        const exitLabel =
          code === 0 ? "✅ PASSED" : `❌ FAILED (exit code ${code})`;
        const combined = `${exitLabel}\n\nstdout:\n${stdout}\nstderr:\n${stderr}`;

        if (combined.length > MAX_OUTPUT_LENGTH) {
          resolve(
            combined.slice(0, MAX_OUTPUT_LENGTH) +
              `\n\n[Output truncated — ${combined.length - MAX_OUTPUT_LENGTH} chars omitted]`,
          );
        } else {
          resolve(combined);
        }
      });

      child.on("error", (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        logger.error(`Command spawn error: ${err.message}`, {
          component: "CommandToolExecutor",
          command: trimmed,
        });
        resolve(`Error: Failed to start command — ${err.message}`);
      });
    });
  }

  /**
   * Check whether a command starts with a known-safe prefix
   * @private
   */
  _isSafeCommand(command) {
    const lower = command.toLowerCase();
    return this.allowedPrefixes.some((prefix) =>
      lower.startsWith(prefix.toLowerCase()),
    );
  }
}
