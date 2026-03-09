import express from "express";
import * as logger from "../utils/logger.js";
import { SECTION_TYPES } from "../constants/section-types.js";
import { createEditDocumentationTask } from "../tasks/factory/index.js";
import {
  loadDomainSectionChatHistory,
  appendDomainSectionChatMessage,
  deleteDomainSectionChatHistory,
  listDomainSectionChatSessions,
} from "../utils/chat-history.js";

const router = express.Router();

/**
 * List all chat sessions for a domain section (metadata only, no messages)
 * GET /chat/domain/:domainId/:sectionType/sessions
 */
router.get("/chat/domain/:domainId/:sectionType/sessions", async (req, res) => {
  try {
    const { domainId, sectionType } = req.params;
    const sessions = await listDomainSectionChatSessions(domainId, sectionType);
    res.json({ sessions });
  } catch (error) {
    logger.error(
      `Error listing chat sessions for ${req.params.domainId}/${req.params.sectionType}`,
      { error, component: "Chat-API" },
    );
    res.status(500).json({ error: "Failed to list chat sessions" });
  }
});

/**
 * Get persistent chat history for a domain section
 * GET /chat/domain/:domainId/:sectionType/history
 */
router.get("/chat/domain/:domainId/:sectionType/history", async (req, res) => {
  try {
    const { domainId, sectionType } = req.params;
    const { chatId } = req.query;
    const history = await loadDomainSectionChatHistory(
      domainId,
      sectionType,
      chatId || null,
    );
    res.json(history || { domainId, sectionType, messages: [] });
  } catch (error) {
    logger.error(
      `Error loading chat history for ${req.params.domainId}/${req.params.sectionType}`,
      {
        error,
        component: "Chat-API",
      },
    );
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

/**
 * Append a message to a domain section's chat history
 * POST /chat/domain/:domainId/:sectionType/history
 */
router.post("/chat/domain/:domainId/:sectionType/history", async (req, res) => {
  try {
    const { domainId, sectionType } = req.params;
    const { role, content, chatId } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "role and content are required" });
    }

    await appendDomainSectionChatMessage(domainId, sectionType, {
      role,
      content,
      chatId: chatId || undefined,
    });
    res.json({ success: true });
  } catch (error) {
    logger.error(
      `Error appending chat message for ${req.params.domainId}/${req.params.sectionType}`,
      {
        error,
        component: "Chat-API",
      },
    );
    res.status(500).json({ error: "Failed to append chat message" });
  }
});

/**
 * Delete chat history for a domain section
 * DELETE /chat/domain/:domainId/:sectionType/history
 */
router.delete(
  "/chat/domain/:domainId/:sectionType/history",
  async (req, res) => {
    try {
      const { domainId, sectionType } = req.params;
      const { chatId } = req.query;
      await deleteDomainSectionChatHistory(
        domainId,
        sectionType,
        chatId || null,
      );
      res.json({ success: true });
    } catch (error) {
      logger.error(
        `Error deleting chat history for ${req.params.domainId}/${req.params.sectionType}`,
        {
          error,
          component: "Chat-API",
        },
      );
      res.status(500).json({ error: "Failed to delete chat history" });
    }
  },
);

/**
 * Chat with AI for domain section editing (Task-based)
 * POST /chat/domain/:domainId/:sectionType
 */
router.post("/chat/domain/:domainId/:sectionType", async (req, res) => {
  try {
    const { domainId, sectionType } = req.params;
    const { message, context, chatId: requestChatId } = req.body;

    logger.info(
      `AI chat request for domain ${domainId}, section ${sectionType}`,
      {
        component: "Chat-API",
        messageLength: message?.length,
        hasContext: !!context,
        chatId: requestChatId,
      },
    );

    // Validate request
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "message string is required",
      });
    }

    if (!requestChatId || typeof requestChatId !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "chatId is required (stable session UUID from the frontend)",
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
      // 1. Create the task (not yet running) so we know the taskId.
      //    chatId comes from the frontend — it is the stable session ID.
      task = await createEditDocumentationTask(
        { domainId, chatId: requestChatId },
        { executeNow: false },
      );

      if (task?.success === false) {
        return res.status(500).json({
          error: task.error || "Failed to create edit task",
          code: task.code,
        });
      }

      // 2. Persist the user message to the session chat file.
      //    The execution handler will load this (plus any prior history) at
      //    runtime, so task params stay free of chat content.
      await appendDomainSectionChatMessage(domainId, sectionType, {
        role: "user",
        content: message,
        chatId: requestChatId,
      });

      // 3. Execute asynchronously — response arrives via socket events
      const { executeTask } = await import("../orchestrators/task.js");
      executeTask(task.id).catch((err) => {
        logger.error(`Failed to execute edit task ${task.id}`, {
          error: err,
          component: "Chat-API",
        });
      });
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

    // Return the stable chatId so the frontend can confirm routing,
    // plus the taskId if it needs to cancel the running task.
    res.json({
      taskId: task.id,
      chatId: requestChatId,
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
