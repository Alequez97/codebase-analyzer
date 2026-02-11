import * as scanPersistence from '../persistence/scan.js';
import * as modulesPersistence from '../persistence/modules.js';

/**
 * Get scan results with enriched module data
 * @returns {Promise<Object|null>} Scan results with hasAnalysis flags
 */
export async function getScanResults() {
  const scanResults = await scanPersistence.readScanResults();
  
  if (!scanResults) {
    return null;
  }
  
  // Enrich modules with analysis status
  const moduleIds = await modulesPersistence.listModules();
  const enrichedModules = scanResults.modules.map(module => ({
    ...module,
    hasAnalysis: moduleIds.includes(module.id),
  }));
  
  return {
    ...scanResults,
    modules: enrichedModules,
  };
}

/**
 * Get list of modules with analysis status
 * @returns {Promise<Array>} Array of modules
 */
export async function getModules() {
  const scanResults = await getScanResults();
  return scanResults ? scanResults.modules : [];
}
