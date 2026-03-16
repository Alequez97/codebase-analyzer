import path from "path";
import config from "../../config.js";

export function slugifyDesignId(value) {
  return String(value || "new-concept")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "new-concept";
}

export function getDesignRootRelativePath() {
  return ".code-analysis/design";
}

export function getDesignVariantRelativePath(designId) {
  return `${getDesignRootRelativePath()}/${slugifyDesignId(designId)}`;
}

export function getDesignFoundationRelativePath() {
  return `${getDesignRootRelativePath()}/foundation`;
}

export function getDesignBriefRelativePath(designId) {
  return `${getDesignVariantRelativePath(designId)}/brief.md`;
}

export function getDesignHtmlOutputPath(designId) {
  return `${getDesignVariantRelativePath(designId)}/index.html`;
}

export function getDesignCssOutputPath(designId) {
  return `${getDesignVariantRelativePath(designId)}/styles.css`;
}

export function getDesignJsOutputPath(designId) {
  return `${getDesignVariantRelativePath(designId)}/app.js`;
}

export function getDesignTokensOutputPath() {
  return `${getDesignFoundationRelativePath()}/tokens.css`;
}

export function getAbsoluteDesignPath(relativePath) {
  return path.join(config.target.directory, relativePath);
}
