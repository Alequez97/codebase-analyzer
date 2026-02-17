import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import config from "./config.js";
import * as codebaseAnalysisOrchestrator from "./orchestrators/codebase-analysis.js";
import * as codebaseAnalysisPersistence from "./persistence/codebase-analysis.js";
import * as taskOrchestrator from "./orchestrators/task.js";
import * as domainsPersistence from "./persistence/domains.js";
import { detectAvailableAgents, getSupportedAgents } from "./agents/index.js";
import { SOCKET_EVENTS } from "./constants/socket-events.js";
import * as logger from "./utils/logger.js";
import { initSocketEmitter } from "./utils/socket-emitter.js";
import { getProjectFiles } from "./utils/file-scanner.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow any localhost origin for multiple instances
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
});

// Initialize socket emitter for use in agents (avoids circular dependencies)
initSocketEmitter(io);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.http(req.method, req.path);
  next();
});

// ==================== API Routes ====================

/**
 * Health check with configuration status
 */
app.get("/api/status", async (req, res) => {
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
      useMockData: config.useMockData,
    },
    agents,
  });
});

/**
 * Get all project files for autocomplete
 */
app.get("/api/project/files", async (req, res) => {
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

/**
 * Get full codebase analysis
 */
app.get("/api/analysis/codebase", async (req, res) => {
  try {
    const results = await codebaseAnalysisOrchestrator.getCodebaseAnalysis();

    if (!results) {
      return res.status(404).json({
        error: "No codebase analysis found",
        message: 'Click "Analyze Codebase" to start analysis',
      });
    }

    res.json(results);
  } catch (error) {
    logger.error("Error reading codebase analysis", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read codebase analysis" });
  }
});

/**
 * Create a new full codebase analysis task
 */
app.post("/api/analysis/codebase/request", async (req, res) => {
  try {
    const executeNow = req.body.executeNow !== false; // Default to true
    const agent = req.body.agent || "llm-api"; // Use llm-api by default for codebase analysis
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    const task = await taskOrchestrator.createFullCodebaseAnalysisTask(
      executeNow,
      agent,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating codebase analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create codebase analysis task" });
  }
});

/**
 * Get full codebase analysis with all domains
 */
app.get("/api/analysis/codebase/full", async (req, res) => {
  try {
    const analysis = await codebaseAnalysisOrchestrator.getCodebaseAnalysis();

    if (!analysis || !analysis.domains || analysis.domains.length === 0) {
      return res.status(404).json({
        error: "No completed codebase analysis found",
        message: "Run codebase analysis to generate and load domains",
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error("Error reading domains", { error, component: "API" });
    res.status(500).json({ error: "Failed to read domains" });
  }
});

/**
 * Get a specific domain's analysis
 */
app.get("/api/analysis/domain/:id", async (req, res) => {
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
app.get("/api/analysis/domain/:id/files", async (req, res) => {
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
 * Create a task to analyze a specific domain
 */
app.post("/api/analysis/domain/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, files } = req.body;
    const agent = req.body.agent || "aider";
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!domainName || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "domainName and files[] are required",
      });
    }

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    // Mock mode: simulate domain analysis task
    if (config.useMockData) {
      logger.info(`[MOCK MODE] Simulating domain analysis task for: ${id}`);
      const mockTask = {
        id: `mock-task-${Date.now()}`,
        type: "analyze-domain",
        domainId: id,
        domainName,
        status: "pending",
        agent,
        timestamp: new Date().toISOString(),
      };

      // Return task immediately
      res.status(201).json(mockTask);

      // Simulate async completion after delay
      const executeNow = req.body.executeNow !== false;
      if (executeNow) {
        simulateAnalysisDelay(1500).then(() => {
          const domainData = getMockDomainAnalysis(id);
          logger.info(
            `[MOCK MODE] Emitting TASK_COMPLETED with domain data for: ${id}`,
          );
          io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
            taskId: mockTask.id,
            type: "analyze",
            domainId: id,
            timestamp: new Date().toISOString(),
            data: domainData,
          });
        });
      }
      return;
    }

    // Production mode: create real task
    const executeNow = req.body.executeNow !== false; // Default to true
    const task = await taskOrchestrator.createAnalyzeTask(
      id,
      domainName,
      files,
      executeNow,
      agent,
    );
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error creating analyze task", { error, component: "API" });
    res.status(500).json({ error: "Failed to create analyze task" });
  }
});

/**
 * Get domain documentation section
 */
app.get("/api/analysis/domain/:id/documentation", async (req, res) => {
  try {
    const { id } = req.params;

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Returning mock domain documentation for: ${id}`);
      const mockData = getMockDomainDocumentation(id);

      if (!mockData) {
        return res.status(404).json({
          error: "Domain documentation not found",
          message: `No mock documentation available for domain: ${id}`,
        });
      }

      return res.json(mockData);
    }

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
app.get("/api/analysis/domain/:id/requirements", async (req, res) => {
  try {
    const { id } = req.params;

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Returning mock domain requirements for: ${id}`);
      const mockData = getMockDomainRequirements(id);

      if (!mockData) {
        return res.status(404).json({
          error: "Domain requirements not found",
          message: `No mock requirements available for domain: ${id}`,
        });
      }

      return res.json(mockData);
    }

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
 * Get domain testing section
 */
app.get("/api/analysis/domain/:id/testing", async (req, res) => {
  try {
    const { id } = req.params;

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Returning mock domain testing for: ${id}`);
      const mockData = getMockDomainTesting(id);

      if (!mockData) {
        return res.status(404).json({
          error: "Domain testing not found",
          message: `No mock testing data available for domain: ${id}`,
        });
      }

      return res.json(mockData);
    }

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
app.post("/api/analysis/domain/:id/analyze/documentation", async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, files } = req.body;
    const agent = req.body.agent || "aider";
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!domainName || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "domainName and files[] are required",
      });
    }

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    if (config.useMockData) {
      logger.info(
        `[MOCK MODE] Simulating domain documentation analysis for: ${id}`,
      );
      const mockTask = {
        id: `mock-task-${Date.now()}`,
        type: "analyze-domain-documentation",
        domainId: id,
        domainName,
        status: "pending",
        agent,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(mockTask);

      const executeNow = req.body.executeNow !== false;
      if (executeNow) {
        simulateAnalysisDelay(1500).then(() => {
          const data = getMockDomainDocumentation(id);
          logger.info(
            `[MOCK MODE] Emitting TASK_COMPLETED with documentation data for: ${id}`,
          );
          io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
            taskId: mockTask.id,
            type: "analyze-documentation",
            domainId: id,
            timestamp: new Date().toISOString(),
            data,
          });
        });
      }
      return;
    }

    // TODO: Production mode - create real task
    res.status(501).json({ error: "Not implemented in production mode yet" });
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
app.post("/api/analysis/domain/:id/analyze/requirements", async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, files } = req.body;
    const agent = req.body.agent || "aider";
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!domainName || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "domainName and files[] are required",
      });
    }

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    if (config.useMockData) {
      logger.info(
        `[MOCK MODE] Simulating domain requirements analysis for: ${id}`,
      );
      const mockTask = {
        id: `mock-task-${Date.now()}`,
        type: "analyze-domain-requirements",
        domainId: id,
        domainName,
        status: "pending",
        agent,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(mockTask);

      const executeNow = req.body.executeNow !== false;
      if (executeNow) {
        simulateAnalysisDelay(1500).then(() => {
          const data = getMockDomainRequirements(id);
          logger.info(
            `[MOCK MODE] Emitting TASK_COMPLETED with requirements data for: ${id}`,
          );
          io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
            taskId: mockTask.id,
            type: "analyze-requirements",
            domainId: id,
            timestamp: new Date().toISOString(),
            data,
          });
        });
      }
      return;
    }

    // TODO: Production mode - create real task
    res.status(501).json({ error: "Not implemented in production mode yet" });
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
 * Analyze domain testing section
 */
app.post("/api/analysis/domain/:id/analyze/testing", async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, files } = req.body;
    const agent = req.body.agent || "aider";
    const supportedAgentIds = getSupportedAgents().map((item) => item.id);

    if (!domainName || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "domainName and files[] are required",
      });
    }

    if (!supportedAgentIds.includes(agent)) {
      return res.status(400).json({
        error: "Invalid request",
        message: `Unsupported agent: ${agent}`,
      });
    }

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Simulating domain testing analysis for: ${id}`);
      const mockTask = {
        id: `mock-task-${Date.now()}`,
        type: "analyze-domain-testing",
        domainId: id,
        domainName,
        status: "pending",
        agent,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(mockTask);

      const executeNow = req.body.executeNow !== false;
      if (executeNow) {
        simulateAnalysisDelay(1500).then(() => {
          const data = getMockDomainTesting(id);
          logger.info(
            `[MOCK MODE] Emitting TASK_COMPLETED with testing data for: ${id}`,
          );
          io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
            taskId: mockTask.id,
            type: "analyze-testing",
            domainId: id,
            timestamp: new Date().toISOString(),
            data,
          });
        });
      }
      return;
    }

    // TODO: Production mode - create real task
    res.status(501).json({ error: "Not implemented in production mode yet" });
  } catch (error) {
    logger.error("Error creating testing analysis task", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to create testing analysis task" });
  }
});

/**
 * Save edited requirements
 */
app.post("/api/analysis/domain/:id/requirements/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { requirements, domainName } = req.body;

    if (!requirements || !Array.isArray(requirements)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "requirements[] array is required",
      });
    }

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Simulating requirements save for: ${id}`);
      // In mock mode, just return success
      return res.json({
        success: true,
        message: "Requirements saved successfully (mock mode)",
      });
    }

    // Production mode: save to file
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
app.post("/api/analysis/domain/:id/files/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "files[] array is required",
      });
    }

    if (config.useMockData) {
      logger.info(`[MOCK MODE] Simulating files save for: ${id}`);
      return res.json({
        success: true,
        message: "Files saved successfully (mock mode)",
      });
    }

    // Production mode: update domain files in codebase analysis
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
app.post("/api/analysis/domain/:id/tests/:testId/apply", async (req, res) => {
  try {
    const { id, testId } = req.params;

    if (config.useMockData) {
      logger.info(
        `[MOCK MODE] Simulating test application for ${testId} in domain: ${id}`,
      );

      // Simulate async operation
      await simulateAnalysisDelay(800);

      return res.json({
        success: true,
        message: `Test ${testId} applied successfully (mock mode)`,
        testId,
        domainId: id,
      });
    }

    // TODO: Production mode - implement test application logic
    res.status(501).json({ error: "Not implemented in production mode yet" });
  } catch (error) {
    logger.error(
      `Error applying test ${req.params.testId} for domain ${req.params.id}`,
      { error, component: "API" },
    );
    res.status(500).json({ error: "Failed to apply test" });
  }
});

/**
 * Get all pending tasks
 */
app.get("/api/tasks/pending", async (req, res) => {
  try {
    const tasks = await taskOrchestrator.getPendingTasks();
    res.json({ tasks });
  } catch (error) {
    logger.error("Error reading pending tasks", { error, component: "API" });
    res.status(500).json({ error: "Failed to read pending tasks" });
  }
});

/**
 * Get task logs by task ID
 */
app.get("/api/tasks/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskOrchestrator.getTask(id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
        message: `No task found with ID: ${id}`,
      });
    }

    if (!task.logFile) {
      return res.status(404).json({
        error: "No log file available",
        message: "This task has not been executed yet or does not have logs",
      });
    }

    // Read log file
    const logPath = path.join(config.paths.targetAnalysis, task.logFile);

    try {
      const logContent = await fs.readFile(logPath, "utf-8");
      res.json({
        taskId: id,
        logFile: task.logFile,
        content: logContent,
        taskType: task.type,
        taskStatus: task.status,
      });
    } catch (fileError) {
      if (fileError.code === "ENOENT") {
        return res.status(404).json({
          error: "Log file not found",
          message: `Log file exists in task metadata but file not found: ${task.logFile}`,
        });
      }
      throw fileError;
    }
  } catch (error) {
    logger.error(`Error reading task logs for ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to read task logs" });
  }
});

