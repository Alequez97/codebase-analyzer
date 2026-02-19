import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain documentation section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Documentation section or null if not found
 */
export async function readDomainDocumentation(domainId) {
  try {
    const jsonPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "documentation.json",
    );
    return await tryReadJsonFile(jsonPath, `domain ${domainId} documentation`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain documentation section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Documentation data {content: string, metadata: object}
 */
export async function writeDomainDocumentation(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "documentation.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain documentation metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainDocumentationMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "documentation.meta.json",
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} documentation metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
