/**
 * API Routes Index
 *
 * Organized route modules for the Codebase Analyzer API
 * Note: Domain routes are now modular (see routes/domain/)
 */

export { default as statusRoutes } from "./status.js";
export { default as projectRoutes } from "./project.js";
export { default as codebaseAnalysisRoutes } from "./codebase-analysis.js";
export { default as tasksRoutes } from "./tasks.js";
export { default as logsRoutes } from "./logs.js";
export { default as domainSectionsChatRoutes } from "./domain-sections-chat.js";
export { default as codebaseChatRoutes } from "./codebase-chat.js";
export { default as e2eConfigRoutes } from "./e2e-config.js";
export { default as reviewChangesRoutes } from "./review-changes.js";
export { default as designRoutes } from "./design.js";
export { default as marketResearchRoutes } from "./market-research.js";
export { default as authRoutes } from "./auth.js";
