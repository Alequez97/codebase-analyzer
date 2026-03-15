import { Router } from "express";
import * as logger from "../utils/logger.js";
import { upsertSession, getSession } from "../persistence/market-research.js";

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

export default router;
