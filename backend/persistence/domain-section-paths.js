import path from "path";
import config from "../config.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";

export function getDomainDir(domainId) {
  return path.join(config.paths.targetAnalysis, "domains", domainId);
}

export function getDomainSectionDir(domainId, sectionId) {
  return path.join(getDomainDir(domainId), sectionId);
}

export function getDomainSectionContentPath(domainId, sectionId) {
  return path.join(
    getDomainSectionDir(domainId, sectionId),
    PERSISTENCE_FILES.CONTENT_JSON,
  );
}

export function getDomainSectionMetadataPath(domainId, sectionId) {
  return path.join(
    getDomainSectionDir(domainId, sectionId),
    PERSISTENCE_FILES.METADATA_JSON,
  );
}

export function getDomainSectionFilePath(domainId, sectionId, fileName) {
  return path.join(getDomainSectionDir(domainId, sectionId), fileName);
}

/**
 * Get the relative path to a section content.md file (relative to the target project root).
 * Used when passing file paths to the LLM agent as tool arguments.
 */
export function getDomainSectionContentMdRelativePath(domainId, sectionId) {
  return `${PERSISTENCE_FILES.ANALYSIS_ROOT_DIR}/domains/${domainId}/${sectionId}/${PERSISTENCE_FILES.CONTENT_MD}`;
}

/**
 * Get the relative path to a section content.json file (relative to the target project root).
 * Used when passing file paths to the LLM agent as tool arguments.
 */
export function getDomainSectionContentJsonRelativePath(domainId, sectionId) {
  return `${PERSISTENCE_FILES.ANALYSIS_ROOT_DIR}/domains/${domainId}/${sectionId}/${PERSISTENCE_FILES.CONTENT_JSON}`;
}
