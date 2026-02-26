import express from "express";
import * as domainBugsSecurityPersistence from "../../persistence/domain-bugs-security.js";
import * as taskFactory from "../../tasks/factory/index.js";
import * as logger from "../../utils/logger.js";

const router = express.Router();

/**
 * Get domain bugs & security section
 */
router.get("/:id/bugs-security", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainBugsSecurityPersistence.readDomainBugsSecurity(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain bugs & security not found",
        message: `No bugs & security analysis found for domain: ${id}`,
      });
    }

    // Enrich findings with action status
    const actionsRegistry =
      await domainBugsSecurityPersistence.readBugsSecurityFindingActions(id);

    if (data.findings && actionsRegistry?.actions) {
      const actionsByFindingId = new Map(
        actionsRegistry.actions.map((action) => [action.findingId, action]),
      );

      data.findings = data.findings.map((finding) => {
        const action = actionsByFindingId.get(finding.id);
        return {
          ...finding,
          action: action ? action.action : null,
          actionMetadata: action ? action.metadata : null,
        };
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain bugs & security ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain bugs & security" });
  }
});

/**
 * Analyze domain bugs & security section
 */
router.post("/:id/analyze/bugs-security", async (req, res) => {
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
    const task = await taskFactory.createAnalyzeBugsSecurityTask(
      { domainId: id, files, includeRequirements },
      { executeNow },
    );

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create bugs & security analysis task",
        code: task.code,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating bugs & security analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create bugs & security analysis task" });
  }
});

/**
 * Record action for a bugs & security finding
 */
router.post(
  "/:id/bugs-security/findings/:findingId/actions",
  async (req, res) => {
    try {
      const { id, findingId } = req.params;
      const { action, reason, metadata } = req.body;

      if (
        !action ||
        !["apply", "wont-fix", "fixed-manually"].includes(action)
      ) {
        return res.status(400).json({
          error: "Invalid request",
          message: "action must be one of: apply, wont-fix, fixed-manually",
        });
      }

      const result =
        await domainBugsSecurityPersistence.recordBugsSecurityFindingAction(
          id,
          {
            findingId,
            action,
            reason: reason || "",
            metadata: metadata || {},
          },
        );

      res.status(201).json({
        success: true,
        action: result.action,
        summary: result.registry.summary,
      });
    } catch (error) {
      logger.error(
        `Error recording action for finding ${req.params.findingId} in domain ${req.params.id}`,
        { error, component: "API" },
      );
      res.status(500).json({ error: "Failed to record finding action" });
    }
  },
);

/**
 * Apply a bug or security fix
 */
router.post(
  "/:id/bugs-security/findings/:findingId/apply",
  async (req, res) => {
    try {
      const { id, findingId } = req.params;

      // Read the bugs & security analysis to get the finding details
      const bugsSecurityData =
        await domainBugsSecurityPersistence.readDomainBugsSecurity(id);

      if (!bugsSecurityData) {
        return res.status(404).json({
          error: "Domain bugs & security not found",
          message: `No bugs & security analysis found for domain: ${id}`,
        });
      }

      // Find the specific finding
      const finding = (bugsSecurityData.findings || []).find(
        (f) => f.id === findingId,
      );

      if (!finding) {
        return res.status(404).json({
          error: "Finding not found",
          message: `No finding found with id: ${findingId}`,
        });
      }

      const executeNow = req.body.executeNow !== false;

      // Create a task to apply the fix using Aider
      const task = await taskFactory.createApplyFixTask(
        { domainId: id, finding },
        { executeNow },
      );

      if (task?.success === false) {
        return res.status(500).json({
          error: task.error || "Failed to apply fix",
          code: task.code,
        });
      }

      res.status(201).json({
        success: true,
        message: "Fix application task created",
        task,
      });
    } catch (error) {
      logger.error(
        `Error applying fix ${req.params.findingId} for domain ${req.params.id}`,
        { error, component: "API" },
      );
      res.status(500).json({ error: "Failed to apply fix" });
    }
  },
);

export default router;
