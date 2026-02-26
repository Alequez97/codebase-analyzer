import express from "express";
import { TASK_STATUS } from "../../constants/task-status.js";
import * as domainDocumentationPersistence from "../../persistence/domain-documentation.js";
import * as taskFactory from "../../tasks/factory/index.js";
import * as logger from "../../utils/logger.js";

const router = express.Router();

/**
 * Get domain documentation section
 */
router.get("/:id/documentation", async (req, res) => {
  try {
    const { id } = req.params;

    const data =
      await domainDocumentationPersistence.readDomainDocumentation(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain documentation not found",
        message: `No documentation found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain documentation ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain documentation" });
  }
});

/**
 * Analyze domain documentation section
 */
router.post("/:id/analyze/documentation", async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskFactory.createAnalyzeDocumentationTask(
      { domainId: id, files },
      { executeNow },
    );

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create documentation analysis task",
        code: task.code,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating documentation analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create documentation analysis task" });
  }
});

/**
 * Save edited documentation
 */
router.post("/:id/documentation/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { documentation } = req.body;

    if (!documentation || typeof documentation !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "documentation string is required",
      });
    }

    await domainDocumentationPersistence.writeDomainDocumentation(id, {
      content: documentation,
      metadata: {
        status: TASK_STATUS.COMPLETED,
        lastModified: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: "Documentation saved successfully",
    });
  } catch (error) {
    logger.error(`Error saving documentation for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save documentation" });
  }
});

export default router;
