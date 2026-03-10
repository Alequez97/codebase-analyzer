import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { readE2EConfig } from "../../persistence/e2e-config.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { SUPPORTED_TEST_TYPES } from "../../constants/test-types.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFilePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a task to implement a missing test
 * Uses LLM API agent with autonomous file discovery
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.testRecommendation - The test recommendation object
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createImplementTestTask(
  { domainId, testRecommendation, domainFiles = [] },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.IMPLEMENT_TEST);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  // Determine source file from suggested test file
  // For unit tests: file.test.js -> file.js
  // For integration tests: backend/tests/integration/foo.js -> backend/foo.js (or similar)
  const testFile = testRecommendation.suggestedTestFile || "";
  const sourceFile = testFile
    .replace(/\.test\.(js|ts)$/, ".$1")
    .replace(/\.spec\.(js|ts)$/, ".$1")
    .replace(/^tests\/integration\//, "")
    .replace(/^tests\/unit\//, "")
    .replace(/\/tests\/integration\//, "/")
    .replace(/\/tests\/unit\//, "/");

  logger.debug("Creating implement-test task", {
    component: "TaskFactory",
    testFile,
    sourceFile,
    testType: testRecommendation.testType,
  });

  const scenarios = testRecommendation.scenarios || [];
  const testType =
    typeof testRecommendation.testType === "string"
      ? testRecommendation.testType.trim().toLowerCase()
      : "";

  if (!SUPPORTED_TEST_TYPES.includes(testType)) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_INPUT,
      error: `Invalid test recommendation: missing or unsupported testType. Expected one of: ${SUPPORTED_TEST_TYPES.join(", ")}.`,
    };
  }

  // Build parameters for template replacement
  // The LLM agent will use read_file and list_directory tools to discover files autonomously
  const e2eConfig = testType === "e2e" ? await readE2EConfig() : null;
  const params = {
    domainId,
    targetDirectory: config.target.directory,
    testId: testRecommendation.id,
    testFile: testFile,
    testType,
    testDescription: testRecommendation.description || "",
    scenarios,
    sourceFile: sourceFile,
    e2eBaseUrl: e2eConfig?.baseUrl || "",
    e2eAuthUsername: e2eConfig?.auth?.username || "",
    e2eAuthPassword: e2eConfig?.auth?.password || "",
    priority: testRecommendation.priority || "P2",
    category: testRecommendation.category || "unknown",
    relatedRequirement: testRecommendation.relatedRequirement || null,
    reason: testRecommendation.reason || "",
    domainFiles: domainFiles || [],
  };

  const taskId = generateTaskId(TASK_TYPES.IMPLEMENT_TEST);
  const task = {
    id: taskId,
    type: TASK_TYPES.IMPLEMENT_TEST,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.IMPLEMENT_TEST,
    outputFile: null, // No JSON output - agent creates test file directly using write_file tool
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Import dynamically to avoid circular dependency
    const { executeTask } = await import("../../orchestrators/task.js");
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskFactory",
      });
    });
  }

  return task;
}
