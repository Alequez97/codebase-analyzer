import fs from "fs/promises";
import path from "path";
import config from "../config.js";

/**
 * Read a specific domain analysis
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Domain analysis or null if not found
 */
export async function readDomain(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      `${domainId}.json`,
    );
    const content = await fs.readFile(filePath, "utf-8");

    // Handle empty files
    if (!content || content.trim() === "") {
      console.log(`Domain ${domainId} analysis file is empty`);
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    // Handle JSON parse errors (malformed files)
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in domain ${domainId}:`, error.message);
      return null;
    }

    throw error;
  }
}

/**
 * Write domain analysis to file
 * @param {string} domainId - The domain ID
 * @param {Object} data - Domain analysis data
 */
export async function writeDomain(domainId, data) {
  const filePath = path.join(
    config.paths.targetAnalysis,
    "domains",
    `${domainId}.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * List all domain IDs that have analyses
 * @returns {Promise<string[]>} Array of domain IDs
 */
export async function listDomains() {
  try {
    const domainsDir = path.join(config.paths.targetAnalysis, "domains");
    const files = await fs.readdir(domainsDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
