import { TASK_TYPES } from "../constants/task-types";
import { SECTION_TYPES } from "../constants/section-types";

/**
 * Map task types to section types
 */
export const TASK_TYPE_TO_SECTION = {
  [TASK_TYPES.DOCUMENTATION]: SECTION_TYPES.DOCUMENTATION,
  [TASK_TYPES.REQUIREMENTS]: SECTION_TYPES.REQUIREMENTS,
  [TASK_TYPES.BUGS_SECURITY]: SECTION_TYPES.BUGS_SECURITY,
  [TASK_TYPES.TESTING]: SECTION_TYPES.TESTING,
};

/**
 * Convert task type to section type
 * @param {string} taskType - Task type (e.g., "analyze-documentation")
 * @returns {string|null} Section type (e.g., "documentation") or null if not found
 */
export function taskTypeToSection(taskType) {
  return TASK_TYPE_TO_SECTION[taskType] || null;
}
