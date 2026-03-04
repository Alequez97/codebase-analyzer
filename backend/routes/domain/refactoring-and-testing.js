import express from "express";
import * as domainTestingPersistence from "../../persistence/domain-testing.js";
import * as taskFactory from "../../tasks/factory/index.js";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TEST_TYPES } from "../../constants/test-types.js";
import { SECTION_TYPES } from "../../constants/section-types.js";
import * as logger from "../../utils/logger.js";

const router = express.Router();

function enrichMissingTestsWithApplyHistory(missingTests, applyActions) {
  const actionsByTestId = new Map();

  (applyActions || []).forEach((action) => {
    const existing = actionsByTestId.get(action.testId) || [];
    existing.push(action);
    actionsByTestId.set(action.testId, existing);
  });

  const enrichList = (tests = []) =>
    tests.map((test) => {
      const actionHistory = (actionsByTestId.get(test.id) || []).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );

      return {
        ...test,
        actionHistory,
        actionStatus: actionHistory[0]?.status || null,
      };
    });

  return {
    unit: enrichList(missingTests?.unit || []),
    integration: enrichList(missingTests?.integration || []),
    e2e: enrichList(missingTests?.e2e || []),
  };
}

/**
 * Get domain testing section
 */
router.get(
  `/:id/${SECTION_TYPES.REFACTORING_AND_TESTING}`,
  async (req, res) => {
    try {
      const { id } = req.params;

      const data = await domainTestingPersistence.readDomainTesting(id);
      const applyActionsRegistry =
        await domainTestingPersistence.readTestingApplyActions(id);

      if (!data) {
        return res.status(404).json({
          error: "Domain testing not found",
          message: `No testing analysis found for domain: ${id}. Run testing analysis first.`,
        });
      }

      const applyActions = applyActionsRegistry?.actions || [];
      const missingTests = enrichMissingTestsWithApplyHistory(
        data.missingTests || {},
        applyActions,
      );

      res.json({
        ...data,
        missingTests,
      });
    } catch (error) {
      logger.error(`Error reading domain testing ${req.params.id}`, {
        error,
        component: "API",
      });
      res.status(500).json({ error: "Failed to read domain testing" });
    }
  },
);

/**
 * Analyze domain testing section
 */
router.post(
  `/:id/analyze/${SECTION_TYPES.REFACTORING_AND_TESTING}`,
  async (req, res) => {
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
      const task = await taskFactory.createAnalyzeRefactoringAndTestingTask(
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
  },
);

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
      ...(testingData.missingTests?.unit || []).map((test) => ({
        ...test,
        testType: test.testType || TEST_TYPES.UNIT,
      })),
      ...(testingData.missingTests?.integration || []).map((test) => ({
        ...test,
        testType: test.testType || TEST_TYPES.INTEGRATION,
      })),
      ...(testingData.missingTests?.e2e || []).map((test) => ({
        ...test,
        testType: test.testType || TEST_TYPES.E2E,
      })),
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
      if (task.code === TASK_ERROR_CODES.INVALID_INPUT) {
        return res.status(400).json({
          error: task.error || "Invalid test recommendation",
          code: task.code,
        });
      }

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

/**
 * Apply edits to an already applied test
 * Placeholder endpoint for future file replacement workflow
 */
router.post("/:id/tests/:testId/edit", async (_, res) => {
  res.status(501).json({
    error: "Not implemented",
    message:
      "Editing generated tests is not implemented yet. This endpoint will use file replacement tooling in a future update.",
  });
});

/**
 * Unblock a missing test by clearing its blockedBy field
 */
router.post("/:id/tests/:testId/unblock", async (req, res) => {
  try {
    const { id, testId } = req.params;

    const result = await domainTestingPersistence.unblockMissingTest(
      id,
      testId,
    );

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(
      `Error unblocking test ${req.params.testId} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to unblock test" });
  }
});

/**
 * Apply a refactoring recommendation
 */
router.post("/:id/refactorings/:refactoringId/apply", async (req, res) => {
  try {
    const { id, refactoringId } = req.params;

    // Read the testing analysis to get the refactoring details
    const testingData = await domainTestingPersistence.readDomainTesting(id);

    if (!testingData) {
      return res.status(404).json({
        error: "Domain testing not found",
        message: `No testing analysis found for domain: ${id}`,
      });
    }

    const refactoring = (testingData.refactoringRecommendations || []).find(
      (r) => r.id === refactoringId,
    );

    if (!refactoring) {
      return res.status(404).json({
        error: "Refactoring not found",
        message: `No refactoring recommendation found with id: ${refactoringId}`,
      });
    }

    const executeNow = req.body.executeNow !== false;

    const task = await taskFactory.createApplyRefactoringTask(
      { domainId: id, refactoring },
      { executeNow },
    );

    if (task?.success === false) {
      if (task.code === TASK_ERROR_CODES.INVALID_INPUT) {
        return res.status(400).json({
          error: task.error || "Invalid refactoring recommendation",
          code: task.code,
        });
      }

      return res.status(500).json({
        error: task.error || "Failed to apply refactoring",
        code: task.code,
      });
    }

    res.status(201).json({
      success: true,
      message: "Refactoring task created",
      task,
    });
  } catch (error) {
    logger.error(
      `Error applying refactoring ${req.params.refactoringId} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to apply refactoring" });
  }
});

/**
 * Manually mark a refactoring recommendation as applied
 */
router.post(
  "/:id/refactorings/:refactoringId/mark-applied",
  async (req, res) => {
    try {
      const { id, refactoringId } = req.params;

      const testingData = await domainTestingPersistence.readDomainTesting(id);
      if (!testingData) {
        return res.status(404).json({
          error: "Domain testing not found",
          message: `No testing analysis found for domain: ${id}`,
        });
      }

      const result = await domainTestingPersistence.recordRefactoringApplied(
        id,
        {
          refactoringId,
          taskId: null,
          serviceFile: null,
          timestamp: new Date().toISOString(),
        },
      );

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json({ success: true, refactoring: result.refactoring });
    } catch (error) {
      logger.error(
        `Error marking refactoring ${req.params.refactoringId} as applied for domain ${req.params.id}`,
        { error, component: "API" },
      );
      res.status(500).json({ error: "Failed to mark refactoring as applied" });
    }
  },
);

export default router;
