import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a task to apply a missing test
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.testRecommendation - The test recommendation object
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createApplyTestTask(
  { domainId, testRecommendation },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.APPLY_TEST);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  // Determine source file from suggested test file
  // For unit tests: file.test.js -> file.js
  // For integration tests: read the test description
  const testFile = testRecommendation.suggestedTestFile || "";
  const sourceFile = testFile
    .replace(/\.test\.(js|ts)$/, ".$1")
    .replace(/\.spec\.(js|ts)$/, ".$1")
    .replace(/^tests\/integration\//, "")
    .replace(/^tests\/unit\//, "");

  // Build parameters for template replacement
  const params = {
    domainId,
    targetDirectory: config.target.directory,
    testId: testRecommendation.id,
    testFile: testFile,
    testType: testRecommendation.testType || "unit",
    testDescription: testRecommendation.description || "",
    testScenarios: testRecommendation.testScenarios || [],
    sourceFile: sourceFile,
    priority: testRecommendation.priority || "P2",
    category: testRecommendation.category || "unknown",
    relatedRequirement: testRecommendation.relatedRequirement || null,
    reason: testRecommendation.reason || "",
  };

  const task = {
    id: generateTaskId("apply-test"),
    type: TASK_TYPES.APPLY_TEST,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    instructionFile: "backend/instructions/apply-test.md",
    outputFile: null, // No JSON output needed - agent creates test file directly
    generateMetadata: true,
  };

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
