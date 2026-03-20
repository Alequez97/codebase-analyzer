import path from "path";
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
