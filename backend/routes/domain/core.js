import express from "express";
import * as domainAggregatePersistence from "../../persistence/domain-aggregate.js";
import * as codebaseAnalysisPersistence from "../../persistence/codebase-analysis.js";
import * as logger from "../../utils/logger.js";
import { SECTION_TYPES } from "../../constants/section-types.js";

const router = express.Router();

/**
 * Get a specific domain's analysis
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await domainAggregatePersistence.readDomain(id);

    if (!analysis) {
      return res.status(404).json({
        error: "Domain analysis not found",
        message: `No analysis found for domain: ${id}`,
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error(`Error reading domain ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain analysis" });
  }
});

/**
 * Get files list for a domain from codebase analysis
 */
router.get("/:id/files", async (req, res) => {
  try {
    const { id } = req.params;

    const codebaseAnalysis = await codebaseAnalysisPersistence.read();

    if (!codebaseAnalysis) {
      return res.status(404).json({
        error: "Codebase analysis not found",
        message: "No codebase analysis available",
      });
    }

    const domain = (codebaseAnalysis.domains || []).find((d) => d.id === id);

    if (!domain) {
      return res.status(404).json({
        error: "Domain not found",
        message: `No domain found with id: ${id}`,
      });
    }

    res.json({ files: domain.files || [] });
  } catch (error) {
    logger.error(`Error reading domain files ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain files" });
  }
});

/**
 * Save domain files
 */
router.post("/:id/files/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] array is required",
      });
    }

    const updatedAnalysis = await codebaseAnalysisPersistence.updateDomainFiles(
      id,
      files,
    );

    if (!updatedAnalysis) {
      return res.status(404).json({
        error: "Domain not found",
        message: `Domain ${id} not found in codebase analysis`,
      });
    }

    res.json({
      success: true,
      message: "Files saved successfully",
      domain: updatedAnalysis.domains.find((d) => d.id === id),
    });
  } catch (error) {
    logger.error(`Error saving files for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save files" });
  }
});

/**
 * Get logs for a specific domain section
 */
router.get("/:id/logs/:section", async (req, res) => {
  try {
    const { id, section } = req.params;

    // Validate section parameter
    const validSections = [
      SECTION_TYPES.DOCUMENTATION,
      SECTION_TYPES.DIAGRAMS,
      SECTION_TYPES.REQUIREMENTS,
      SECTION_TYPES.TESTING,
      SECTION_TYPES.BUGS_SECURITY,
    ];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: "Invalid section",
        message: `Section must be one of: ${validSections.join(", ")}`,
      });
    }

    const logs = await domainAggregatePersistence.readDomainSectionLogs(
      id,
      section,
    );

    if (!logs) {
      return res.status(404).json({
        error: "Logs not found",
        message: `No logs found for domain ${id} section ${section}`,
      });
    }

    res.json({ content: logs, section, domainId: id });
  } catch (error) {
    logger.error(
      `Error reading logs for domain ${req.params.id} section ${req.params.section}`,
      { error, component: "API" },
    );
    res.status(500).json({
      error: "Failed to read domain section logs",
    });
  }
});

export default router;
