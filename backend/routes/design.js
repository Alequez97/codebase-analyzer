import express from "express";
import * as logger from "../utils/logger.js";
import { loadDesignManifest } from "../utils/design-manifest.js";
import { DESIGN_TECHNOLOGY_VALUES } from "../constants/design-technologies.js";
import {
  queueDesignBrainstormTask,
  queueDesignPlanAndStyleSystemGenerateTask,
  queueDesignAssistantTask,
  queueDesignReverseEngineerTask,
} from "../tasks/queue/index.js";
import { getTasks } from "../orchestrators/task.js";
import { loadChatHistory } from "../utils/chat-history.js";
import { TASK_TYPES } from "../constants/task-types.js";
import ngrokManager from "../utils/ngrok-manager.js";
import config from "../config.js";

const router = express.Router();

const GENERATION_TASK_TYPES = [
  TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  TASK_TYPES.DESIGN_GENERATE_PAGE,
  TASK_TYPES.DESIGN_REVERSE_ENGINEER,
];

async function getLatestTaskByTypes(types) {
  const allTasks = await getTasks();
  const matching = allTasks.filter((task) => types.includes(task.type));
  if (matching.length === 0) {
    return { task: null, chatHistory: null };
  }
  matching.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latestTask = matching[0];
  const chatHistory = await loadChatHistory(latestTask.id);
  return { task: latestTask, chatHistory };
}

router.get("/manifest", (_req, res) => {
  return res.json(loadDesignManifest());
});

router.get("/latest-generation-task", async (_req, res) => {
  try {
    return res.json(await getLatestTaskByTypes(GENERATION_TASK_TYPES));
  } catch (error) {
    logger.error("Failed to get latest generation task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to get latest generation task",
      message: error.message,
    });
  }
});

router.get("/latest-brainstorm-task", async (_req, res) => {
  try {
    return res.json(await getLatestTaskByTypes([TASK_TYPES.DESIGN_BRAINSTORM]));
  } catch (error) {
    logger.error("Failed to get latest brainstorm task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to get latest brainstorm task",
      message: error.message,
    });
  }
});

router.get("/latest-edit-task", async (_req, res) => {
  try {
    return res.json(await getLatestTaskByTypes([TASK_TYPES.DESIGN_ASSISTANT]));
  } catch (error) {
    logger.error("Failed to get latest design assistant task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to get latest design assistant task",
      message: error.message,
    });
  }
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

router.post("/edit", async (req, res) => {
  try {
    const { prompt, history = [], agentsOverrides = null } = req.body ?? {};
    const model = agentsOverrides?.model || null;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "prompt string is required",
      });
    }

    const task = await queueDesignAssistantTask({
      prompt: prompt.trim(),
      history,
      model,
    });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to queue design assistant task",
        code: task.code,
      });
    }

    logger.info("Design assistant task queued", {
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
    logger.error("Failed to queue design assistant task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to start design assistant task",
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
      technology = null,
      agentsOverrides = null,
    } = req.body ?? {};
    const model = agentsOverrides?.model || null;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "prompt string is required",
      });
    }

    if (technology && !DESIGN_TECHNOLOGY_VALUES.includes(technology)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `technology must be one of: ${DESIGN_TECHNOLOGY_VALUES.join(", ")}`,
      });
    }

    const task = await queueDesignPlanAndStyleSystemGenerateTask({
      prompt: prompt.trim(),
      brief: typeof brief === "string" ? brief.trim() : "",
      history,
      designId,
      technology,
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

// ==================== Ngrok Publish/Unpublish ====================

router.post("/reverse-engineer", async (req, res) => {
  try {
    const {
      description,
      designId = null,
      agentsOverrides = null,
    } = req.body ?? {};
    const model = agentsOverrides?.model || null;

    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        error: "Invalid request",
        message: "description is required and must be a non-empty string",
      });
    }

    const task = await queueDesignReverseEngineerTask({
      description: description.trim(),
      designId,
      model,
    });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to queue reverse-engineer task",
        code: task.code,
      });
    }

    logger.info("Design reverse-engineer task queued", {
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
    logger.error("Failed to queue reverse-engineer task", {
      component: "DesignRoutes",
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to start reverse engineering",
      message: error.message,
    });
  }
});

// ==================== Ngrok Publish/Unpublish ====================

router.post("/publish/:designId", async (req, res) => {
  try {
    const { designId } = req.params;

    if (!designId || typeof designId !== "string" || !designId.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "designId is required",
      });
    }

    logger.info("Publishing design via ngrok", {
      component: "DesignRoutes",
      designId,
    });

    const publicUrl = await ngrokManager.startTunnel(designId, config.port);

    logger.info("Design published successfully", {
      component: "DesignRoutes",
      designId,
      url: publicUrl,
    });

    return res.json({
      success: true,
      designId,
      url: publicUrl,
    });
  } catch (error) {
    logger.error("Failed to publish design", {
      component: "DesignRoutes",
      designId: req.params.designId,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to publish design",
      message: error.message,
    });
  }
});

router.delete("/publish/:designId", async (req, res) => {
  try {
    const { designId } = req.params;

    if (!designId || typeof designId !== "string" || !designId.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "designId is required",
      });
    }

    logger.info("Unpublishing design", {
      component: "DesignRoutes",
      designId,
    });

    const stopped = await ngrokManager.stopTunnel(designId);

    if (!stopped) {
      return res.status(404).json({
        error: "Tunnel not found",
        message: `No active tunnel found for design: ${designId}`,
      });
    }

    logger.info("Design unpublished successfully", {
      component: "DesignRoutes",
      designId,
    });

    return res.json({
      success: true,
      designId,
    });
  } catch (error) {
    logger.error("Failed to unpublish design", {
      component: "DesignRoutes",
      designId: req.params.designId,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to unpublish design",
      message: error.message,
    });
  }
});

router.get("/publish/:designId", async (req, res) => {
  try {
    const { designId } = req.params;

    if (!designId || typeof designId !== "string" || !designId.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "designId is required",
      });
    }

    const url = ngrokManager.getTunnelUrl(designId);

    return res.json({
      designId,
      url,
      isPublished: url !== null,
    });
  } catch (error) {
    logger.error("Failed to get publish status", {
      component: "DesignRoutes",
      designId: req.params.designId,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to get publish status",
      message: error.message,
    });
  }
});

export default router;
