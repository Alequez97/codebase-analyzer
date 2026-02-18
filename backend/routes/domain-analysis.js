import express from "express";
import * as domainsPersistence from "../persistence/domains.js";
import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as taskOrchestrator from "../orchestrators/task.js";
import { DEFAULT_AGENTS } from "../agents/index.js";
import * as logger from "../utils/logger.js";
import { readMockJson, sleep } from "../utils/mock-data.js";

const router = express.Router();

/**
 * Get a specific domain's analysis
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await domainsPersistence.readDomain(id);

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
 * Get domain documentation section
 */
router.get("/:id/documentation", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainsPersistence.readDomainDocumentation(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain documentation not found",
        message: `No documentation found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain documentation ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain documentation" });
  }
});

/**
 * Get domain requirements section
 */
router.get("/:id/requirements", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainsPersistence.readDomainRequirements(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain requirements not found",
        message: `No requirements found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain requirements ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain requirements" });
  }
});

/**
 * Get domain bugs & security section
 */
router.get("/:id/bugs-security", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readMockJson(["domains", "bugs-security-analysis.json"]);
    res.json({
      ...data,
      domainId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error reading domain bugs & security ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain bugs & security" });
  }
});

/**
 * Get domain testing section
 */
router.get("/:id/testing", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await domainsPersistence.readDomainTesting(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain testing not found",
        message: `No testing data found for domain: ${id}`,
      });
    }

    res.json(data);
  } catch (error) {
    logger.error(`Error reading domain testing ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read domain testing" });
  }
});

/**
 * Analyze domain documentation section
 */
router.post("/:id/analyze/documentation", async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;
    const agent = DEFAULT_AGENTS.DOMAIN_DOCUMENTATION;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeDocumentationTask(
      id,
      files,
      executeNow,
      agent,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating documentation analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create documentation analysis task" });
  }
});

/**
 * Analyze domain requirements section
 */
router.post("/:id/analyze/requirements", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, userContext, includeDocumentation = false } = req.body;
    const agent = DEFAULT_AGENTS.DOMAIN_REQUIREMENTS;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeRequirementsTask(
      id,
      files,
      userContext || "",
      includeDocumentation,
      executeNow,
      agent,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating requirements analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create requirements analysis task" });
  }
});

/**
 * Analyze domain bugs & security section
 */
router.post("/:id/analyze/bugs-security", async (req, res) => {
  try {
    const { id } = req.params;
    const includeRequirements = req.body?.includeRequirements === true;

    await sleep(1500);

    const data = await readMockJson(["domains", "bugs-security-analysis.json"]);

    res.json({
      ...data,
      domainId: id,
      includesRequirements: includeRequirements,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error creating bugs & security analysis task", {
      error,
      component: "API",
    });
    res
      .status(500)
      .json({ error: "Failed to create bugs & security analysis task" });
  }
});

/**
 * Analyze domain testing section
 */
router.post("/:id/analyze/testing", async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;
    const agent = DEFAULT_AGENTS.DOMAIN_TESTING;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    // TODO: Implement testing analysis task orchestrator
    res.status(501).json({ error: "Testing analysis not implemented yet" });
  } catch (error) {
    logger.error("Error creating testing analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create testing analysis task" });
  }
});

/**
 * Save edited documentation
 */
router.post("/:id/documentation/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { documentation } = req.body;

    if (!documentation || typeof documentation !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "documentation string is required",
      });
    }

    await domainsPersistence.writeDomainDocumentation(id, {
      content: documentation,
      metadata: {
        status: "completed",
        lastModified: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: "Documentation saved successfully",
    });
  } catch (error) {
    logger.error(`Error saving documentation for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save documentation" });
  }
});

/**
 * Save edited requirements
 */
router.post("/:id/requirements/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { requirements, domainName } = req.body;

    if (!requirements || !Array.isArray(requirements)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "requirements[] array is required",
      });
    }

    await domainsPersistence.writeDomainRequirements(id, {
      domainId: id,
      domainName: domainName || id,
      timestamp: new Date().toISOString(),
      requirements,
    });

    res.json({
      success: true,
      message: "Requirements saved successfully",
    });
  } catch (error) {
    logger.error(`Error saving requirements for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to save requirements" });
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
 * Apply a single test
 */
router.post("/:id/tests/:testId/apply", async (req, res) => {
  try {
    const { id, testId } = req.params;

    // TODO: Implement test application logic
    res.status(501).json({ error: "Test application not implemented yet" });
  } catch (error) {
    logger.error(
      `Error applying test ${req.params.testId} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to apply test" });
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
      "documentation",
      "requirements",
      "testing",
      "bugs-security",
    ];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: "Invalid section",
        message: `Section must be one of: ${validSections.join(", ")}`,
      });
    }

    const logs = await domainsPersistence.readDomainSectionLogs(id, section);

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
