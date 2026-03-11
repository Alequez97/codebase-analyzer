import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { SYSTEM_INSTRUCTION_PATHS } from "../../constants/system-instructions.js";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import {
  getProgressFilePath,
  ensureProgressDirectory,
} from "../../utils/task-progress.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a task to apply a refactoring recommendation
 * Uses LLM API agent to extract business logic and create service files
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.refactoring - The refactoring recommendation object
 * @returns {Promise<Object>} The created task
 */
export async function queueApplyRefactoringTask({ domainId, refactoring }) {
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
    component: "TaskQueue",
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

  const taskId = generateTaskId(TASK_TYPES.APPLY_REFACTORING);
  const task = {
    id: taskId,
    type: TASK_TYPES.APPLY_REFACTORING,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.APPLY_REFACTORING,
    outputFile: null, // No JSON output - agent creates/modifies files directly
    progressFile: getProgressFilePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
