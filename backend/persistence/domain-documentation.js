import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain documentation section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Documentation data {content: string, metadata: object} or null if not found
 */
export async function readDomainDocumentation(domainId) {
  try {
    const docDir = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "documentation",
    );

    // Read content.md
    const contentPath = path.join(docDir, "content.md");
    const content = await fs.readFile(contentPath, "utf-8");

    // Read metadata.json (if exists)
    const metadataPath = path.join(docDir, "metadata.json");
    let metadata = null;
    try {
      metadata = await tryReadJsonFile(metadataPath, "documentation metadata");
    } catch (err) {
      // Metadata is optional
    }

    return {
      content,
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
 * Write domain documentation (content + metadata)
 * @param {string} domainId - The domain ID
 * @param {Object} data - Documentation data {content: string, metadata?: object}
 */
export async function writeDomainDocumentation(domainId, data) {
  const docDir = path.join(
    config.paths.targetAnalysis,
    "domains",
    domainId,
    "documentation",
  );
  await fs.mkdir(docDir, { recursive: true });

  // Write content.md
  const contentPath = path.join(docDir, "content.md");
  await fs.writeFile(contentPath, data.content, "utf-8");

  // Write metadata.json (if provided)
  if (data.metadata) {
    const metadataPath = path.join(docDir, "metadata.json");
    await fs.writeFile(
      metadataPath,
      JSON.stringify(data.metadata, null, 2),
      "utf-8",
    );
  }
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
      "documentation",
      "metadata.json",
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
