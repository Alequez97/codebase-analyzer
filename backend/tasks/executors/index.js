import config from "../../config.js";
import {
  createLLMAgent,
  FileToolExecutor,
  PROGRESS_STAGES,
} from "@jet-source/agent-core";
import * as logger from "../../utils/logger.js";
import {
  setupTaskLogger,
  logTaskHeader,
  logTaskSuccess,
  logTaskError,
} from "../../utils/task-logger.js";
import { createTaskHandler } from "../handlers/index.js";

export async function execute(task, signal, responseHandler = null) {
  logger.info(`Executing LLM API task: ${task.type}`, {
    component: "LLM-API",
    taskId: task.id,
    model: task.agentConfig.model,
  });

  const { taskLogger, logStream } = await setupTaskLogger(task);

  try {
    logTaskHeader(taskLogger, task);

    taskLogger.info("Initializing LLM client...", {
      component: "LLM-API",
      model: task.agentConfig.model,
    });

    const { model, maxTokens, reasoningEffort, maxIterations } = task.agentConfig;
    const agent = createLLMAgent({
      model,
      maxTokens,
      reasoningEffort,
      apiKeys: config.apiKeys,
      maxIterations: maxIterations || 30,
    });

    const fileExec = new FileToolExecutor(config.target.directory);
    agent.enableTools(fileExec);

    taskLogger.info("LLM client initialized", { component: "LLM-API" });

    if (responseHandler) {
      task.responseHandler = responseHandler;
    }

    const taskHandler = await createTaskHandler(task, taskLogger, agent);

    taskLogger.progress("Starting analysis...", {
      stage: PROGRESS_STAGES.ANALYZING,
    });
    taskLogger.info(
      `Starting analysis loop (max ${agent.maxIterations} iterations)`,
      { component: "LLM-API" },
    );

    const result = await agent.run(taskHandler, signal);

    if (result.success === false) {
      const error = result.error || "Task failed";
      logTaskError(taskLogger, task, new Error(error));
      logStream.end();
      await new Promise((resolve) => logStream.on("finish", resolve));

      return {
        success: false,
        error,
        taskId: task.id,
        logFile: task.logFile,
      };
    }

    logTaskSuccess(taskLogger, task, agent);
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      ...result,
      taskId: task.id,
      logFile: task.logFile,
    };
  } catch (error) {
    if (signal?.aborted || error.code === "TASK_CANCELLED") {
      logStream.end();
      await new Promise((resolve) => logStream.on("finish", resolve));
      return {
        success: false,
        cancelled: true,
        taskId: task.id,
        logFile: task.logFile,
      };
    }

    logTaskError(taskLogger, task, error);
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      success: false,
      error: error.message,
      taskId: task.id,
      logFile: task.logFile,
    };
  }
}


