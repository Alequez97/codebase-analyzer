import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

/**
 * Read scan results from file
 * @returns {Promise<Object|null>} Scan results or null if file doesn't exist
 */
export async function readScanResults() {
  try {
    const filePath = path.join(config.paths.targetAnalysis, 'scan-results.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write scan results to file
 * @param {Object} data - Scan results data
 */
export async function writeScanResults(data) {
  const filePath = path.join(config.paths.targetAnalysis, 'scan-results.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
