/**
 * Task Factory - Central exports for all task creation functions
 *
 * This module re-exports all task factory functions organized by domain.
 * Each factory module is responsible for creating a specific type of task.
 */

export { createFullCodebaseAnalysisTask } from "./codebase.js";
export { createAnalyzeDocumentationTask } from "./documentation.js";
export { createAnalyzeRequirementsTask } from "./requirements.js";
export { createAnalyzeBugsSecurityTask } from "./bugs-security.js";
export { createAnalyzeDiagramsTask } from "./diagrams.js";
export { createAnalyzeTestingTask } from "./testing.js";
export { createApplyFixTask } from "./apply-fix.js";
export { createApplyTestTask } from "./apply-test.js";

// Edit tasks (AI chat)
export { createEditDocumentationTask } from "./edit-documentation.js";
