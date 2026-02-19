import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain requirements section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Requirements section or null if not found
 */
export async function readDomainRequirements(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "requirements.json",
    );
    return await tryReadJsonFile(filePath, `domain ${domainId} requirements`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain requirements section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Requirements data
 */
export async function writeDomainRequirements(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "requirements.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain requirements metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainRequirementsMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "requirements.meta.json",
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} requirements metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
