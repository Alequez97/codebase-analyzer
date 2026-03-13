/**
 * Task Queue - Central exports for all task queuing functions
 *
 * This module re-exports all task queue functions organized by domain.
 * Each module is responsible for queueing a specific type of task.
 */

export { queueCodebaseAnalysisTask } from "./codebase.js";
export { queueAnalyzeDocumentationTask } from "./documentation.js";
export { queueAnalyzeRequirementsTask } from "./requirements.js";
export { queueAnalyzeBugsSecurityTask } from "./bugs-security.js";
export { queueAnalyzeDiagramsTask } from "./diagrams.js";
export { queueAnalyzeRefactoringAndTestingTask } from "./refactoring-and-testing.js";
export { queueImplementFixTask } from "./implement-fix.js";
export { queueImplementTestTask } from "./implement-test.js";
export { queueApplyRefactoringTask } from "./apply-refactoring.js";

// Edit tasks (AI chat)
export { queueEditCodebaseAnalysisTask } from "./edit-codebase-analysis.js";
export { queueEditDocumentationTask } from "./edit-documentation.js";
export { queueEditDiagramsTask } from "./edit-diagrams.js";
export { queueEditRequirementsTask } from "./edit-requirements.js";
export { queueEditBugsSecurityTask } from "./edit-bugs-security.js";
export { queueEditRefactoringAndTestingTask } from "./edit-refactoring-and-testing.js";

// Custom codebase task (floating agent chat)
export { queueCustomCodebaseTask } from "./custom-codebase-task.js";

// Review changes task (AI orchestrator — diffs git, delegates edit-* tasks)
export { queueReviewChangesTask } from "./review-changes.js";
