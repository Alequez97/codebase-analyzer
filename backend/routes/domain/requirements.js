import express from "express";
import * as domainRequirementsPersistence from "../../persistence/domain-requirements.js";
import * as taskOrchestrator from "../../orchestrators/task.js";
import * as logger from "../../utils/logger.js";

const router = express.Router();

/**
 * Get domain requirements section
 */
router.get("/:id/requirements", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainRequirementsPersistence.readDomainRequirements(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain requirements not found",
        message: `No requirements found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain requirements ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain requirements" });
  }
});

/**
 * Analyze domain requirements section
 */
router.post("/:id/analyze/requirements", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, userContext, includeDocumentation = false } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeRequirementsTask(
      id,
      files,
      userContext || "",
      includeDocumentation,
      executeNow,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating requirements analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create requirements analysis task" });
  }
});

/**
 * Save edited requirements
 */
router.post("/:id/requirements/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { requirements, domainName } = req.body;

    if (!requirements || !Array.isArray(requirements)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "requirements[] array is required",
      });
    }

    await domainRequirementsPersistence.writeDomainRequirements(id, {
      domainId: id,
      domainName: domainName || id,
      timestamp: new Date().toISOString(),
      requirements,
    });

    res.json({
      success: true,
      message: "Requirements saved successfully",
    });
  } catch (error) {
    logger.error(`Error saving requirements for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save requirements" });
  }
});

export default router;
