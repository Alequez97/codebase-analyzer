import express from "express";
import { queueReviewChangesTask } from "../tasks/queue/index.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/review-changes
 * Trigger a review-changes task that diffs the working tree and
 * delegates targeted edit-* tasks for affected domain sections.
 *
 * Body (all optional):
 *   baseBranch  {string}   - Branch/commit to diff against
 *   domainIds   {string[]} - Scope review to specific domains
 *   model       {string}   - Override LLM model
 */
router.post("/", async (req, res) => {
  const { baseBranch, domainIds, model } = req.body || {};

  try {
    const task = await queueReviewChangesTask({ baseBranch, domainIds, model });

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to queue review-changes task",
        code: task.code,
      });
    }

    res.status(201).json(task);
  } catch (error) {
    logger.error("Error queuing review-changes task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to queue review-changes task" });
  }
});

export default router;
