import express from "express";
import * as taskOrchestrator from "../orchestrators/task.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get all pending tasks
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

export default router;
