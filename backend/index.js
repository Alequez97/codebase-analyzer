import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import config from "./config.js";
import * as codebaseAnalysisOrchestrator from "./orchestrators/codebase-analysis.js";
import * as taskOrchestrator from "./orchestrators/task.js";
import * as domainsPersistence from "./persistence/domains.js";
import { detectAvailableAgents, getSupportedAgents } from "./agents/index.js";
import { SOCKET_EVENTS } from "./constants/socket-events.js";

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

// Export io for use in other modules
export { io };

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ==================== API Routes ====================

/**
 * Get tool discovery information for frontend
 */
app.get("/api/tools", async (req, res) => {
  const availableAgents = await detectAvailableAgents();
  const supportedAgents = getSupportedAgents();

  const tools = supportedAgents.map((agent) => ({
    ...agent,
    available: !!availableAgents[agent.id],
  }));

  res.json({ tools });
});

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
    },
    agents,
  });
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
    console.error("Error reading codebase analysis:", error);
    res.status(500).json({ error: "Failed to read codebase analysis" });
  }
});

/**
 * Create a new full codebase analysis task
 */
app.post("/api/analysis/codebase/request", async (req, res) => {
  try {
    const executeNow = req.body.executeNow !== false; // Default to true
    const agent = req.body.agent || "aider";
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
    console.error("Error creating codebase analysis task:", error);
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
    console.error("Error reading domains:", error);
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
    console.error(`Error reading domain ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to read domain analysis" });
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
    console.error("Error creating analyze task:", error);
    res.status(500).json({ error: "Failed to create analyze task" });
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
    console.error("Error reading pending tasks:", error);
    res.status(500).json({ error: "Failed to read pending tasks" });
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
    console.error(`Error deleting task ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// TODO: Fix application endpoint
// app.post('/api/fix/:moduleId/:issueId', async (req, res) => { ... });

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ==================== Socket.IO ====================

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ==================== Start Server ====================

httpServer.listen(config.port, () => {
  console.log("");
  console.log("========================================");
  console.log("  Codebase Analyzer API");
  console.log("========================================");
  console.log(`  Port: ${config.port}`);
  console.log(`  Target: ${config.target.name}`);
  console.log(`  Project: ${config.target.directory}`);
  console.log(`  Output: ${config.paths.targetAnalysis}`);
  console.log("========================================");
  console.log("");
  console.log(`API running at http://localhost:${config.port}`);
  console.log(
    `Open dashboard at http://localhost:5173 (if frontend is running)`,
  );
  console.log("WebSocket ready for real-time updates");
  console.log("");
});