/**
 * Delete a task
 */
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await taskOrchestrator.deleteTask(id);
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    logger.error(`Error deleting task ${req.params.id}`, {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// TODO: Fix application endpoint
// app.post('/api/fix/:moduleId/:issueId', async (req, res) => { ... });

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  logger.error("Unhandled error", { error: err, component: "API" });
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ==================== Socket.IO ====================

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  logger.debug(`Client connected: ${socket.id}`, { component: "WebSocket" });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    logger.debug(`Client disconnected: ${socket.id}`, {
      component: "WebSocket",
    });
  });
});

// ==================== Start Server ====================

httpServer.listen(config.port, () => {
  logger.info("");
  logger.info("========================================");
  logger.info("  Codebase Analyzer API");
  logger.info("========================================");
  logger.info(`  Port: ${config.port}`);
  logger.info(`  Mode: ${config.useMockData ? "MOCK DATA" : "PRODUCTION"}`);
  logger.info(`  Target: ${config.target.name}`);
  logger.info(`  Project: ${config.target.directory}`);
  logger.info(`  Output: ${config.paths.targetAnalysis}`);
  logger.info("========================================");
  logger.info("");
  logger.info(`API running at http://localhost:${config.port}`);
  logger.info(
    `Open dashboard at http://localhost:5173 (if frontend is running)`,
  );
  logger.info("WebSocket ready for real-time updates");
  if (config.useMockData) {
    logger.warn(
      "⚠️  MOCK MODE ENABLED - Using sample data instead of real analysis",
    );
  }
  logger.info("");
});
