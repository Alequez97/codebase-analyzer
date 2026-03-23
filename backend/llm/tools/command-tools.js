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
 * Shell metacharacters that, if present in a command, indicate an injection
 * attempt.  Since spawn runs with `shell: true`, every one of these can be
 * used to chain or redirect additional commands.
 *
 *   ;       command separator
 *   &&      conditional AND chaining
 *   ||      conditional OR chaining
 *   |       pipe  (LLM receives full output so pipes are unnecessary)
 *   >  >>   stdout/stderr redirection
 *   <       stdin redirection
 *   `       backtick sub-shell
 *   $(      sub-shell substitution
 *   ${      variable expansion
 *   \n \r   newline-injected commands
 */
const SHELL_INJECTION_PATTERN = /[;&|><`$\n\r]/;

/**
 * Command categories - handlers must explicitly enable what they need
 * No commands are enabled by default
 */
const GIT_COMMANDS = [
  "git diff",
  "git log",
  "git status",
  "git show",
  "git branch",
  "git blame",
  "git checkout",
];

const NPM_INSTALL_COMMANDS = ["npm install", "npm ci", "npm pkg set"];
const NPM_BUILD_COMMANDS = ["npm run build", "npm run dev", "npm run preview"];
const NPM_TEST_COMMANDS = ["npm test", "npm run test", "npx jest", "npx vitest"];

const YARN_COMMANDS = [
  "yarn install",
  "yarn add",
  "yarn test",
  "yarn run test",
];

const PNPM_COMMANDS = [
  "pnpm install",
  "pnpm add",
  "pnpm test",
  "pnpm run test",
];

const PYTHON_COMMANDS = [
  "pip install",
  "pip3 install",
  "pytest",
  "python -m pytest",
  "python3 -m pytest",
];

const GO_COMMANDS = ["go test"];
const RUST_COMMANDS = ["cargo test"];
const DOTNET_COMMANDS = ["dotnet test"];
const JAVA_COMMANDS = ["mvn test", "gradle test"];
const RUBY_COMMANDS = ["rake test", "bundle exec rspec", "bundle install"];
const PHP_COMMANDS = [
  "php artisan test",
  "vendor/bin/phpunit",
  "composer install",
];

/**
 * Tool definitions for LLM — command execution
 */
export const COMMAND_TOOLS = [
  {
    name: "execute_command",
    description:
      "Execute a safe command in the project root directory. Commands must be explicitly enabled by the task handler - only git and package manager commands are supported. Use git commands to understand what changed, file history, and current state. Use package commands to set up and run tests or builds.",
    parameters: {
      command: {
        type: "string",
        description:
          "The command to run in the project root (e.g., 'git diff HEAD~1', 'npx jest src/auth/login.test.js --no-coverage', 'npm install --save-dev').",
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
   */
  constructor(workingDirectory, options = {}) {
    this.workingDirectory = workingDirectory;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.allowedPrefixes = [];
  }

  /**
   * Enable Git commands (diff, log, status, etc.)
   */
  enableGitCommands() {
    this._addPrefixes(GIT_COMMANDS, "Git");
  }

  /**
   * Enable npm install commands
   */
  enableNpmInstallCommands() {
    this._addPrefixes(NPM_INSTALL_COMMANDS, "npm install");
  }

  /**
   * Enable npm build commands (build, dev, preview)
   */
  enableNpmBuildCommands() {
    this._addPrefixes(NPM_BUILD_COMMANDS, "npm build");
  }

  /**
   * Enable npm test commands
   */
  enableNpmTestCommands() {
    this._addPrefixes(NPM_TEST_COMMANDS, "npm test");
  }

  /**
   * Enable Yarn commands
   */
  enableYarnCommands() {
    this._addPrefixes(YARN_COMMANDS, "Yarn");
  }

  /**
   * Enable pnpm commands
   */
  enablePnpmCommands() {
    this._addPrefixes(PNPM_COMMANDS, "pnpm");
  }

  /**
   * Enable Python commands (pip, pytest)
   */
  enablePythonCommands() {
    this._addPrefixes(PYTHON_COMMANDS, "Python");
  }

  /**
   * Enable Go test commands
   */
  enableGoCommands() {
    this._addPrefixes(GO_COMMANDS, "Go");
  }

  /**
   * Enable Rust/Cargo commands
   */
  enableRustCommands() {
    this._addPrefixes(RUST_COMMANDS, "Rust");
  }

  /**
   * Enable .NET test commands
   */
  enableDotnetCommands() {
    this._addPrefixes(DOTNET_COMMANDS, ".NET");
  }

  /**
   * Enable Java (Maven/Gradle) commands
   */
  enableJavaCommands() {
    this._addPrefixes(JAVA_COMMANDS, "Java");
  }

  /**
   * Enable Ruby commands
   */
  enableRubyCommands() {
    this._addPrefixes(RUBY_COMMANDS, "Ruby");
  }

  /**
   * Enable PHP commands
   */
  enablePhpCommands() {
    this._addPrefixes(PHP_COMMANDS, "PHP");
  }

  /**
   * Set command timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setTimeout(timeoutMs) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Helper to add prefixes and log
   * @private
   */
  _addPrefixes(prefixes, category) {
    const newPrefixes = prefixes.filter(
      (p) => !this.allowedPrefixes.includes(p)
    );
    if (newPrefixes.length > 0) {
      this.allowedPrefixes.push(...newPrefixes);
      logger.info(`${category} commands enabled`, {
        component: "CommandToolExecutor",
        count: newPrefixes.length,
      });
    }
  }

  /**
   * Get human-readable description for progress display
   * @param {string} _toolName - Tool name (ignored, we only handle one tool)
   * @param {Object} args - Tool arguments
   * @returns {string} Human-readable description
   */
  getToolDescription(_toolName, args) {
    return `Running: ${args?.command || "command"}`;
  }

  /**
   * Execute execute_command tool
   * @param {string} _toolName - Tool name (ignored, we only handle execute_command)
   * @param {Object} args - Tool arguments
   * @returns {Promise<string>}
   */
  async execute(_toolName, args) {
    return this.executeCommand(args.command);
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
      const allowed = this.allowedPrefixes.join(", ") || "(none enabled)";
      return `Error: Command not allowed. Enabled prefixes: ${allowed}`;
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
          `Error: Command timed out after ${this.timeoutMs / 1000}s\n\nPartial stdout:\n${stdout}\n\nPartial stderr:\n${stderr}`
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
              `\n\n[Output truncated — ${combined.length - MAX_OUTPUT_LENGTH} chars omitted]`
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
   * Check whether a command starts with a known-safe prefix and contains no
   * shell metacharacters that could be used for command injection.
   * @private
   */
  _isSafeCommand(command) {
    // Block shell injection via metacharacters regardless of prefix.
    // The spawn call uses shell:true, so all of these are dangerous.
    if (SHELL_INJECTION_PATTERN.test(command)) {
      return false;
    }

    // If no prefixes are enabled, no commands are allowed
    if (this.allowedPrefixes.length === 0) {
      return false;
    }

    const lower = command.toLowerCase();
    return this.allowedPrefixes.some((prefix) =>
      lower.startsWith(prefix.toLowerCase())
    );
  }
}
