import { Router } from "express";
import * as logger from "../utils/logger.js";
import {
  upsertSession,
  getSession,
  getMarketResearchReport,
} from "../persistence/market-research.js";
import { queueMarketResearchInitialTask } from "../tasks/queue/market-research-initial.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";

const router = Router();

// PUT /api/market-research/:sessionId
// Save (or overwrite) an analysis session — called when user logs in
router.put("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { idea, state } = req.body;

  if (!idea || typeof idea !== "string" || !idea.trim()) {
    return res.status(400).json({ error: "idea is required" });
  }
  if (!state || typeof state !== "object") {
    return res.status(400).json({ error: "state object is required" });
  }

  try {
    const session = await upsertSession(sessionId, idea.trim(), state);
    return res.json({ session });
  } catch (error) {
    if (error.message === "Invalid sessionId format") {
      return res.status(400).json({ error: "Invalid sessionId format" });
    }
    logger.error("Failed to save market research session", {
      error: error.message,
      sessionId,
      component: "MarketResearchRoutes",
    });
    return res.status(500).json({ error: "Failed to save session" });
  }
});

// GET /api/market-research/:sessionId
// Retrieve a stored session by ID
router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found or expired" });
    }
    return res.json({ session });
  } catch (error) {
    if (error.message === "Invalid sessionId format") {
      return res.status(400).json({ error: "Invalid sessionId format" });
    }
    logger.error("Failed to get market research session", {
      error: error.message,
      sessionId,
      component: "MarketResearchRoutes",
    });
    return res.status(500).json({ error: "Failed to load session" });
  }
});

// POST /api/market-research/:sessionId/analyze
// Queue an AI market research task for this session
router.post("/:sessionId/analyze", async (req, res) => {
  const { sessionId } = req.params;
  const { idea } = req.body;

  if (!idea || typeof idea !== "string" || !idea.trim()) {
    return res.status(400).json({ error: "idea is required" });
  }

  try {
    const task = await queueMarketResearchInitialTask({
      sessionId,
      idea: idea.trim(),
    });

    if (task?.success === false) {
      const statusCode =
        task.code === TASK_ERROR_CODES.TASK_CONFIG_MISSING ? 500 : 400;
      return res.status(statusCode).json({
        error: task.error || "Failed to queue market research task",
        code: task.code,
      });
    }

    logger.info("Market research task queued via API", {
      taskId: task.id,
      sessionId,
      component: "MarketResearchRoutes",
    });

    return res.status(201).json({ task });
  } catch (error) {
    if (error.message === "Invalid sessionId format") {
      return res.status(400).json({ error: "Invalid sessionId format" });
    }
    logger.error("Failed to queue market research task", {
      error: error.message,
      sessionId,
      component: "MarketResearchRoutes",
    });
    return res.status(500).json({ error: "Failed to start analysis" });
  }
});

// GET /api/market-research/:sessionId/report
// Retrieve the AI-generated report for a session (written by the agent)
router.get("/:sessionId/report", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const report = await getMarketResearchReport(sessionId);
    if (!report) {
      return res.status(404).json({
        error: "Report not found",
        message: "Analysis may still be in progress or has not been started",
      });
    }
    return res.json({ report });
  } catch (error) {
    if (error.message === "Invalid sessionId format") {
      return res.status(400).json({ error: "Invalid sessionId format" });
    }
    logger.error("Failed to load market research report", {
      error: error.message,
      sessionId,
      component: "MarketResearchRoutes",
    });
    return res.status(500).json({ error: "Failed to load report" });
  }
});

export default router;
