import express from "express";
import fs from "fs";
import path from "path";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import {
  queueDesignBrainstormTask,
  queueDesignPlanAndStyleSystemGenerateTask,
} from "../tasks/queue/index.js";
import { slugifyDesignPageId } from "../tasks/queue/design-shared.js";

const router = express.Router();

const designDir = () =>
  path.join(config.target.directory, ".code-analysis", "design");

function formatLabel(id) {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

router.get("/manifest", (_req, res) => {
  const base = designDir();

  if (!fs.existsSync(base)) {
    return res.json({ prototypes: [], components: [] });
  }

  const prototypes = [];
  const components = [];

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "components") {
      const componentsDir = path.join(base, "components");
      for (const file of fs.readdirSync(componentsDir, { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".html")) {
          continue;
        }

        const id = file.name.replace(".html", "");
        components.push({
          id,
          label: formatLabel(id),
          url: `/design-preview/components/${file.name}`,
        });
      }
      continue;
    }

    const manifestPath = path.join(base, entry.name, "app-manifest.json");
    const appManifest = readJsonIfExists(manifestPath);

    if (appManifest?.pages?.length) {
      for (const page of appManifest.pages) {
        const pageId = slugifyDesignPageId(page.id || page.name);
        const indexPath = path.join(base, entry.name, "pages", pageId, "index.html");
        if (!fs.existsSync(indexPath)) {
          continue;
        }

        prototypes.push({
          id: `${entry.name}:${pageId}`,
          label: page.name || formatLabel(pageId),
          url: `/design-preview/${entry.name}/pages/${pageId}/index.html`,
          designId: entry.name,
          pageId,
        });
      }
      continue;
    }

    const indexPath = path.join(base, entry.name, "index.html");
    if (fs.existsSync(indexPath)) {
      prototypes.push({
        id: entry.name,
        label: formatLabel(entry.name),
        url: `/design-preview/${entry.name}/index.html`,
        designId: entry.name,
        pageId: null,
      });
    }
  }

  prototypes.sort((a, b) => a.label.localeCompare(b.label));
  components.sort((a, b) => a.label.localeCompare(b.label));

  return res.json({ prototypes, components });
});

router.post("/brainstorm", async (req, res) => {
  try {
    const { prompt, history = [], agentsOverrides = null } = req.body ?? {};
    const model = agentsOverrides?.model || null;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "prompt string is required",
      });
    }

    const task = await queueDesignBrainstormTask({
      prompt: prompt.trim(),
      history,
      model,
    });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to queue design brainstorm task",
        code: task.code,
      });
    }

    logger.info("Design brainstorm task queued", {
      component: "DesignRoutes",
      taskId: task.id,
    });

    return res.json({
      task: {
        id: task.id,
        type: task.type,
        agent: task.agentConfig?.agent ?? null,
        model: task.agentConfig?.model ?? null,
      },
    });
  } catch (error) {
    logger.error("Failed to queue design brainstorm task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to start design brainstorm",
      message: error.message,
    });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const {
      prompt,
      brief = "",
      history = [],
      designId = null,
      agentsOverrides = null,
    } = req.body ?? {};
    const model = agentsOverrides?.model || null;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "prompt string is required",
      });
    }

    const task = await queueDesignPlanAndStyleSystemGenerateTask({
      prompt: prompt.trim(),
      brief: typeof brief === "string" ? brief.trim() : "",
      history,
      designId,
      model,
    });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to queue design planning task",
        code: task.code,
      });
    }

    logger.info("Design planning task queued", {
      component: "DesignRoutes",
      taskId: task.id,
      designId: task.params.designId,
    });

    return res.json({
      task: {
        id: task.id,
        type: task.type,
        designId: task.params.designId,
        agent: task.agentConfig?.agent ?? null,
        model: task.agentConfig?.model ?? null,
      },
    });
  } catch (error) {
    logger.error("Failed to queue design planning task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to start design planning",
      message: error.message,
    });
  }
});

export default router;
