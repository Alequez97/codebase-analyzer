import fs from "fs/promises";
import path from "path";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { emitTaskProgress, emitSocketEvent } from "../../utils/socket-emitter.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import config from "../../config.js";
import * as logger from "../../utils/logger.js";

/**
 * Handler for market-research-initial task.
 *
 * Delegates competitor research to specialist agents, writes a stub report,
 * then waits for all competitor tasks to complete before assembling the
 * final report.
 */
export function marketResearchInitialHandler(task, taskLogger) {
  const { sessionId, idea } = task.params || {};

  const initialMessage = [
    `Research the following startup idea and identify competitors to delegate to specialist agents.`,
    ``,
    `Idea: ${idea}`,
    `Session ID: ${sessionId}`,
  ].join("\n");

  const onComplete = async (_result) => {
    const POLL_INTERVAL_MS = 2000;
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    try {
      // Read the competitor task IDs written by the agent
      const competitorTasksPath = path.join(
        config.paths.targetAnalysis,
        "market-research",
        sessionId,
        "competitor-tasks.json",
      );

      let competitorTasks;
      try {
        const raw = await fs.readFile(competitorTasksPath, "utf-8");
        competitorTasks = JSON.parse(raw);
      } catch {
        logger.warn("Could not read competitor-tasks.json — skipping report assembly", {
          sessionId,
          taskId: task.id,
        });
        return;
      }

      if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
        logger.warn("competitor-tasks.json is empty or invalid — skipping report assembly", {
          sessionId,
          taskId: task.id,
        });
        return;
      }

      taskLogger.info(`Waiting for ${competitorTasks.length} competitor task(s) to complete…`);

      // Poll until all competitor tasks are completed or failed
      const deadline = Date.now() + TIMEOUT_MS;
      const pending = new Set(competitorTasks.map((ct) => ct.taskId));

      while (pending.size > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        for (const taskId of [...pending]) {
          const competitorTask = await tasksPersistence.readTask(taskId);
          if (
            competitorTask?.status === TASK_STATUS.COMPLETED ||
            competitorTask?.status === TASK_STATUS.FAILED
          ) {
            pending.delete(taskId);
          }
        }

        taskLogger.info(`Waiting for competitor tasks: ${pending.size} remaining`);
      }

      if (pending.size > 0) {
        logger.warn(`Timed out waiting for ${pending.size} competitor task(s)`, {
          sessionId,
          taskId: task.id,
          pendingTaskIds: [...pending],
        });
      }

      // Read competitor output files
      const competitorResults = [];
      for (const { competitorId } of competitorTasks) {
        const competitorFilePath = path.join(
          config.paths.targetAnalysis,
          "market-research",
          sessionId,
          "competitors",
          `${competitorId}.json`,
        );
        try {
          const raw = await fs.readFile(competitorFilePath, "utf-8");
          competitorResults.push(JSON.parse(raw));
        } catch {
          logger.warn(`Could not read competitor output for ${competitorId}`, {
            sessionId,
            competitorId,
          });
        }
      }

      // Read the stub report
      const reportPath = path.join(
        config.paths.targetAnalysis,
        "market-research",
        sessionId,
        "report.json",
      );

      let report;
      try {
        const raw = await fs.readFile(reportPath, "utf-8");
        report = JSON.parse(raw);
      } catch {
        logger.warn("Could not read stub report.json — skipping report assembly", {
          sessionId,
          taskId: task.id,
        });
        return;
      }

      // Merge competitor results into the stub report's competitors array
      const competitorMap = new Map(competitorResults.map((c) => [c.id, c]));
      report.competitors = (report.competitors || []).map((stub) => {
        const real = competitorMap.get(stub.id);
        return real ? { ...stub, ...real } : stub;
      });

      // Add any competitor results that weren't in the stub (safety net)
      const stubIds = new Set(report.competitors.map((c) => c.id));
      for (const real of competitorResults) {
        if (!stubIds.has(real.id)) {
          report.competitors.push(real);
        }
      }

      report.status = "complete";
      report.completedAt = new Date().toISOString();

      // Write the merged report back
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

      logger.info("Market research report assembled and written", {
        sessionId,
        taskId: task.id,
        competitorCount: report.competitors.length,
      });

      // Notify frontend
      emitSocketEvent(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, {
        sessionId,
        taskId: task.id,
      });
    } catch (err) {
      logger.error("Failed to assemble market research report", {
        sessionId,
        taskId: task.id,
        error: err.message,
        stack: err.stack,
      });
    }
  };

  return _buildHandler(
    task,
    taskLogger,
    initialMessage,
    "MarketResearchInitial",
    "Identifying competitors…",
    onComplete,
  );
}

