/**
 * Task type constants
 * Used to identify different types of analysis tasks
 */

export const TASK_TYPES = {
  CODEBASE_ANALYSIS: "codebase-analysis",
  DOCUMENTATION: "analyze-documentation",
  DIAGRAMS: "analyze-diagrams",
  REQUIREMENTS: "analyze-requirements",
  BUGS_SECURITY: "analyze-bugs-security",
  REFACTORING_AND_TESTING: "analyze-refactoring-and-testing",
  IMPLEMENT_FIX: "implement-fix",
  IMPLEMENT_TEST: "implement-test",
  APPLY_REFACTORING: "apply-refactoring",

  // Edit tasks
  EDIT_CODEBASE_ANALYSIS: "edit-codebase-analysis",
  EDIT_DOCUMENTATION: "edit-documentation",
  EDIT_DIAGRAMS: "edit-diagrams",
  EDIT_REQUIREMENTS: "edit-requirements",
  EDIT_BUGS_SECURITY: "edit-bugs-security",
  EDIT_REFACTORING_AND_TESTING: "edit-refactoring-and-testing",

  // Custom codebase task (floating agent chat)
  CUSTOM_CODEBASE_TASK: "custom-codebase-task",

  // Review changes task (delegating agent, reviews a git diff)
  REVIEW_CHANGES: "review-changes",

  // Design tasks (project-level, no domainId)
  DESIGN_BRAINSTORM: "design-brainstorm",
  DESIGN_GENERATE: "design-generate",
};
