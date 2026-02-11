import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

/**
 * Read a specific module analysis
 * @param {string} moduleId - The module ID
 * @returns {Promise<Object|null>} Module analysis or null if not found
 */
export async function readModule(moduleId) {
  try {
    const filePath = path.join(config.paths.analysisOutput, 'modules', `${moduleId}.json`);
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
 * Write module analysis to file
 * @param {string} moduleId - The module ID
 * @param {Object} data - Module analysis data
 */
export async function writeModule(moduleId, data) {
  const filePath = path.join(config.paths.analysisOutput, 'modules', `${moduleId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * List all module IDs that have analyses
 * @returns {Promise<string[]>} Array of module IDs
 */
export async function listModules() {
  try {
    const modulesDir = path.join(config.paths.analysisOutput, 'modules');
    const files = await fs.readdir(modulesDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
