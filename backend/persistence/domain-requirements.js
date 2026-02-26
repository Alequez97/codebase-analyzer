import fs from "fs/promises";
import { tryReadJsonFile } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionDir,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

const REQUIREMENTS_SECTION = "requirements";

/**
 * Read domain requirements section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Requirements section or null if not found
 */
export async function readDomainRequirements(domainId) {
  try {
    const filePath = getDomainSectionContentPath(
      domainId,
      REQUIREMENTS_SECTION,
    );
    const content = await tryReadJsonFile(
      filePath,
      `domain ${domainId} requirements`,
    );

    const metadata = await readDomainRequirementsMetadata(domainId);

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
 * Write domain requirements section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Requirements data
 */
export async function writeDomainRequirements(domainId, data) {
  const dirPath = getDomainSectionDir(domainId, REQUIREMENTS_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(domainId, REQUIREMENTS_SECTION);
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      REQUIREMENTS_SECTION,
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }
}

/**
 * Read domain requirements metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainRequirementsMetadata(domainId) {
  try {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      REQUIREMENTS_SECTION,
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
