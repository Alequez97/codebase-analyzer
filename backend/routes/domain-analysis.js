import express from "express";
import * as domainAggregatePersistence from "../persistence/domain-aggregate.js";
import * as domainDocumentationPersistence from "../persistence/domain-documentation.js";
import * as domainDiagramsPersistence from "../persistence/domain-diagrams.js";
import * as domainRequirementsPersistence from "../persistence/domain-requirements.js";
import * as domainTestingPersistence from "../persistence/domain-testing.js";
import * as domainBugsSecurityPersistence from "../persistence/domain-bugs-security.js";
import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as taskOrchestrator from "../orchestrators/task.js";
import * as logger from "../utils/logger.js";
import { SECTION_TYPES } from "../constants/section-types.js";
import { readMockJson } from "../utils/mock-data.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
 * Get domain documentation section
 */
router.get("/:id/documentation", async (req, res) => {
  try {
    const { id } = req.params;

    const data =
      await domainDocumentationPersistence.readDomainDocumentation(id);

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

    const data = await domainRequirementsPersistence.readDomainRequirements(id);

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

    const data = await domainBugsSecurityPersistence.readDomainBugsSecurity(id);

    if (!data) {
      return res.status(404).json({
        error: "Domain bugs & security not found",
        message: `No bugs & security analysis found for domain: ${id}`,
      });
    }

    // Enrich findings with action status
    const actionsRegistry =
      await domainBugsSecurityPersistence.readBugsSecurityFindingActions(id);

    if (data.findings && actionsRegistry?.actions) {
      const actionsByFindingId = new Map(
        actionsRegistry.actions.map((action) => [action.findingId, action]),
      );

      data.findings = data.findings.map((finding) => {
        const action = actionsByFindingId.get(finding.id);
        return {
          ...finding,
          action: action ? action.action : null,
          actionMetadata: action ? action.metadata : null,
        };
      });
    }

    res.json(data);
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

    // Try to read from persistence first
    let data = await domainTestingPersistence.readDomainTesting(id);

    // If not found, return mock data for UI testing
    if (!data) {
      try {
        data = await readMockJson([
          "domains",
          "user-authentication",
          "testing.json",
        ]);
        logger.info(`Serving mock testing data for domain ${id}`, {
          component: "API",
        });
      } catch (mockError) {
        return res.status(404).json({
          error: "Domain testing not found",
          message: `No testing data found for domain: ${id}`,
        });
      }
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
    const { files, includeRequirements = false } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeBugsSecurityTask(
      id,
      files,
      includeRequirements,
      executeNow,
    );
    res.status(201).json(task);
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
 * Record action for a bugs & security finding
 */
router.post(
  "/:id/bugs-security/findings/:findingId/actions",
  async (req, res) => {
    try {
      const { id, findingId } = req.params;
      const { action, reason, metadata } = req.body;

      if (
        !action ||
        !["apply", "wont-fix", "fixed-manually"].includes(action)
      ) {
        return res.status(400).json({
          error: "Invalid request",
          message: "action must be one of: apply, wont-fix, fixed-manually",
        });
      }

      const result =
        await domainBugsSecurityPersistence.recordBugsSecurityFindingAction(
          id,
          {
            findingId,
            action,
            reason: reason || "",
            metadata: metadata || {},
          },
        );

      res.status(201).json({
        success: true,
        action: result.action,
        summary: result.registry.summary,
      });
    } catch (error) {
      logger.error(
        `Error recording action for finding ${req.params.findingId} in domain ${req.params.id}`,
        { error, component: "API" },
      );
      res.status(500).json({ error: "Failed to record finding action" });
    }
  },
);

/**
 * Analyze domain testing section
 */
router.post("/:id/analyze/testing", async (req, res) => {
  try {
    const { id } = req.params;
    const { files, includeRequirements = false } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false;
    const task = await taskOrchestrator.createAnalyzeTestingTask(
      id,
      files,
      includeRequirements,
      executeNow,
    );
    res.status(201).json(task);
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

    await domainDocumentationPersistence.writeDomainDocumentation(id, {
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

    await domainRequirementsPersistence.writeDomainRequirements(id, {
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

    // Read the testing analysis to get the test details
    const testingData = await domainTestingPersistence.readDomainTesting(id);

    if (!testingData) {
      return res.status(404).json({
        error: "Domain testing not found",
        message: `No testing analysis found for domain: ${id}`,
      });
    }

    // Find the specific test recommendation
    const allTests = [
      ...(testingData.missingTests?.unit || []),
      ...(testingData.missingTests?.integration || []),
      ...(testingData.missingTests?.e2e || []),
    ];

    const testRecommendation = allTests.find((t) => t.id === testId);

    if (!testRecommendation) {
      return res.status(404).json({
        error: "Test not found",
        message: `No test recommendation found with id: ${testId}`,
      });
    }

    const executeNow = req.body.executeNow !== false;

    // Create a task to apply the test
    const task = await taskOrchestrator.createApplyTestTask(
      id,
      testRecommendation,
      executeNow,
    );

    res.status(201).json({
      success: true,
      message: "Test application task created",
      task,
    });
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
      SECTION_TYPES.DOCUMENTATION,
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

/**
 * Apply a bug or security fix
 */
router.post(
  "/:id/bugs-security/findings/:findingId/apply",
  async (req, res) => {
    try {
      const { id, findingId } = req.params;

      // Read the bugs & security analysis to get the finding details
      const bugsSecurityData =
        await domainBugsSecurityPersistence.readDomainBugsSecurity(id);

      if (!bugsSecurityData) {
        return res.status(404).json({
          error: "Domain bugs & security not found",
          message: `No bugs & security analysis found for domain: ${id}`,
        });
      }

      // Find the specific finding
      const finding = (bugsSecurityData.findings || []).find(
        (f) => f.id === findingId,
      );

      if (!finding) {
        return res.status(404).json({
          error: "Finding not found",
          message: `No finding found with id: ${findingId}`,
        });
      }

      const executeNow = req.body.executeNow !== false;

      // Create a task to apply the fix using Aider
      const task = await taskOrchestrator.createApplyFixTask(
        id,
        finding,
        executeNow,
      );

      res.status(201).json({
        success: true,
        message: "Fix application task created",
        task,
      });
    } catch (error) {
      logger.error(
        `Error applying fix ${req.params.findingId} for domain ${req.params.id}`,
        { error, component: "API" },
      );
      res.status(500).json({ error: "Failed to apply fix" });
    }
  },
);

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
