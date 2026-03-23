import { TASK_TYPES } from "../constants/task-types.js";

const DESIGN_TASK_TYPES = new Set([
  TASK_TYPES.DESIGN_BRAINSTORM,
  TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  TASK_TYPES.DESIGN_GENERATE_PAGE,
  TASK_TYPES.DESIGN_ASSISTANT,
]);

/**
 * True when the task type is part of design workflows.
 * @param {string} taskType
 * @returns {boolean}
 */
export function isDesignTaskType(taskType) {
  return DESIGN_TASK_TYPES.has(taskType);
}

/**
 * Remove internal implementation details from user-facing design text.
 * We intentionally keep this conservative: only redact internal filesystem paths.
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizeDesignUserFacingText(text) {
  if (typeof text !== "string" || !text.trim()) {
    return text;
  }

  return text
    .replace(
      /`?\.code-analysis\/design(?:\/[^\s`"'.,;:!?)]*)?`?/gi,
      "your current design",
    )
    .replace(
      /`?\.code-analysis\/[^\s`"'.,;:!?)]*`?/gi,
      "the project workspace",
    );
}

