import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain testing section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Testing section or null if not found
 */
export async function readDomainTesting(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "testing.json",
    );
    return await tryReadJsonFile(filePath, `domain ${domainId} testing`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain testing section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Testing data
 */
export async function writeDomainTesting(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "testing.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain testing metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainTestingMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "testing.meta.json",
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} testing metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
