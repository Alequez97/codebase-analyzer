import express from "express";
import * as logger from "../utils/logger.js";
import { createCustomCodebaseTask } from "../tasks/factory/index.js";

const router = express.Router();

/**
 * Start a custom codebase task via the floating agent chat
 * POST /chat/codebase
 *
 * Body: { userInstruction: string, domainId?: string, history?: Array }
 */
router.post("/chat/codebase", async (req, res) => {
  try {
    const { userInstruction, domainId = null, history = [] } = req.body;

    logger.info("Custom codebase chat request received", {
      component: "Chat-API",
      instructionLength: userInstruction?.length,
      domainId,
    });

    if (
      !userInstruction ||
      typeof userInstruction !== "string" ||
      !userInstruction.trim()
    ) {
      return res.status(400).json({
        error: "Invalid request",
        message: "userInstruction string is required",
      });
    }

    const task = await createCustomCodebaseTask(
      { userInstruction: userInstruction.trim(), domainId, history },
      { executeNow: true },
    );

    if (task?.success === false) {
      return res.status(500).json({
        error: task.error || "Failed to create custom codebase task",
        code: task.code,
      });
    }

    logger.info(`Custom codebase task created and executing: ${task.id}`, {
      component: "Chat-API",
      taskId: task.id,
    });

    res.json({
      taskId: task.id,
      message:
        "Custom codebase task started. Listen for socket events for AI responses.",
    });
  } catch (error) {
    logger.error("Error processing custom codebase chat request", {
      error: error.message,
      stack: error.stack,
      component: "Chat-API",
    });

    res.status(500).json({
      error: "Failed to process custom codebase request",
      message: error.message,
    });
  }
});

export default router;
