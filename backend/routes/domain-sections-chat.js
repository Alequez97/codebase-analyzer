import express from "express";
import * as logger from "../utils/logger.js";
import { SECTION_TYPES } from "../constants/section-types.js";
import { createEditDocumentationTask } from "../tasks/factory/index.js";

const router = express.Router();

/**
 * Chat with AI for domain section editing (Task-based)
 * POST /chat/domain/:domainId/:sectionType
 */
router.post("/chat/domain/:domainId/:sectionType", async (req, res) => {
  try {
    const { domainId, sectionType } = req.params;
    const { message, context, history } = req.body;

    logger.info(
      `AI chat request for domain ${domainId}, section ${sectionType}`,
      {
        component: "Chat-API",
        messageLength: message?.length,
        hasContext: !!context,
        historyLength: history?.length || 0,
      },
    );

    // Validate request
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "message string is required",
      });
    }

    if (!Object.values(SECTION_TYPES).includes(sectionType)) {
      return res.status(400).json({
        error: "Invalid section type",
        message: `Section type must be one of: ${Object.values(SECTION_TYPES).join(", ")}`,
      });
    }

    // Create and execute edit task based on section type
    let task;
    if (sectionType === SECTION_TYPES.DOCUMENTATION) {
      task = await createEditDocumentationTask(
        {
          domainId,
          userMessage: message,
          currentContent: context?.content || null,
          history: history || [],
        },
        { executeNow: true },
      );

      if (task?.success === false) {
        return res.status(500).json({
          error: task.error || "Failed to create edit task",
          code: task.code,
        });
      }
    } else {
      // For other section types, return not implemented for now
      return res.status(501).json({
        error: "Not implemented",
        message: `Editing ${sectionType} is not yet supported`,
      });
    }

    logger.info(`Edit task created and executing: ${task.id}`, {
      component: "Chat-API",
      taskId: task.id,
      sectionType,
    });

    // Return task ID - client will listen for socket events
    res.json({
      taskId: task.id,
      message: "Edit task started. Listen for socket events for AI responses.",
    });
  } catch (error) {
    logger.error("Error processing AI chat request", {
      error: error.message,
      stack: error.stack,
      component: "Chat-API",
    });

    res.status(500).json({
      error: "Failed to process chat request",
      message: error.message,
    });
  }
});

export default router;
