import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a task to apply a refactoring recommendation
 * Uses LLM API agent to extract business logic and create service files
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.refactoring - The refactoring recommendation object
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createApplyRefactoringTask(
  { domainId, refactoring },
  { executeNow = false } = {},
) {
  if (!refactoring?.id) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_INPUT,
      error: "Invalid refactoring recommendation: missing id.",
    };
  }

  if (!refactoring?.targetFile) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_INPUT,
      error: "Invalid refactoring recommendation: missing targetFile.",
    };
  }

  if (!refactoring?.extractionPlan?.newServiceFile) {
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_INPUT,
      error:
        "Invalid refactoring recommendation: missing extractionPlan.newServiceFile.",
    };
  }

  const agentConfigResult = getAgentConfig(TASK_TYPES.APPLY_REFACTORING);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  logger.debug("Creating apply-refactoring task", {
    component: "TaskFactory",
    refactoringId: refactoring.id,
    targetFile: refactoring.targetFile,
    newServiceFile: refactoring.extractionPlan.newServiceFile,
  });

  const params = {
    domainId,
    targetDirectory: config.target.directory,
    refactoringId: refactoring.id,
    category: refactoring.category || "extract-business-logic",
    priority: refactoring.priority || "P2",
    title: refactoring.title || "",
    targetFile: refactoring.targetFile,
    targetFunction: refactoring.targetFunction || "",
    startLine: refactoring.startLine || null,
    endLine: refactoring.endLine || null,
    issue: refactoring.issue || "",
    newServiceFile: refactoring.extractionPlan.newServiceFile,
    extractedFunctions: refactoring.extractionPlan.extractedFunctions || [],
    benefits: refactoring.benefits || [],
    unblocks: refactoring.unblocks || [],
  };

  const task = {
    id: generateTaskId(TASK_TYPES.APPLY_REFACTORING),
    type: TASK_TYPES.APPLY_REFACTORING,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.APPLY_REFACTORING,
    outputFile: null, // No JSON output - agent creates/modifies files directly

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
