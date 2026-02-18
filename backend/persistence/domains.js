import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain bugs & security section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Bugs & security section or null if not found
 */
export async function readDomainBugsSecurity(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "bugs-security.json",
    );
    return await tryReadJsonFile(filePath, `domain ${domainId} bugs-security`);
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
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "bugs-security.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain documentation section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Documentation section or null if not found
 */
export async function readDomainDocumentation(domainId) {
  try {
    // Read documentation.json which contains {content, metadata}
    const jsonPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "documentation.json",
    );
    return await tryReadJsonFile(jsonPath, `domain ${domainId} documentation`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain documentation section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Documentation data {content: string, metadata: object}
 */
export async function writeDomainDocumentation(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "documentation.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain requirements section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Requirements section or null if not found
 */
export async function readDomainRequirements(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "requirements.json",
    );
    return await tryReadJsonFile(filePath, `domain ${domainId} requirements`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain requirements section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Requirements data
 */
export async function writeDomainRequirements(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "requirements.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read domain testing section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Testing section or null if not found
 */
export async function readDomainTesting(domainId) {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "testing.json",
    );
    return await tryReadJsonFile(filePath, `domain ${domainId} testing`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain testing section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Testing data
 */
export async function writeDomainTesting(domainId, data) {
  const dirPath = path.join(config.paths.targetAnalysis, "domains", domainId);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "testing.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read a specific domain analysis (merged from four separate sections)
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Domain analysis or null if not found
 */
export async function readDomain(domainId) {
  try {
    // Read all sections
    const [documentation, requirements, testing, bugsSecurity] =
      await Promise.all([
        readDomainDocumentation(domainId),
        readDomainRequirements(domainId),
        readDomainTesting(domainId),
        readDomainBugsSecurity(domainId),
      ]);

    // If all sections are null, domain doesn't exist
    if (!documentation && !requirements && !testing && !bugsSecurity) {
      return null;
    }

    // Merge sections into a single domain analysis object
    const merged = {
      domainId,
      timestamp: new Date().toISOString(),
    };

    if (documentation) {
      merged.documentation = documentation.documentation;
      merged.domainName = documentation.domainName || domainId;
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
  // Split data into separate files
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
      ...baseData,
      documentation,
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
      "documentation.meta.json",
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

/**
 * Read domain requirements metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainRequirementsMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "requirements.meta.json",
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} requirements metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Read domain testing metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainTestingMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "testing.meta.json",
    );
    return await tryReadJsonFile(
      metadataPath,
      `domain ${domainId} testing metadata`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Read domain bugs & security metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainBugsSecurityMetadata(domainId) {
  try {
    const metadataPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "bugs-security.meta.json",
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

/**
 * Read logs from a domain section JSON file
 * @param {string} domainId - The domain ID
 * @param {string} section - Section type (documentation, requirements, testing, bugs-security)
 * @returns {Promise<string|null>} Logs content or null if not found
 */
export async function readDomainSectionLogs(domainId, section) {
  try {
    let sectionData = null;

    // Get the appropriate section data
    switch (section) {
      case "documentation":
        sectionData = await readDomainDocumentation(domainId);
        break;
      case "requirements":
        sectionData = await readDomainRequirements(domainId);
        break;
      case "testing":
        sectionData = await readDomainTesting(domainId);
        break;
      case "bugs-security":
        sectionData = await readDomainBugsSecurity(domainId);
        break;
      default:
        return null;
    }

    // Extract log file path from metadata or root level
    const logFilePath = sectionData?.metadata?.logFile || sectionData?.logFile;

    if (!logFilePath) {
      return null;
    }

    // Read the actual log file
    try {
      const absoluteLogPath = path.join(
        config.paths.targetAnalysis,
        logFilePath,
      );
      const logContent = await fs.readFile(absoluteLogPath, "utf-8");
      return logContent;
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
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

    // Check if directory exists
    try {
      await fs.access(domainsDir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(domainsDir, { withFileTypes: true });

    // Get all subdirectories (each represents a domain)
    const domainIds = new Set();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        domainIds.add(entry.name);
      } else if (entry.name.endsWith(".json")) {
        // Legacy support: extract domain ID from JSON filenames
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
