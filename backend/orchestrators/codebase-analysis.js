import * as codebaseAnalysisPersistence from "../persistence/codebase-analysis.js";
import * as domainsPersistence from "../persistence/domains.js";

/**
 * Get full codebase analysis results with enriched domain data
 * @returns {Promise<Object|null>} Codebase analysis results with hasAnalysis flags
 */
export async function getCodebaseAnalysis() {
  const analysis = await codebaseAnalysisPersistence.readCodebaseAnalysis();

  if (!analysis) {
    return null;
  }

  // Enrich domains with analysis status
  const domainIds = await domainsPersistence.listDomains();
  const domains = Array.isArray(analysis.domains) ? analysis.domains : [];

  const enrichedDomains = domains.map((domain) => ({
    ...domain,
    hasAnalysis: domainIds.includes(domain.id),
  }));

  return {
    ...analysis,
    domains: enrichedDomains,
  };
}

/**
 * Get list of domains with analysis status
 * @returns {Promise<Array>} Array of domains
 */
export async function getDomains() {
  const analysis = await getCodebaseAnalysis();
  return analysis ? analysis.domains : [];
}
