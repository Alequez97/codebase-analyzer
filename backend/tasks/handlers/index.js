/**
 * Task Handlers Index
 * Exports all task-specific handler functions
 */

export { createTaskHandler } from "./task-handler-builder.js";

// Analysis handlers
export {
  analyzeDocumentationHandler,
  analyzeRefactoringAndTestingHandler,
  defaultAnalysisHandler,
} from "./analysis/index.js";

// Editing handlers
export {
  editCodebaseAnalysisHandler,
  editDocumentationHandler,
  createEditSectionHandler,
} from "./editing/index.js";

// Implementation handlers
export {
  implementFixHandler,
  implementTestHandler,
} from "./implementation/index.js";

// Application handlers
export { applyRefactoringHandler } from "./application/index.js";

// Review handlers
export { reviewChangesHandler } from "./review/index.js";

// Custom handlers
export { customCodebaseTaskHandler } from "./custom/index.js";

// Design handlers
export {
  designBrainstormHandler,
  designPlanAndStyleSystemGenerateHandler,
  designGeneratePageHandler,
  designAssistantHandler,
  designReverseEngineerHandler,
} from "./design/index.js";
