import fs from "fs/promises";
import path from "path";
import express from "express";
import config from "../config.js";
import { detectAvailableAgents } from "../tasks/executors/index.js";
import { PROVIDERS, PROVIDER_NAMES } from "../constants/providers.js";
import { MODELS, MODEL_NAMES } from "../constants/models.js";

const router = express.Router();

const PROVIDER_MODEL_IDS = {
  [PROVIDERS.OPENAI]: [
    MODELS.GPT_5_MINI,
    MODELS.GPT_5_2,
    MODELS.GPT_5_3_CODEX,
    MODELS.GPT_4_TURBO,
    MODELS.GPT_4,
  ],
  [PROVIDERS.ANTHROPIC]: [
    MODELS.CLAUDE_SONNET_4_6,
    MODELS.CLAUDE_SONNET_4_5,
    MODELS.CLAUDE_OPUS_4,
    MODELS.CLAUDE_OPUS_4_6,
    MODELS.CLAUDE_HAIKU_3_5,
  ],
  [PROVIDERS.DEEPSEEK]: [MODELS.DEEPSEEK_REASONER, MODELS.DEEPSEEK_CHAT],
  [PROVIDERS.KIMI]: [
    MODELS.KIMI_K2_5,
    MODELS.KIMI_K2_THINKING,
    MODELS.KIMI_K2_THINKING_TURBO,
  ],
  [PROVIDERS.GOOGLE]: [
    MODELS.GEMINI_3_1_PRO_PREVIEW,
    MODELS.GEMINI_2_5_PRO,
    MODELS.GEMINI_2_5_FLASH,
  ],
  [PROVIDERS.GLM]: [
    MODELS.GLM_5,
    MODELS.GLM_5_TURBO,
    MODELS.GLM_4_7,
    MODELS.GLM_4_6,
    MODELS.GLM_4_5,
  ],
};

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

function buildAvailableModels(apiKeys) {
  const availableModelsByProvider = Object.entries(PROVIDER_MODEL_IDS)
    .filter(([provider]) => Boolean(apiKeys[provider]))
    .map(([provider, modelIds]) => ({
      provider,
      label: PROVIDER_NAMES[provider] || provider,
      models: modelIds.map((modelId) => ({
        value: modelId,
        label: MODEL_NAMES[modelId] || modelId,
      })),
    }));

  const availableModelLabels = Object.fromEntries(
    availableModelsByProvider.flatMap(({ models }) =>
      models.map(({ value, label }) => [value, label]),
    ),
  );

  return { availableModelsByProvider, availableModelLabels };
}

/**
 * Health check with configuration status
 */
router.get("/", async (req, res) => {
  const [agents, hasSourceFiles] = await Promise.all([
    detectAvailableAgents(),
    detectHasSourceFiles(config.target.directory),
  ]);
  const { availableModelsByProvider, availableModelLabels } =
    buildAvailableModels(config.apiKeys);

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
    availableModelsByProvider,
    availableModelLabels,
    agents,
  });
});

export default router;
