import express from "express";
import config from "../config.js";
import { detectAvailableAgents } from "../agents/index.js";

const router = express.Router();

/**
 * Health check with configuration status
 */
router.get("/", async (req, res) => {
  const agents = await detectAvailableAgents();

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
    agents,
  });
});

export default router;
