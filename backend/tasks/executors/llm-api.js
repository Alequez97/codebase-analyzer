import config from "../../config.js";
import { ClaudeClient } from "../../llm/clients/claude-client.js";
import { OpenAIClient } from "../../llm/clients/openai-client.js";
import { DeepSeekClient } from "../../llm/clients/deepseek-client.js";
import { ChatState } from "../../llm/state/chat-state.js";
import { OpenAIChatState } from "../../llm/state/openai-chat-state.js";
import { LLMAgent } from "../../agents/agent.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import * as logger from "../../utils/logger.js";
import {
  setupTaskLogger,
  logTaskHeader,
  logTaskSuccess,
  logTaskError,
} from "../../utils/task-logger.js";
import { getProviderFromModel } from "../../utils/model-utils.js";
import { createTaskHandler } from "../handlers/index.js";

/**
 * Detect if the LLM API agent is available.
 * Checks if any API key is configured in config.apiKeys
 * @returns {Promise<boolean>}
 */
export async function detect() {
  const { apiKeys } = config;
  const hasApiKey = Boolean(
    apiKeys.anthropic ||
    apiKeys.openai ||
    apiKeys.deepseek ||
    apiKeys.openrouter,
  );

  if (!hasApiKey) {
    logger.debug("LLM API agent not available (no API keys configured)", {
      component: "LLM-API",
    });
    return false;
  }

  logger.debug("LLM API agent available", {
    component: "LLM-API",
  });

  return true;
}

/**
 * Create LLM agent with client and state management
 * @param {Object} agentConfig - Agent configuration with model, maxTokens, reasoningEffort, maxIterations
 * @returns {LLMAgent} Configured LLM agent instance
 */
export function createLLMAgent(agentConfig) {
  const { model, maxTokens, reasoningEffort, maxIterations } = agentConfig;
  const { apiKeys } = config;
  const provider = getProviderFromModel(model);

  if (!provider) {
    throw new Error(
      `Unable to determine provider from model "${model}". Supported: OpenAI (gpt-*, o1-*, o3-*), Anthropic (claude-*, sonnet), DeepSeek (deepseek-*)`,
    );
  }

  let client;
  let state;

  // Create client and state based on provider
  if (provider === "openai") {
    if (!apiKeys.openai) {
      throw new Error(
        `OpenAI model "${model}" is selected but OPENAI_API_KEY is not configured`,
      );
    }
    client = new OpenAIClient({
      apiKey: apiKeys.openai,
      model,
      maxTokens,
      reasoningEffort,
    });
    state = new OpenAIChatState(client);
  } else if (provider === "anthropic") {
    if (!apiKeys.anthropic) {
      throw new Error(
        `Claude model "${model}" is selected but ANTHROPIC_API_KEY is not configured`,
      );
    }
    client = new ClaudeClient({
      apiKey: apiKeys.anthropic,
      model,
      maxTokens,
      reasoningEffort,
    });
    state = new ChatState(client);
  } else if (provider === "deepseek") {
    if (!apiKeys.deepseek) {
      throw new Error(
        `DeepSeek model "${model}" is selected but DEEPSEEK_API_KEY is not configured`,
      );
    }
    client = new DeepSeekClient({
      apiKey: apiKeys.deepseek,
      model,
      maxTokens,
    });
    state = new OpenAIChatState(client);
  } else {
    throw new Error(
      `Unsupported provider "${provider}". Supported providers: openai, anthropic, deepseek`,
    );
  }

  // Create and return LLMAgent instance
  return new LLMAgent(client, state, {
    workingDirectory: config.target.directory,
    maxIterations: maxIterations || 30,
    maxTokens,
  });
}

/**
 * Execute a task using the LLM API agent.
 * @param {Object} task -The task object
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @param {Object} [responseHandler] - Optional response handler for message tools
 * @returns {Promise<Object>} Execution result
 */
export async function execute(task, signal, responseHandler = null) {
  logger.info(`Executing LLM API task: ${task.type}`, {
    component: "LLM-API",
    taskId: task.id,
    model: task.agentConfig.model,
  });

  // Set up logging infrastructure
  const { taskLogger, logStream } = await setupTaskLogger(task);

  try {
    // Log task start
    logTaskHeader(taskLogger, task);

    // Create LLM agent
    taskLogger.info("🤖 Initializing LLM client...", {
      component: "LLM-API",
      model: task.agentConfig.model,
    });
    const agent = createLLMAgent(task.agentConfig);
    taskLogger.info("✅ LLM client initialized", { component: "LLM-API" });

    // Attach response handler to task for use by task-handler-builder
    if (responseHandler) {
      task.responseHandler = responseHandler;
    }

    // Get task handler (merged default + specific + instructions)
    const taskHandler = await createTaskHandler(task, taskLogger, agent);

    // Run agent with handler configuration
    taskLogger.progress("Starting analysis...", {
      stage: PROGRESS_STAGES.ANALYZING,
    });
    taskLogger.info(
      `🔄 Starting analysis loop (max ${agent.maxIterations} iterations)`,
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

    // Log success
    logTaskSuccess(taskLogger, task, agent);
    logStream.end();
    await new Promise((resolve) => logStream.on("finish", resolve));

    return {
      ...result,
      taskId: task.id,
      logFile: task.logFile,
    };
  } catch (error) {
    // Clean cancellation — no failure logging, no moveToFailed
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

    // Log failure
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
