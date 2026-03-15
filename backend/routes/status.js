import fs from "fs/promises";
import path from "path";
import express from "express";
import config from "../config.js";
import { detectAvailableAgents } from "../tasks/executors/index.js";

const router = express.Router();

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rb",
  ".cs",
  ".php",
  ".vue",
  ".svelte",
  ".rs",
  ".c",
  ".cpp",
  ".h",
  ".swift",
  ".kt",
  ".scala",
  ".sql",
]);

/**
 * Walk up to `maxDepth` levels of a directory and return true as soon as a
 * source-code file is found. Ignores node_modules, .git, build artefacts, and
 * the .code-analysis output folder so the check stays fast.
 */
async function detectHasSourceFiles(dir, maxDepth = 4, depth = 0) {
  if (depth > maxDepth) return false;

  const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".code-analysis",
    ".vscode",
    ".idea",
    "__pycache__",
  ]);

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (
        await detectHasSourceFiles(
          path.join(dir, entry.name),
          maxDepth,
          depth + 1,
        )
      ) {
        return true;
      }
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Health check with configuration status
 */
router.get("/", async (req, res) => {
  const [agents, hasSourceFiles] = await Promise.all([
    detectAvailableAgents(),
    detectHasSourceFiles(config.target.directory),
  ]);

  // Build a task-type → model-id map so the frontend can show the default model label
  const taskModels = Object.fromEntries(
    Object.entries(config.tasks).map(([taskType, cfg]) => [
      taskType,
      cfg.model,
    ]),
  );

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    target: {
      directory: config.target.directory,
      name: config.target.name,
      isEmpty: !hasSourceFiles,
    },
    config: {
      port: config.port,
    },
    taskModels,
    agents,
  });
});

export default router;
