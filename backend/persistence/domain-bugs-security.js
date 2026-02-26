import fs from "fs/promises";
import { SECTION_TYPES } from "../constants/section-types.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import { tryReadJsonFile } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionFilePath,
  getDomainSectionDir,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

const BUGS_SECURITY_SECTION = "bugs-security";

/**
 * Read domain bugs & security section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Bugs & security section or null if not found
 */
export async function readDomainBugsSecurity(domainId) {
  try {
    const filePath = getDomainSectionContentPath(
      domainId,
      BUGS_SECURITY_SECTION,
    );
    const content = await tryReadJsonFile(
      filePath,
      `domain ${domainId} bugs-security`,
    );
    const metadata = await readDomainBugsSecurityMetadata(domainId);

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
 * Write domain bugs & security section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Bugs & security data
 */
export async function writeDomainBugsSecurity(domainId, data) {
  const dirPath = getDomainSectionDir(domainId, BUGS_SECURITY_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(domainId, BUGS_SECURITY_SECTION);
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      BUGS_SECURITY_SECTION,
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }
}

/**
 * Read domain bugs & security metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainBugsSecurityMetadata(domainId) {
  try {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      BUGS_SECURITY_SECTION,
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} bugs-security metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

// ============================================================================
// Finding Actions
// ============================================================================

function buildSummary(actions) {
  const summary = {
    total: actions.length,
    applied: 0,
    wontFix: 0,
    fixedManually: 0,
  };

  actions.forEach((action) => {
    if (action.action === "apply") {
      summary.applied += 1;
      return;
    }

    if (action.action === "wont-fix") {
      summary.wontFix += 1;
      return;
    }

    if (action.action === "fixed-manually") {
      summary.fixedManually += 1;
    }
  });

  return summary;
}

function createRegistry(domainId) {
  const timestamp = new Date().toISOString();

  return {
    domainId,
    section: SECTION_TYPES.BUGS_SECURITY,
    metadata: {
      created: timestamp,
      lastUpdated: timestamp,
      version: "1.0",
    },
    actions: [],
    summary: {
      total: 0,
      applied: 0,
      wontFix: 0,
      fixedManually: 0,
    },
  };
}

function createActionId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ACTION-${Date.now()}-${suffix}`;
}

/**
 * Read bugs & security finding actions for a domain
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Finding actions registry or null if not found
 */
export async function readBugsSecurityFindingActions(domainId) {
  try {
    const filePath = getDomainSectionFilePath(
      domainId,
      BUGS_SECURITY_SECTION,
      PERSISTENCE_FILES.ACTIONS_JSON,
    );

    return await tryReadJsonFile(
      filePath,
      `domain ${domainId} finding actions`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write bugs & security finding actions for a domain
 * @param {string} domainId - The domain ID
 * @param {Object} data - Finding actions registry
 */
export async function writeBugsSecurityFindingActions(domainId, data) {
  const dirPath = getDomainSectionDir(domainId, BUGS_SECURITY_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = getDomainSectionFilePath(
    domainId,
    BUGS_SECURITY_SECTION,
    PERSISTENCE_FILES.ACTIONS_JSON,
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Record a new action for a bugs & security finding
 * @param {string} domainId - The domain ID
 * @param {Object} actionInput - Action payload
 * @returns {Promise<{action: Object, registry: Object}>}
 */
export async function recordBugsSecurityFindingAction(domainId, actionInput) {
  const registry =
    (await readBugsSecurityFindingActions(domainId)) ||
    createRegistry(domainId);
  const timestamp = new Date().toISOString();

  const action = {
    id: actionInput.id || createActionId(),
    findingId: actionInput.findingId,
    action: actionInput.action,
    status: actionInput.status || "recorded",
    timestamp,
    reason: actionInput.reason || "",
    metadata: actionInput.metadata || {},
  };

  registry.actions = [...registry.actions, action];
  registry.metadata = {
    ...registry.metadata,
    lastUpdated: timestamp,
  };
  registry.summary = buildSummary(registry.actions);

  await writeBugsSecurityFindingActions(domainId, registry);

  return { action, registry };
}
