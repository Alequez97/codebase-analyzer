import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as logger from "./utils/logger.js";
import { TASK_TYPES } from "./constants/task-types.js";
import { MODELS } from "./constants/models.js";
import { PROVIDERS } from "./constants/providers.js";
import { AGENTS } from "./constants/agents.js";
import { REASONING_EFFORT } from "./constants/reasoning-effort.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

/**
 * Get the target directory being analyzed
 * Defaults to process.cwd() if run directly, or ANALYSIS_TARGET_DIR from CLI
 */
function getTargetDirectory() {
  const targetDir = process.env.ANALYSIS_TARGET_DIR || process.cwd();

  if (!fs.existsSync(targetDir)) {
    logger.error(`Target directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  const stats = fs.statSync(targetDir);
  if (!stats.isDirectory()) {
    logger.error(`Target is not a directory: ${targetDir}`);
    process.exit(1);
  }

  return targetDir;
}

const targetDirectory = getTargetDirectory();

// Extract project name from target directory
const projectName = path.basename(targetDirectory);

/**
 * Application configuration
 *
 * Task-based agent and model configuration:
 * - Each task type can use a different agent (llm-api or aider)
 * - Each task type can use a different model
 * - API keys are loaded from .env file
 */
const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),

  // Target project being analyzed
  target: {
    directory: targetDirectory,
    name: projectName,
  },

  // API Keys (loaded from .env)
  apiKeys: {
    [PROVIDERS.OPENAI]: process.env.OPENAI_API_KEY,
    [PROVIDERS.ANTHROPIC]: process.env.ANTHROPIC_API_KEY,
    [PROVIDERS.DEEPSEEK]: process.env.DEEPSEEK_API_KEY,
    [PROVIDERS.OPENROUTER]: process.env.OPENROUTER_API_KEY,
  },

  // Task-specific agent and model configuration
  tasks: {
    [TASK_TYPES.CODEBASE_ANALYSIS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DOCUMENTATION]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DIAGRAMS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.REQUIREMENTS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.BUGS_SECURITY]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.HIGH,
    },
    [TASK_TYPES.TESTING]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.APPLY_FIX]: {
      agent: AGENTS.AIDER,
      model: MODELS.CLAUDE_SONNET,
      maxTokens: 64000,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
  },

  // Aider-specific configuration (when agent is AGENTS.AIDER)
  aider: {
    extraArgs: "",
  },

  // Paths
  paths: {
    // Analyzer tool root (where this code lives)
    analyzerRoot: path.join(__dirname, ".."),

    // Target project paths
    targetRoot: targetDirectory,
    targetAnalysis: path.join(targetDirectory, ".code-analysis"),

    // Analyzer internal paths
    instructions: path.join(__dirname, "instructions"),
  },

  // File watching
  fileWatch: {
    enabled: process.env.FILE_WATCH !== "false",
    debounceMs: parseInt(process.env.FILE_WATCH_DEBOUNCE || "500", 10),
  },
};

// Ensure required directories exist
const dirs = [
  path.join(config.paths.targetAnalysis, "analysis"),
  path.join(config.paths.targetAnalysis, "domains"),
  path.join(config.paths.targetAnalysis, "tasks"),
  path.join(config.paths.targetAnalysis, "tasks", "pending"),
  path.join(config.paths.targetAnalysis, "tasks", "completed"),
  path.join(config.paths.targetAnalysis, "logs"),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export default config;
