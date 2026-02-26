/**
 * Task Handler Factory
 * Creates task-specific handler configuration based on task type
 */

import { TASK_TYPES } from "../../constants/task-types.js";
import { loadInstructionForTask } from "../../utils/instruction-loader.js";
import { editDocumentationHandler } from "./edit-documentation.js";
import { analyzeDocumentationHandler } from "./analyze-documentation.js";
import { analyzeTestingHandler } from "./analyze-testing.js";
import { defaultAnalysisHandler } from "./default-analysis.js";

/**
 * Create task handler configuration for a given task
 * Merges default handler with task-specific overrides
 * @param {Object} task - The task object
 * @param {Object} taskLogger - Task-specific logger instance
 * @param {Object} agent - LLM agent instance
 * @returns {Promise<Object>} Handler configuration with all callbacks and systemPrompt
 */
export async function createTaskHandler(task, taskLogger, agent) {
  // Load task-specific instructions
  const instructions = await loadInstructionForTask(task);
  taskLogger.info(`📝 Instructions loaded (${instructions.length} chars)`, {
    component: "TaskHandler",
  });

  // Get default handler (complete with all callbacks)
  const defaults = defaultAnalysisHandler(task, taskLogger, agent);

  // Get task-specific overrides
  let overrides = {};

  if (task.type === TASK_TYPES.EDIT_DOCUMENTATION) {
    overrides = editDocumentationHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DOCUMENTATION) {
    overrides = analyzeDocumentationHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.TESTING) {
    overrides = analyzeTestingHandler(task, taskLogger, agent);
  }

  // Merge: defaults provide all callbacks, overrides replace what's needed
  return {
    systemPrompt: instructions,
    ...defaults,
    ...overrides,
  };
}
