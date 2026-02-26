import path from "path";
import { PERSISTENCE_FILES } from "./persistence-files.js";

const ANALYSIS_DIR = "analysis";
const DOMAINS_DIR = "domains";

export const DOMAIN_SECTION_IDS = {
  DOCUMENTATION: "documentation",
  REQUIREMENTS: "requirements",
  TESTING: "testing",
  BUGS_SECURITY: "bugs-security",
  DIAGRAMS: "diagrams",
};

function joinOutputPath(...parts) {
  return path.posix.join(...parts);
}

export function getCodebaseAnalysisOutputPath() {
  return joinOutputPath(
    PERSISTENCE_FILES.ANALYSIS_ROOT_DIR,
    ANALYSIS_DIR,
    PERSISTENCE_FILES.CODEBASE_ANALYSIS_JSON,
  );
}

export function getDomainSectionOutputPath(domainId, sectionId, fileName) {
  return joinOutputPath(
    PERSISTENCE_FILES.ANALYSIS_ROOT_DIR,
    DOMAINS_DIR,
    domainId,
    sectionId,
    fileName,
  );
}

export function getDomainSectionContentJsonOutputPath(domainId, sectionId) {
  return getDomainSectionOutputPath(
    domainId,
    sectionId,
    PERSISTENCE_FILES.CONTENT_JSON,
  );
}

export function getDomainSectionMetadataOutputPath(domainId, sectionId) {
  return getDomainSectionOutputPath(
    domainId,
    sectionId,
    PERSISTENCE_FILES.METADATA_JSON,
  );
}

export function getDomainSectionContentMarkdownOutputPath(domainId, sectionId) {
  return getDomainSectionOutputPath(
    domainId,
    sectionId,
    PERSISTENCE_FILES.CONTENT_MD,
  );
}
