import fs from "fs/promises";
import { tryReadJsonFile } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionDir,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

const TESTING_SECTION = "testing";

/**
 * Read domain testing section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Testing section or null if not found
 */
export async function readDomainTesting(domainId) {
  try {
    const filePath = getDomainSectionContentPath(domainId, TESTING_SECTION);
    const content = await tryReadJsonFile(
      filePath,
      `domain ${domainId} testing`,
    );
    const metadata = await readDomainTestingMetadata(domainId);

    if (!metadata) {
      return content;
    }

    return {
      ...content,
      metadata,
    };
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
  const dirPath = getDomainSectionDir(domainId, TESTING_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(domainId, TESTING_SECTION);
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      TESTING_SECTION,
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }
}

/**
 * Read domain testing metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainTestingMetadata(domainId) {
  try {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      TESTING_SECTION,
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
