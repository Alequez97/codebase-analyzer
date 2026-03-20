import path from "path";
import fs from "fs/promises";
import config from "../../../config.js";

export function slugifyDesignId(value) {
  return (
    String(value || "new-concept")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "new-concept"
  );
}

/**
 * Get the next available design version (v1, v2, v3, etc.)
 * Scans .code-analysis/design/ for existing versions
 * @returns {Promise<string>} Next version ID (e.g., "v2")
 */
export async function getNextDesignVersion() {
  const designRoot = path.join(
    config.target.directory,
    ".code-analysis",
    "design",
  );

  try {
    const entries = await fs.readdir(designRoot, { withFileTypes: true });
    const versions = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => /^v\d+$/.test(name)) // Match v1, v2, v3, etc.
      .map((name) => parseInt(name.substring(1))) // Extract number
      .filter((num) => !isNaN(num));

    const maxVersion = versions.length > 0 ? Math.max(...versions) : 0;
    return `v${maxVersion + 1}`;
  } catch (error) {
    // If directory doesn't exist or error reading, start with v1
    if (error.code === "ENOENT") {
      return "v1";
    }
    throw error;
  }
}

export function getDesignRootRelativePath() {
  return ".code-analysis/design";
}

export function getDesignVariantRelativePath(designId) {
  return `${getDesignRootRelativePath()}/${slugifyDesignId(designId)}`;
}

export function getDesignFoundationRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/foundation`;
}

export function getDesignBriefRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/brief.md`;
}

export function getDesignAppManifestRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/app-manifest.json`;
}

export function getDesignSystemManifestRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/design-system.json`;
}

export function getDesignPagesRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/pages`;
}

export function slugifyDesignPageId(value) {
  return slugifyDesignId(value || "page");
}

export function getDesignPageRelativePath(designId, pageId) {
  return `${getDesignPagesRelativePath(designId)}/${slugifyDesignPageId(pageId)}`;
}

export function getDesignHtmlOutputPath(designId, pageId = "index") {
  return `${getDesignPageRelativePath(designId, pageId)}/index.html`;
}

export function getDesignCssOutputPath(designId, pageId = "index") {
  return `${getDesignPageRelativePath(designId, pageId)}/styles.css`;
}

export function getDesignJsOutputPath(designId, pageId = "index") {
  return `${getDesignPageRelativePath(designId, pageId)}/app.js`;
}

export function getDesignTokensOutputPath(designId) {
  return `${getDesignFoundationRelativePath(designId)}/tokens.css`;
}

export function getAbsoluteDesignPath(relativePath) {
  return path.join(config.target.directory, relativePath);
}
