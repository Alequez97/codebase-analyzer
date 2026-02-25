import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import config from "./config.js";
import * as taskOrchestrator from "./orchestrators/task.js";
import { SOCKET_EVENTS } from "./constants/socket-events.js";
import * as logger from "./utils/logger.js";
import { initSocketEmitter } from "./utils/socket-emitter.js";

// Route imports
import {
  statusRoutes,
  projectRoutes,
  codebaseAnalysisRoutes,
  tasksRoutes,
  logsRoutes,
  domainSectionsChatRoutes,
} from "./routes/index.js";

// Domain routes (modular structure)
import * as domainRoutes from "./routes/domain/index.js";

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

app.use("/api/status", statusRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/analysis/codebase", codebaseAnalysisRoutes);

// Domain routes
app.use("/api/analysis/domain", domainRoutes.coreRoutes);
app.use("/api/analysis/domain", domainRoutes.documentationRoutes);
app.use("/api/analysis/domain", domainRoutes.diagramsRoutes);
app.use("/api/analysis/domain", domainRoutes.requirementsRoutes);
app.use("/api/analysis/domain", domainRoutes.bugsSecurityRoutes);
app.use("/api/analysis/domain", domainRoutes.testingRoutes);

app.use("/api/tasks", tasksRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api", domainSectionsChatRoutes);

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

httpServer.listen(config.port, async () => {
  logger.info("");
  logger.info("========================================");
  logger.info("  Codebase Analyzer API");
  logger.info("========================================");
  logger.info(`  Port: ${config.port}`);
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
  logger.info("");

  // Restart any pending tasks from previous session
  await taskOrchestrator.restartPendingTasks();
});
