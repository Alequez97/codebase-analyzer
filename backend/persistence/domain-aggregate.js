import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { SECTION_TYPES } from "../constants/section-types.js";
import { TASK_STATUS } from "../constants/task-status.js";
import {
  readDomainDocumentation,
  writeDomainDocumentation,
} from "./domain-documentation.js";
import {
  readDomainRequirements,
  writeDomainRequirements,
} from "./domain-requirements.js";
import {
  readDomainTesting,
  writeDomainTesting,
} from "./domain-refactoring-and-testing.js";
import {
  readDomainBugsSecurity,
  writeDomainBugsSecurity,
} from "./domain-bugs-security.js";
import {
  getDomainSectionContentPath,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";
import { tryReadJsonFile } from "./utils.js";
import { readTask } from "./tasks.js";

/**
 * Read a specific domain analysis (merged from four separate sections)
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Domain analysis or null if not found
 */
export async function readDomain(domainId) {
  try {
    const [documentation, requirements, testing, bugsSecurity] =
      await Promise.all([
        readDomainDocumentation(domainId),
        readDomainRequirements(domainId),
        readDomainTesting(domainId),
        readDomainBugsSecurity(domainId),
      ]);

    if (!documentation && !requirements && !testing && !bugsSecurity) {
      return null;
    }

    const merged = {
      domainId,
      timestamp: new Date().toISOString(),
    };

    if (documentation) {
      merged.documentation = documentation.content;
      // domainName can come from metadata or fallback to domainId
      merged.domainName = documentation.metadata?.domainName || domainId;
    }

    if (requirements) {
      merged.requirements = requirements.requirements;
      if (!merged.domainName) {
        merged.domainName = requirements.domainName || domainId;
      }
    }

    if (testing) {
      merged.testing = testing.testing;
      if (!merged.domainName) {
        merged.domainName = testing.domainName || domainId;
      }
    }

    if (bugsSecurity) {
      merged.bugsSecurity = bugsSecurity.bugsSecurity;
      if (!merged.domainName) {
        merged.domainName = bugsSecurity.domainName || domainId;
      }
    }

    return merged;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain analysis to file (legacy - writes all sections to separate files)
 * @deprecated Use writeDomainDocumentation, writeDomainRequirements, writeDomainTesting, writeDomainBugsSecurity instead
 * @param {string} domainId - The domain ID
 * @param {Object} data - Domain analysis data
 */
export async function writeDomain(domainId, data) {
  const {
    documentation,
    requirements,
    testing,
    bugsSecurity,
    domainName,
    timestamp,
  } = data;

  const baseData = {
    domainId,
    domainName: domainName || domainId,
    timestamp: timestamp || new Date().toISOString(),
  };

  if (documentation) {
    await writeDomainDocumentation(domainId, {
      content: documentation,
      metadata: {
        domainId,
        domainName: baseData.domainName,
        timestamp: baseData.timestamp,
        status: TASK_STATUS.COMPLETED,
      },
    });
  }

  if (requirements) {
    await writeDomainRequirements(domainId, {
      ...baseData,
      requirements,
    });
  }

  if (testing) {
    await writeDomainTesting(domainId, {
      ...baseData,
      testing,
    });
  }

  if (bugsSecurity) {
    await writeDomainBugsSecurity(domainId, {
      ...baseData,
      bugsSecurity,
    });
  }
}

/**
 * Read logs for a domain section by resolving the last task revision.
 * Reads the section's metadata.json, takes the last revision's taskId,
 * looks up that task, and reads its log file.
 * @param {string} domainId - The domain ID
 * @param {string} section - Section type (documentation, requirements, refactoring-and-testing, bugs-security, diagrams)
 * @returns {Promise<string|null>} Logs content or null if not found
 */
export async function readDomainSectionLogs(domainId, section) {
  const metadataPath = getDomainSectionMetadataPath(domainId, section);

  let metadata = null;
  try {
    metadata = await tryReadJsonFile(metadataPath, `${section} metadata`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (!metadata?.revisions?.length) {
    return null;
  }

  const lastRevision = metadata.revisions[metadata.revisions.length - 1];
  const taskId = lastRevision?.taskId;
  if (!taskId) {
    return null;
  }

  const task = await readTask(taskId);
  if (!task?.logFile) {
    return null;
  }

  try {
    const absoluteLogPath = path.join(
      config.paths.targetAnalysis,
      task.logFile,
    );
    return await fs.readFile(absoluteLogPath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * List all domain IDs that have analyses
 * @returns {Promise<string[]>} Array of domain IDs
 */
export async function listDomains() {
  try {
    const domainsDir = path.join(config.paths.targetAnalysis, "domains");

    try {
      await fs.access(domainsDir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(domainsDir, { withFileTypes: true });
    const domainIds = new Set();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        domainIds.add(entry.name);
      } else if (entry.name.endsWith(".json")) {
        const domainId = entry.name
          .replace(".json", "")
          .replace(/-documentation$/, "")
          .replace(/-requirements$/, "")
          .replace(/-testing$/, "");
        domainIds.add(domainId);
      }
    }

    return Array.from(domainIds);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Check which analysis sections exist for a domain
 * @param {string} domainId - Domain ID
 * @returns {Promise<{documentation: boolean, requirements: boolean, bugsSecurity: boolean, testing: boolean}>}
 */
export async function getDomainSectionsStatus(domainId) {
  const checkFile = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const docPath = path.join(
    config.paths.targetAnalysis,
    "domains",
    domainId,
    SECTION_TYPES.DOCUMENTATION,
    "content.md",
  );

  const [documentation, requirements, bugsSecurity, testing] =
    await Promise.all([
      checkFile(docPath),
      checkFile(
        getDomainSectionContentPath(domainId, SECTION_TYPES.REQUIREMENTS),
      ),
      checkFile(
        getDomainSectionContentPath(domainId, SECTION_TYPES.BUGS_SECURITY),
      ),
      checkFile(
        getDomainSectionContentPath(
          domainId,
          SECTION_TYPES.REFACTORING_AND_TESTING,
        ),
      ),
    ]);

  return { documentation, requirements, bugsSecurity, testing };
}
