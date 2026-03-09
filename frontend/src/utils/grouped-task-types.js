import { TASK_TYPES } from "../constants/task-types";

/**
 * Maps each domain section key to the task types that affect it.
 * Used to determine which section dot should show "in progress" on domain cards.
 */
export const GROUPED_TASK_TYPES = {
  documentation: [TASK_TYPES.DOCUMENTATION, TASK_TYPES.EDIT_DOCUMENTATION],
  requirements: [TASK_TYPES.REQUIREMENTS, TASK_TYPES.EDIT_REQUIREMENTS],
  bugsSecurity: [TASK_TYPES.BUGS_SECURITY, TASK_TYPES.EDIT_BUGS_SECURITY],
  testing: [
    TASK_TYPES.REFACTORING_AND_TESTING,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ],
};
