import express from "express";
import config from "../config.js";
import { getProjectFiles } from "../utils/file-scanner.js";
import * as logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get all project files for autocomplete
 */
router.get("/files", async (req, res) => {
  try {
    const files = await getProjectFiles(config.target.directory);

    res.json({
      files,
      count: files.length,
      projectPath: config.target.directory,
    });
  } catch (error) {
    logger.error("Error scanning project files", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to scan project files" });
  }
});

export default router;
