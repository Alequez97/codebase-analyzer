import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Get the diagrams directory path for a domain
 * @param {string} domainId - The domain ID
 * @returns {string} Path to diagrams directory
 */
function getDiagramsDir(domainId) {
  return path.join(
    config.paths.targetAnalysis,
    "domains",
    domainId,
    "diagrams",
  );
}

/**
 * Read domain diagrams metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Diagrams metadata or null if not found
 */
export async function readDomainDiagrams(domainId) {
  try {
    const metadataPath = path.join(getDiagramsDir(domainId), "metadata.json");
    return await tryReadJsonFile(metadataPath, `domain ${domainId} diagrams`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain diagrams metadata
 * @param {string} domainId - The domain ID
 * @param {Object} data - Diagrams metadata {diagrams: Array<{id, title, description, type, fileName}>}
 */
export async function writeDomainDiagrams(domainId, data) {
  const diagramsDir = getDiagramsDir(domainId);
  await fs.mkdir(diagramsDir, { recursive: true });

  const metadataPath = path.join(diagramsDir, "metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read a specific diagram file
 * @param {string} domainId - The domain ID
 * @param {string} fileName - The diagram file name (e.g., "architecture.drawio")
 * @returns {Promise<string>} Diagram XML content
 */
export async function readDiagramFile(domainId, fileName) {
  const filePath = path.join(getDiagramsDir(domainId), fileName);
  return await fs.readFile(filePath, "utf-8");
}

/**
 * Write a diagram file
 * @param {string} domainId - The domain ID
 * @param {string} fileName - The diagram file name (e.g., "architecture.drawio")
 * @param {string} content - Diagram XML content
 */
export async function writeDiagramFile(domainId, fileName, content) {
  const diagramsDir = getDiagramsDir(domainId);
  await fs.mkdir(diagramsDir, { recursive: true });

  const filePath = path.join(diagramsDir, fileName);
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * List all diagram files for a domain
 * @param {string} domainId - The domain ID
 * @returns {Promise<string[]>} Array of diagram file names
 */
export async function listDiagramFiles(domainId) {
  try {
    const diagramsDir = getDiagramsDir(domainId);
    const files = await fs.readdir(diagramsDir);
    return files.filter((file) => file.endsWith(".drawio"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Delete a diagram file
 * @param {string} domainId - The domain ID
 * @param {string} fileName - The diagram file name
 */
export async function deleteDiagramFile(domainId, fileName) {
  const filePath = path.join(getDiagramsDir(domainId), fileName);
  await fs.unlink(filePath);
}

/**
 * Get the absolute file path for a diagram
 * @param {string} domainId - The domain ID
 * @param {string} fileName - The diagram file name
 * @returns {string} Absolute path to the diagram file
 */
export function getDiagramFilePath(domainId, fileName) {
  return path.resolve(getDiagramsDir(domainId), fileName);
}
