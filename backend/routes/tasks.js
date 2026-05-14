import express from "express";
import * as taskOrchestrator from "../orchestrators/task.js";
import { TASK_ERROR_CODES } from "@jet-source/task-queue";
import { TASK_TYPES } from "../constants/task-types.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import {
  loadChatHistory,
  appendChatMessage,
  deleteChatHistory,
} from "../utils/chat-history.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get tasks with optional filters
 * Query params: dateFrom, dateTo, status (comma-separated)
 */
router.get("/", async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const filters = {};

    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (status) filters.status = status.split(",").map((s) => s.trim());

    const tasks = await taskOrchestrator.getTasks(filters);
    res.json({ tasks });
  } catch (error) {
    logger.error("Error reading tasks", { error, component: "API" });
    res.status(500).json({ error: "Failed to read tasks" });
  }
});

/**
 * Get all pending tasks (legacy endpoint)
 */
router.get("/pending", async (req, res) => {
  try {
    const tasks = await taskOrchestrator.getPendingTasks();
    res.json({ tasks });
  } catch (error) {
    logger.error("Error reading pending tasks", { error, component: "API" });
    res.status(500).json({ error: "Failed to read pending tasks" });
  }
});

/**
 * Delete a task
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await taskOrchestrator.deleteTask(id);

    if (!result.success) {
      if (result.code === TASK_ERROR_CODES.NOT_FOUND) {
        return res.status(404).json({ error: result.error });
      }

      return res
        .status(500)
        .json({ error: result.error || "Failed to delete task" });
    }

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    logger.error(`Error deleting task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to delete task" });
  }
});

/**
 * Cancel a running task
 * POST /tasks/:id/cancel
 */
router.post("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskOrchestrator.getTask(id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Cancel the task (moves to canceled folder)
    const result = await taskOrchestrator.cancelTask(id);

    if (!result.success) {
      if (result.code === TASK_ERROR_CODES.NOT_FOUND) {
        return res.status(404).json({ error: result.error });
      }

      return res
        .status(500)
        .json({ error: result.error || "Failed to cancel task" });
    }

    logger.info(`Task ${id} cancelled by user`, { component: "API" });

    // For custom codebase tasks, emit additional event for chat UI
    if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
      emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_CANCELLED, {
        taskId: id,
        domainId: task.params?.domainId || null,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: "Task cancelled" });
  } catch (error) {
    logger.error(`Error cancelling task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to cancel task" });
  }
});

/**
 * Restart a failed or pending task
 * POST /tasks/:id/restart
 */
router.post("/:id/restart", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await taskOrchestrator.restartTask(id);

    if (!result.success) {
      if (result.code === TASK_ERROR_CODES.NOT_FOUND) {
        return res.status(404).json({ error: result.error });
      }

      if (result.code === TASK_ERROR_CODES.INVALID_STATUS) {
        return res.status(400).json({ error: result.error });
      }

      return res
        .status(500)
        .json({ error: result.error || "Failed to restart task" });
    }

    logger.info(`Task ${id} restarted by user`, { component: "API" });

    res.json({
      success: true,
      message: "Task restarted and moved to pending queue",
      task: result.task,
    });
  } catch (error) {
    logger.error(`Error restarting task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to restart task" });
  }
});

/**
 * Get chat history for a task
 * GET /tasks/:id/chat-history
 */
router.get("/:id/chat-history", async (req, res) => {
  try {
    const { id } = req.params;
    const history = await loadChatHistory(id);

    if (!history) {
      return res.status(404).json({ error: "Chat history not found" });
    }

    res.json(history);
  } catch (error) {
    logger.error(`Error loading chat history for task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

/**
 * Append a message to a task's chat history
 * POST /tasks/:id/chat-history
 */
router.post("/:id/chat-history", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "role and content are required" });
    }

    await appendChatMessage(id, { role, content });
    res.json({ success: true });
  } catch (error) {
    logger.error(`Error appending chat message for task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to append chat message" });
  }
});

/**
 * Delete chat history for a task
 * DELETE /tasks/:id/chat-history
 */
router.delete("/:id/chat-history", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteChatHistory(id);
    res.json({ success: true, message: "Chat history cleared" });
  } catch (error) {
    logger.error(`Error deleting chat history for task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to delete chat history" });
  }
});

/**
 * Provide user response to a waiting task
 * POST /tasks/:id/respond
 *
 * This endpoint is called when a user responds to a message_user tool call.
 * It resumes the task execution with the user's response.
 */
router.post("/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || typeof response !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "response string is required",
      });
    }

    logger.info(`User response received for task ${id}`, {
      component: "API",
      responseLength: response.length,
    });

    const result = await taskOrchestrator.provideUserResponse(
      id,
      response.trim(),
    );

    if (!result.success) {
      return res.status(404).json({
        error: result.error || "No pending response request for this task",
      });
    }

    res.json({
      success: true,
      message: "Response delivered, task resumed",
    });
  } catch (error) {
    logger.error(`Error providing user response for task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to deliver user response" });
  }
});

export default router;
