import express from "express";
import * as logger from "../utils/logger.js";
import { loadDesignManifest } from "../utils/design-manifest.js";
import {
  queueDesignBrainstormTask,
  queueDesignPlanAndStyleSystemGenerateTask,
} from "../tasks/queue/index.js";

const router = express.Router();

router.get("/manifest", (_req, res) => {
  return res.json(loadDesignManifest());
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
