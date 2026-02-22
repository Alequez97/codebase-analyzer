import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import * as domainDiagramsPersistence from "../../persistence/domain-diagrams.js";
import * as taskOrchestrator from "../../orchestrators/task.js";
import * as logger from "../../utils/logger.js";

const execAsync = promisify(exec);
const router = express.Router();

/**
 * Get domain diagrams section
 */
router.get("/:id/diagrams", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainDiagramsPersistence.readDomainDiagrams(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain diagrams not found",
        message: `No diagrams found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain diagrams ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain diagrams" });
  }
});

/**
 * Get a specific diagram file
 */
router.get("/:id/diagrams/:fileName", async (req, res) => {
  try {
    const { id, fileName } = req.params;

    if (!fileName.endsWith(".drawio")) {
      return res.status(400).json({
        error: "Invalid request",
        message: "File must be a .drawio file",
      });
    }

    const content = await domainDiagramsPersistence.readDiagramFile(
      id,
      fileName,
    );

    res.set("Content-Type", "application/xml");
    res.send(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        error: "Diagram not found",
        message: `Diagram file not found: ${req.params.fileName}`,
      });
    }
    logger.error(
      `Error reading diagram file ${req.params.fileName} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to read diagram file" });
  }
});

/**
 * Analyze domain diagrams section
 */
router.post("/:id/analyze/diagrams", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, includeDocumentation = true } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeDiagramsTask(
      id,
      files,
      includeDocumentation,
      executeNow,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating diagrams analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create diagrams analysis task" });
  }
});

/**
 * Save edited diagrams metadata
 */
router.put("/:id/diagrams", async (req, res) => {
  try {
    const { id } = req.params;
    const { diagrams } = req.body;

    if (!diagrams || !Array.isArray(diagrams)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "diagrams[] are required",
      });
    }

    await domainDiagramsPersistence.writeDomainDiagrams(id, { diagrams });

    res.json({ success: true, message: "Diagrams metadata saved" });
  } catch (error) {
    logger.error(`Error saving diagrams metadata for domain ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save diagrams metadata" });
  }
});

/**
 * Open diagram file in VS Code
 */
router.post("/:id/diagrams/:fileName/open-in-editor", async (req, res) => {
  try {
    const { id, fileName } = req.params;

    const filePath = domainDiagramsPersistence.getDiagramFilePath(id, fileName);

    try {
      await execAsync(`code "${filePath}"`);
      res.json({ success: true, message: "File opened in VS Code" });
    } catch (execError) {
      logger.warn("Failed to open file in VS Code", {
        error: execError,
        component: "API",
      });
      res.status(500).json({
        error: "Failed to open in VS Code",
        message:
          "Make sure VS Code is installed and accessible via 'code' command",
        filePath,
      });
    }
  } catch (error) {
    logger.error(
      `Error opening diagram in editor for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to open diagram in editor" });
  }
});

export default router;
