import express from "express";
import config from "../config.js";
import { detectAvailableAgents } from "../agents/index.js";

const router = express.Router();

/**
 * Health check with configuration status
 */
router.get("/", async (req, res) => {
  const agents = await detectAvailableAgents();

  // Build a task-type → model-id map so the frontend can show the default model label
  const taskModels = Object.fromEntries(
    Object.entries(config.tasks).map(([taskType, cfg]) => [
      taskType,
      cfg.model,
    ]),
  );

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    target: {
      directory: config.target.directory,
      name: config.target.name,
    },
    config: {
      port: config.port,
    },
    taskModels,
    agents,
  });
});

export default router;
