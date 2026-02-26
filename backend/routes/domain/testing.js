import express from "express";
import * as domainTestingPersistence from "../../persistence/domain-testing.js";
import * as taskFactory from "../../tasks/factory/index.js";
import * as logger from "../../utils/logger.js";

const router = express.Router();

/**
 * Get domain testing section
 */
router.get("/:id/testing", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainTestingPersistence.readDomainTesting(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain testing not found",
        message: `No testing analysis found for domain: ${id}. Run testing analysis first.`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain testing ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain testing" });
  }
});

/**
 * Analyze domain testing section
 */
router.post("/:id/analyze/testing", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, includeRequirements = false } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskFactory.createAnalyzeTestingTask(
      { domainId: id, files, includeRequirements },
      { executeNow },
    );

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create testing analysis task",
        code: task.code,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating testing analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create testing analysis task" });
  }
});

/**
 * Apply a single test
 */
router.post("/:id/tests/:testId/apply", async (req, res) => {
  try {
    const { id, testId } = req.params;

    // Read the testing analysis to get the test details
    const testingData = await domainTestingPersistence.readDomainTesting(id);

    if (!testingData) {
      return res.status(404).json({
        error: "Domain testing not found",
        message: `No testing analysis found for domain: ${id}`,
      });
    }

    // Find the specific test recommendation
    const allTests = [
      ...(testingData.missingTests?.unit || []),
      ...(testingData.missingTests?.integration || []),
      ...(testingData.missingTests?.e2e || []),
    ];

    const testRecommendation = allTests.find((t) => t.id === testId);

    if (!testRecommendation) {
      return res.status(404).json({
        error: "Test not found",
        message: `No test recommendation found with id: ${testId}`,
      });
    }

    const executeNow = req.body.executeNow !== false;

    // Create a task to apply the test
    const task = await taskFactory.createApplyTestTask(
      { domainId: id, testRecommendation },
      { executeNow },
    );

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to apply test",
        code: task.code,
      });
    }

    res.status(201).json({
      success: true,
      message: "Test application task created",
      task,
    });
  } catch (error) {
    logger.error(
      `Error applying test ${req.params.testId} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to apply test" });
  }
});

export default router;
