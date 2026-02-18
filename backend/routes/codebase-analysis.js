import express from "express";
import * as codebaseAnalysisOrchestrator from "../orchestrators/codebase-analysis.js";
import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as taskOrchestrator from "../orchestrators/task.js";
import { getSupportedAgents } from "../agents/index.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get full codebase analysis
 */
router.get("/", async (req, res) => {
  try {
    const results = await codebaseAnalysisOrchestrator.getCodebaseAnalysis();

    if (!results) {
      return res.status(404).json({
        error: "No codebase analysis found",
        message: 'Click "Analyze Codebase" to start analysis',
      });
    }

    res.json(results);
  } catch (error) {
    logger.error("Error reading codebase analysis", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read codebase analysis" });
  }
});

/**
 * Create a new full codebase analysis task
 */
router.post("/request", async (req, res) => {
  try {
    const executeNow = req.body.executeNow !== false; // Default to true
    const agent = req.body.agent || "llm-api"; // Use llm-api by default for codebase analysis
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    const task = await taskOrchestrator.createFullCodebaseAnalysisTask(
      executeNow,
      agent,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating codebase analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create codebase analysis task" });
  }
});

/**
 * Get full codebase analysis with all domains
 */
router.get("/full", async (req, res) => {
  try {
    const analysis = await codebaseAnalysisOrchestrator.getCodebaseAnalysis();

    if (!analysis || !analysis.domains || analysis.domains.length === 0) {
      return res.status(404).json({
        error: "No completed codebase analysis found",
        message: "Run codebase analysis to generate and load domains",
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error("Error reading domains", { error, component: "API" });
    res.status(500).json({ error: "Failed to read domains" });
  }
});

/**
 * Save edited platform summary
 */
router.post("/summary/save", async (req, res) => {
  try {
    const { summary } = req.body;

    if (typeof summary !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "summary string is required",
      });
    }

    const updatedAnalysis =
      await codebaseAnalysisPersistence.updateCodebaseSummary(summary);

    if (!updatedAnalysis) {
      return res.status(404).json({
        error: "Codebase analysis not found",
        message: 'Click "Analyze Codebase" to start analysis',
      });
    }

    res.json({
      success: true,
      message: "Platform description saved successfully",
      summary: updatedAnalysis.summary,
    });
  } catch (error) {
    logger.error("Error saving platform summary", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save platform summary" });
  }
});

export default router;
