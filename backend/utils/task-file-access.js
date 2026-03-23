/**
 * Task File Access Configuration
 *
 * Defines read/write access permissions for different task types.
 * Centralizes file access rules to avoid hardcoding paths in task handlers.
 *
 * Default Write Behavior (in FileToolExecutor):
 * - By default, tasks can ONLY write to `.code-analysis/` directory
 * - Writing to other paths requires explicit permission via:
 *   - setAllowAnyWrite(true) - full project write access
 *   - setAllowedWritePaths([...]) - specific file paths
 *
 * Read Restrictions (via setAllowedReadPaths):
 * - When setAllowedReadPaths() is called, read_file/list_directory/searchFiles
 *   are restricted to those path prefixes only
 * - Tasks without read path restrictions use default behavior:
 *   - Can read any file except `.code-analysis/` (unless allowAnyRead is true)
 */

import path from "path";
import config from "../config.js";
import { TASK_TYPES } from "../constants/task-types.js";

/**
 * Default write directory for tasks without explicit permissions.
 * FileToolExecutor allows writing to this directory by default.
 */
export const DEFAULT_WRITE_DIRECTORY = ".code-analysis";

/**
 * Get the relative path to the design folder within the target project
 * @returns {string} Relative path (e.g., ".code-analysis/design")
 */
export function getDesignFolderPath() {
  return path.relative(
    config.paths.targetRoot,
    path.join(config.paths.targetAnalysis, "design"),
  );
}

/**
 * Get the relative path to the analysis root within the target project
 * @returns {string} Relative path (e.g., ".code-analysis")
 */
export function getAnalysisRootPath() {
  return path.relative(config.paths.targetRoot, config.paths.targetAnalysis);
}

/**
 * Get allowed read paths for a specific task type
 * @param {string} taskType - The task type
 * @returns {string[]|null} Array of allowed path prefixes, or null if no restrictions
 */
export function getAllowedReadPaths(taskType) {
  switch (taskType) {
    case TASK_TYPES.DESIGN_ASSISTANT:
      return [
        `${getDesignFolderPath()}/`, // Existing designs
        "backend/constants/", // Technology resolution
      ];

    default:
      return null; // No restrictions - use default behavior
  }
}

/**
 * Check if a task type should have unrestricted read access
 * @param {string} taskType - The task type
 * @returns {boolean}
 */
export function hasUnrestrictedReadAccess(taskType) {
  const unrestrictedTypes = [
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
    TASK_TYPES.DESIGN_BRAINSTORM,
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    TASK_TYPES.DESIGN_GENERATE_PAGE,
    TASK_TYPES.REVIEW_CHANGES,
  ];

  return unrestrictedTypes.includes(taskType);
}

/**
 * Check if a task type should have unrestricted write access
 * @param {string} taskType - The task type
 * @returns {boolean}
 */
export function hasUnrestrictedWriteAccess(taskType) {
  const unrestrictedTypes = [
    TASK_TYPES.IMPLEMENT_FIX,
    TASK_TYPES.IMPLEMENT_TEST,
    TASK_TYPES.APPLY_REFACTORING,
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
  ];

  return unrestrictedTypes.includes(taskType);
}
