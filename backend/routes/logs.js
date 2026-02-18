import express from "express";
import * as logsPersistence from "../persistence/logs.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get persisted logs for the latest codebase analysis
 */
router.get("/codebase-analysis", async (req, res) => {
  try {
    const result = await logsPersistence.readCodebaseAnalysisLogs();
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message,
      });
    }

    logger.error("Error reading codebase analysis logs", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read codebase analysis logs" });
  }
});

/**
 * Get task logs by task ID
 */
router.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await logsPersistence.readTaskLogs(id);
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message,
      });
    }

    logger.error(`Error reading task logs for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read task logs" });
  }
});

export default router;
