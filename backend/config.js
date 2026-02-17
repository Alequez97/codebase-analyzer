import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as logger from "./utils/logger.js";

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
 * Tool Usage:
 * - LLM API: Used for generating analysis JSON files (codebase & domain analysis)
 * - Aider: Used for editing files and writing code (applying fixes, writing tests)
 */
const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),

  // Target project being analyzed
  target: {
    directory: targetDirectory,
    name: projectName,
  },

  // Mock data mode (for development/testing)
  // When true, API endpoints return mock data instead of executing real LLM analysis
  useMockData: process.env.USE_MOCK_DATA === "true",

  // LLM API configuration (used for analysis JSON generation)
  llm: {
    model: process.env.LLM_MODEL || "deepseek",
    apiKeys: {
      deepseek: process.env.DEEPSEEK_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    },
  },

  // Aider configuration (used for code editing and fixes)
  aider: {
    model: process.env.LLM_MODEL || "deepseek",
    apiKeys: {
      deepseek: process.env.DEEPSEEK_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    },
    extraArgs: process.env.AGENT_EXTRA_ARGS || "",
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
    schemas: path.join(__dirname, "schemas"),
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
