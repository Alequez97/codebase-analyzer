import fs from "fs/promises";
import { SECTION_TYPES } from "../constants/section-types.js";
import { tryReadJsonFile, appendRevision } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionDir,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

/**
 * Read domain requirements section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Requirements section or null if not found
 */
export async function readDomainRequirements(domainId) {
  try {
    const filePath = getDomainSectionContentPath(
      domainId,
      SECTION_TYPES.REQUIREMENTS,
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
  const dirPath = getDomainSectionDir(domainId, SECTION_TYPES.REQUIREMENTS);
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(
    domainId,
    SECTION_TYPES.REQUIREMENTS,
  );
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      SECTION_TYPES.REQUIREMENTS,
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }
}

/**
 * Append a revision entry to the requirements metadata.json.
 * @param {string} domainId - The domain ID
 * @param {Object} revision - Revision entry (task or manual-save)
 * @returns {Promise<Object>} Updated metadata { version, revisions }
 */
export async function appendRequirementsRevision(domainId, revision) {
  const metadataPath = getDomainSectionMetadataPath(
    domainId,
    SECTION_TYPES.REQUIREMENTS,
  );
  return appendRevision(metadataPath, revision);
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
      SECTION_TYPES.REQUIREMENTS,
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
