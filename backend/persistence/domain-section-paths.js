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
