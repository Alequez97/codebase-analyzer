/**
 * Task Queue - Central exports for all task queuing functions
 */

// Analysis tasks
export {
  queueCodebaseAnalysisTask,
  queueAnalyzeDocumentationTask,
  queueAnalyzeRequirementsTask,
  queueAnalyzeBugsSecurityTask,
  queueAnalyzeDiagramsTask,
  queueAnalyzeRefactoringAndTestingTask,
} from "./analysis/index.js";

// Editing tasks
export {
  queueEditCodebaseAnalysisTask,
  queueEditDocumentationTask,
  queueEditDiagramsTask,
  queueEditRequirementsTask,
  queueEditBugsSecurityTask,
  queueEditRefactoringAndTestingTask,
} from "./editing/index.js";

// Implementation tasks
export {
  queueImplementFixTask,
  queueImplementTestTask,
} from "./implementation/index.js";

// Application tasks
export { queueApplyRefactoringTask } from "./application/index.js";

// Review tasks
export { queueReviewChangesTask } from "./review/index.js";

// Custom tasks
export { queueCustomCodebaseTask } from "./custom/index.js";

// Design tasks
export {
  queueDesignBrainstormTask,
  queueDesignPlanAndStyleSystemGenerateTask,
  queueDesignGeneratePageTask,
  queueDesignAssistantTask,
} from "./design/index.js";

