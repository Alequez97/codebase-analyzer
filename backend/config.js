import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as logger from "./utils/logger.js";
import { TASK_TYPES } from "./constants/task-types.js";
import { TASK_FOLDERS } from "./constants/task-status.js";
import { MODELS } from "./constants/models.js";
import { PROVIDERS } from "./constants/providers.js";
import { AGENTS } from "./constants/agents.js";
import { REASONING_EFFORT } from "./constants/reasoning-effort.js";
import { PERSISTENCE_FILES } from "./constants/persistence-files.js";

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
 * - Each task type can use a different model
 * - API keys are loaded from .env file
 */
const config = {
  // Server
  port: (() => {
    if (!process.env.PORT) {
      logger.error(
        "PORT env var is not set. Start the app via the CLI: code-analyzer start",
      );
      process.exit(1);
    }
    return parseInt(process.env.PORT, 10);
  })(),

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
    [PROVIDERS.KIMI]: process.env.MOONSHOT_API_KEY,
    [PROVIDERS.OPENROUTER]: process.env.OPENROUTER_API_KEY,
    [PROVIDERS.GOOGLE]: process.env.GOOGLE_API_KEY,
    [PROVIDERS.GLM]: process.env.GLM_API_KEY,
    braveSearch: process.env.BRAVE_SEARCH_API_KEY,
  },

  // Task-specific agent and model configuration
  tasks: {
    [TASK_TYPES.CODEBASE_ANALYSIS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_2,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DOCUMENTATION]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DIAGRAMS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.REQUIREMENTS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_2,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.BUGS_SECURITY]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET_4_6,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.REFACTORING_AND_TESTING]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET_4_6,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.HIGH,
    },
    [TASK_TYPES.IMPLEMENT_FIX]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.IMPLEMENT_TEST]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 100,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.APPLY_REFACTORING]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },

    // Edit tasks (AI chat for editing domain sections)
    [TASK_TYPES.EDIT_DOCUMENTATION]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },
    [TASK_TYPES.EDIT_DIAGRAMS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },
    [TASK_TYPES.EDIT_REQUIREMENTS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },
    [TASK_TYPES.EDIT_BUGS_SECURITY]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },
    [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },
    [TASK_TYPES.EDIT_CODEBASE_ANALYSIS]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.LOW,
    },

    // Custom codebase task (floating agent chat)
    [TASK_TYPES.CUSTOM_CODEBASE_TASK]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_2,
      maxTokens: 64000,
      maxIterations: 200,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },

    // Review changes task
    [TASK_TYPES.REVIEW_CHANGES]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_2,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },

    [TASK_TYPES.DESIGN_BRAINSTORM]: {
      agent: AGENTS.LLM_API,
      model: MODELS.KIMI_K2_5,
      maxTokens: 64000,
      maxIterations: 200,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE]: {
      agent: AGENTS.LLM_API,
      model: MODELS.KIMI_K2_5,
      maxTokens: 64000,
      maxIterations: 200,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DESIGN_GENERATE_PAGE]: {
      agent: AGENTS.LLM_API,
      model: MODELS.KIMI_K2_5,
      maxTokens: 64000,
      maxIterations: 100,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.DESIGN_ASSISTANT]: {
      agent: AGENTS.LLM_API,
      model: MODELS.KIMI_K2_5,
      maxTokens: 64000,
      maxIterations: 200,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
  },

  // Default agent config
  defaultAgentConfig: {
    agent: AGENTS.LLM_API,
    model: MODELS.DEEPSEEK_REASONER,
    maxTokens: 16000,
    reasoningEffort: REASONING_EFFORT.MEDIUM,
  },

  // Paths
  paths: {
    // Analyzer tool root (where this code lives)
    analyzerRoot: path.join(__dirname, ".."),

    // Temp folder for transient task artifacts (progress files, instruction dumps)
    temp: path.join(__dirname, "temp"),

    // Target project paths
    targetRoot: targetDirectory,
    targetAnalysis: path.join(
      targetDirectory,
      PERSISTENCE_FILES.ANALYSIS_ROOT_DIR,
    ),

    // Analyzer internal paths
    systemInstructions: path.join(__dirname, "system-instructions"),
  },

  // File watching
  fileWatch: {
    enabled: process.env.FILE_WATCH !== "false",
    debounceMs: parseInt(process.env.FILE_WATCH_DEBOUNCE || "500", 10),
  },
};

// Ensure required directories exist
const dirs = [
  config.paths.temp,
  path.join(config.paths.targetAnalysis, "analysis"),
  path.join(config.paths.targetAnalysis, "domains"),
  path.join(config.paths.targetAnalysis, "tasks"),
  path.join(config.paths.targetAnalysis, "tasks", TASK_FOLDERS.PENDING),
  path.join(config.paths.targetAnalysis, "tasks", TASK_FOLDERS.RUNNING),
  path.join(config.paths.targetAnalysis, "tasks", TASK_FOLDERS.COMPLETED),
  path.join(config.paths.targetAnalysis, "logs"),
  path.join(config.paths.targetAnalysis, "temp"),
  path.join(config.paths.targetAnalysis, "config"),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export default config;
