import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as modulesPersistence from "../persistence/modules.js";

/**
 * Get full codebase analysis results with enriched module data
 * @returns {Promise<Object|null>} Codebase analysis results with hasAnalysis flags
 */
export async function getCodebaseAnalysis() {
  const analysis = await codebaseAnalysisPersistence.readCodebaseAnalysis();

  if (!analysis) {
    return null;
  }

  // Enrich modules with analysis status
  const moduleIds = await modulesPersistence.listModules();
  const enrichedModules = analysis.modules.map((module) => ({
    ...module,
    hasAnalysis: moduleIds.includes(module.id),
  }));

  return {
    ...analysis,
    modules: enrichedModules,
  };
}

/**
 * Get list of modules with analysis status
 * @returns {Promise<Array>} Array of modules
 */
export async function getModules() {
  const analysis = await getCodebaseAnalysis();
  return analysis ? analysis.modules : [];
}
