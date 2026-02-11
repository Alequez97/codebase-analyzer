import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

/**
 * Parse all CODEBASE_PATH_* environment variables
 * @returns {Array} Array of codebase objects
 */
function parseCodebases() {
  const codebases = [];

  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("CODEBASE_PATH_")) {
      const name = key
        .replace("CODEBASE_PATH_", "")
        .toLowerCase()
        .replace(/_/g, "-");
      const codebasePath = process.env[key];

      if (!codebasePath) {
        console.warn(`${key} is empty, skipping`);
        return;
      }

      if (!fs.existsSync(codebasePath)) {
        console.warn(`${key} path does not exist: ${codebasePath}`);
        return;
      }

      const stats = fs.statSync(codebasePath);
      if (!stats.isDirectory()) {
        console.warn(`${key} is not a directory: ${codebasePath}`);
        return;
      }

      codebases.push({
        id: name,
        name: name
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        path: codebasePath,
      });
    }
  });

  return codebases;
}

const codebases = parseCodebases();

if (codebases.length === 0) {
  console.error("");
  console.error("ERROR: No valid codebases configured!");
  console.error("");
  console.error("Please add codebase paths to backend/.env file:");
  console.error(
    "  CODEBASE_PATH_AVIA_MANAGER=C:\\_projects\\jfs\\avia-manager",
  );
  console.error("");
  process.exit(1);
}

/**
 * Application configuration
 */
const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),

  // Codebases to analyze
  codebases,

  // Analysis tool to use
  analysisTool: process.env.ANALYSIS_TOOL || "aider",

  // Aider configuration
  aider: {
    model: process.env.AIDER_MODEL || "deepseek",
    apiKeys: {
      deepseek: process.env.DEEPSEEK_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    },
    extraArgs: process.env.AIDER_EXTRA_ARGS || "",
  },

  // Paths relative to project root
  paths: {
    root: path.join(__dirname, ".."),
    analysisOutput: path.join(__dirname, "..", "analysis-output"),
    instructions: path.join(__dirname, "instructions"),
    schemas: path.join(__dirname, "schemas"),
  },

  // File watching
  fileWatch: {
    enabled: process.env.FILE_WATCH !== "false",
    debounceMs: parseInt(process.env.FILE_WATCH_DEBOUNCE || "500", 10),
  },
};

// Ensure analysis output directories exist
const dirs = [
  config.paths.analysisOutput,
  path.join(config.paths.analysisOutput, "modules"),
  path.join(config.paths.analysisOutput, "tasks"),
  path.join(config.paths.analysisOutput, "tasks", "pending"),
  path.join(config.paths.analysisOutput, "tasks", "completed"),
  config.paths.instructions,
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export default config;
