import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read full codebase analysis from file
 * @returns {Promise<Object|null>} Codebase analysis or null if file doesn't exist
 */
export async function readCodebaseAnalysis() {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "analysis",
      "codebase-analysis.json",
    );
    return await tryReadJsonFile(filePath, "codebase-analysis.json");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write full codebase analysis to file
 * @param {Object} data - Codebase analysis data
 */
export async function writeCodebaseAnalysis(data) {
  const filePath = path.join(
    config.paths.targetAnalysis,
    "analysis",
    "codebase-analysis.json",
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Update domain files in codebase analysis
 * @param {string} domainId - Domain ID
 * @param {string[]} files - Array of file paths
 * @returns {Promise<Object|null>} Updated analysis or null if not found
 */
export async function updateDomainFiles(domainId, files) {
  const analysis = await readCodebaseAnalysis();

  if (!analysis || !analysis.domains) {
    return null;
  }

  const domainIndex = analysis.domains.findIndex((d) => d.id === domainId);

  if (domainIndex === -1) {
    return null;
  }

  // Update the domain files
  analysis.domains[domainIndex].files = files;

  // Write back to file
  await writeCodebaseAnalysis(analysis);

  return analysis;
}