/**
 * Handler for market-research-competitor sub-task.
 *
 * Researches one specific competitor and writes its profile JSON.
 * Spawned by the initial agent via delegate_task.
 */
export function marketResearchCompetitorHandler(task, taskLogger) {
  const {
    sessionId,
    competitorId,
    competitorName,
    competitorUrl,
    competitorDescription,
  } = task.params || {};

  const initialMessage = [
    `Research the following competitor and produce a detailed profile.`,
    ``,
    `Competitor: ${competitorName}`,
    `Website: ${competitorUrl}`,
    competitorDescription ? `Description: ${competitorDescription}` : null,
    ``,
    `Session ID: ${sessionId}`,
    `Competitor ID: ${competitorId}`,
    ``,
    `Write the complete profile JSON to: .code-analysis/market-research/${sessionId}/competitors/${competitorId}.json`,
  ]
    .filter(Boolean)
    .join("\n");

  return _buildHandler(
    task,
    taskLogger,
    initialMessage,
    "MarketResearchCompetitor",
    `Researching ${competitorName}…`,
  );
}

function _buildHandler(
  task,
  taskLogger,
  initialMessage,
  componentName,
  startMessage,
  onComplete,
) {
  return {
    initialMessage,

    onStart: () => {
      taskLogger.info(`🔍 ${startMessage}`);
      emitTaskProgress(task, PROGRESS_STAGES.ANALYZING, startMessage);
    },

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        // Internal tool execution — log to file only, not to client
        taskLogger.info(`  ⚡ ${progress.message}`);
        return;
      }
      if (progress.stage) {
        emitTaskProgress(task, progress.stage, progress.message);
      }
    },

    onCompaction: (phase, tokensAfter) => {
      if (phase === "start") {
        taskLogger.info("🗜️  Compacting chat history…");
        emitTaskProgress(
          task,
          PROGRESS_STAGES.COMPACTING,
          "Compacting chat history…",
        );
        taskLogger.log(`\n🗜️  [Compacting] Summarizing conversation…\n`);
      } else if (phase === "complete") {
        taskLogger.info(
          `🗜️  Compaction complete. Tokens after: ~${tokensAfter}`,
        );
        taskLogger.log(`🗜️  [Compacting] Done. Tokens after: ~${tokensAfter}\n`);
      }
    },

    onIteration: (iteration, response) => {
      taskLogger.info(
        `  Iteration ${iteration}: ${response?.stop_reason || "in progress"}`,
      );
    },

    onToolCall: (toolName, toolInput) => {
      if (toolName === "web_search") {
        const query = toolInput?.query || "";
        taskLogger.log(`web_search: ${query}`, {
          publicLogText: `Searching: ${query}`,
          kind: "search",
        });
      } else if (toolName === "fetch_url") {
        const url = toolInput?.url || "";
        taskLogger.log(`fetch_url: ${url}`, {
          publicLogText: `Visiting: ${url}`,
          kind: "navigate",
        });
      } else if (toolName === "delegate_task") {
        const competitorName = toolInput?.params?.competitorName || "";
        if (competitorName) {
          taskLogger.log(`delegate_task: ${competitorName}`, {
            publicLogText: `Found competitor: ${competitorName}`,
            kind: "found",
          });
        } else {
          taskLogger.log(`delegate_task`);
        }
      } else {
        taskLogger.log(`${toolName}`);
      }
    },

    onMessage: (message) => {
      if (message) {
        taskLogger.log(message);
      }
    },

    ...(onComplete && { onComplete }),
  };
}
