import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import config from "./config.js";
import * as scanOrchestrator from "./orchestrators/scan.js";
import * as taskOrchestrator from "./orchestrators/task.js";
import * as modulesPersistence from "./persistence/modules.js";
import { detectAvailableAgents } from "./agents/index.js";
import { SOCKET_EVENTS } from "./constants/socket-events.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
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
 * Health check with configuration status
 */
app.get("/api/status", async (req, res) => {
  const agents = await detectAvailableAgents();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      codebases: config.codebases,
      analysisTool: config.analysisTool,
      port: config.port,
    },
    agents,
  });
});

/**
 * Get scan results
 */
app.get("/api/scan", async (req, res) => {
  try {
    const results = await scanOrchestrator.getScanResults();

    if (!results) {
      return res.status(404).json({
        error: "No scan results found",
        message: 'Click "Scan Codebase" to start a scan',
      });
    }

    res.json(results);
  } catch (error) {
    console.error("Error reading scan results:", error);
    res.status(500).json({ error: "Failed to read scan results" });
  }
});

/**
 * Create a new scan task
 */
app.post("/api/scan/request", async (req, res) => {
  try {
    const executeNow = req.body.executeNow !== false; // Default to true
    const task = await taskOrchestrator.createScanTask(executeNow);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating scan task:", error);
    res.status(500).json({ error: "Failed to create scan task" });
  }
});

/**
 * List all modules from scan results
 */
app.get("/api/modules", async (req, res) => {
  try {
    const modules = await scanOrchestrator.getModules();

    if (modules.length === 0) {
      return res.status(404).json({
        error: "No modules found",
        message: "Run a codebase scan first",
      });
    }

    res.json({ modules });
  } catch (error) {
    console.error("Error reading modules:", error);
    res.status(500).json({ error: "Failed to read modules" });
  }
});

/**
 * Get a specific module's analysis
 */
app.get("/api/modules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await modulesPersistence.readModule(id);

    if (!analysis) {
      return res.status(404).json({
        error: "Module analysis not found",
        message: `No analysis found for module: ${id}`,
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error(`Error reading module ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to read module analysis" });
  }
});

/**
 * Create a task to analyze a specific module
 */
app.post("/api/modules/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleName, files } = req.body;

    if (!moduleName || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "moduleName and files[] are required",
      });
    }

    const executeNow = req.body.executeNow !== false; // Default to true
    const task = await taskOrchestrator.createAnalyzeTask(
      id,
      moduleName,
      files,
      executeNow,
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
  console.log(`  Tool: ${config.analysisTool}`);
  console.log(`  Codebases: ${config.codebases.length}`);
  config.codebases.forEach((cb) => {
    console.log(`    - ${cb.name}: ${cb.path}`);
  });
  console.log("========================================");
  console.log("");
  console.log(`API running at http://localhost:${config.port}`);
  console.log(`Dashboard at http://localhost:3000`);
  console.log("WebSocket ready for real-time updates");
  console.log("");
});
