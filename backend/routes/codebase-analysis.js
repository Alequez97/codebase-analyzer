import express from "express";
import * as codebaseAnalysisService from "../services/codebase-analysis.js";
import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import {
  queueCodebaseAnalysisTask,
  queueEditCodebaseAnalysisTask,
} from "../tasks/queue/index.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get full codebase analysis
 */
router.get("/", async (req, res) => {
  try {
    const results = await codebaseAnalysisService.getCodebaseAnalysis();

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
    const task = await queueCodebaseAnalysisTask();

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create codebase analysis task",
        code: task.code,
      });
    }

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
    const analysis = await codebaseAnalysisService.getCodebaseAnalysis();

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
 * Update a domain's priority
 */
router.patch("/domains/:id/priority", async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const VALID = ["P0", "P1", "P2", "P3"];
    if (!priority || !VALID.includes(priority)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "priority must be one of: P0, P1, P2, P3",
      });
    }

    const updatedDomain =
      await codebaseAnalysisPersistence.updateDomainPriority(id, priority);

    if (!updatedDomain) {
      return res.status(404).json({
        error: "Domain not found",
        message: `No domain found with id: ${id}`,
      });
    }

    res.json({ success: true, domain: updatedDomain });
  } catch (error) {
    logger.error("Error updating domain priority", { error, component: "API" });
    res.status(500).json({ error: "Failed to update domain priority" });
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

/**
 * Edit codebase analysis structure (AI task)
 * POST /codebase-analysis/edit
 *
 * Use this to request AI-driven updates to codebase-analysis.json:
 * - Add or remove domains
 * - Update file-to-domain mappings
 * - Update analyzedFiles list
 *
 * Body: { instructions: string, agentsOverrides?: { model?: string } }
 */
router.post("/edit", async (req, res) => {
  try {
    const { instructions, agentsOverrides = null } = req.body;
    const model = agentsOverrides?.model || null;

    if (
      !instructions ||
      typeof instructions !== "string" ||
      !instructions.trim()
    ) {
      return res.status(400).json({
        error: "Invalid request",
        message: "instructions string is required",
      });
    }

    const task = await queueEditCodebaseAnalysisTask({
      model,
      requestInstructions: instructions.trim(),
    });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create edit codebase analysis task",
        code: task.code,
      });
    }

    logger.info(`Edit codebase analysis task created: ${task.id}`, {
      component: "API",
      taskId: task.id,
    });

    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating edit codebase analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create edit codebase analysis task" });
  }
});

export default router;
