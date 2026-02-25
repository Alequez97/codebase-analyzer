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
