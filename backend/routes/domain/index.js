/**
 * Domain Routes - Modular Structure
 *
 * Split domain endpoints by section for better organization and maintainability
 */

export { default as coreRoutes } from "./core.js";
export { default as documentationRoutes } from "./documentation.js";
export { default as diagramsRoutes } from "./diagrams.js";
export { default as requirementsRoutes } from "./requirements.js";
export { default as bugsSecurityRoutes } from "./bugs-security.js";
export { default as testingRoutes } from "./testing.js";
