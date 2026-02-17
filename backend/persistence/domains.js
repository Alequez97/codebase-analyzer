import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

/**
 * Read domain documentation section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Documentation section or null if not found
 */
export async function readDomainDocumentation(domainId) {
  try {
    // Try new markdown format first
    const markdownPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
      "documentation.md",
    );

    try {
      const markdownContent = await fs.readFile(markdownPath, "utf-8");
      return {
        domainId,
        timestamp: new Date().toISOString(),
        documentation: {
          businessPurpose: markdownContent,
        },
      };
    } catch (mdError) {
      if (mdError.code !== "ENOENT") {
        throw mdError;
      }
    }

    // Fall back to legacy JSON format
    const jsonPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      `${domainId}-documentation.json`,
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
 * @param {string|Object} data - Documentation data (string for markdown, object for JSON)
 */
export async function writeDomainDocumentation(domainId, data) {
  // If data is a string, write as markdown
  if (typeof data === "string") {
    const dirPath = path.join(
      config.paths.targetAnalysis,
      "domains",
      domainId,
    );
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, "documentation.md");
    await fs.writeFile(filePath, data, "utf-8");
  } else {
    // Legacy: write as JSON
    const filePath = path.join(
      config.paths.targetAnalysis,
      "domains",
      `${domainId}-documentation.json`,
    );
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
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
      `${domainId}-requirements.json`,
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
  const filePath = path.join(
    config.paths.targetAnalysis,
    "domains",
    `${domainId}-requirements.json`,
  );
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
      `${domainId}-testing.json`,
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
  const filePath = path.join(
    config.paths.targetAnalysis,
    "domains",
    `${domainId}-testing.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read a specific domain analysis (merged from three separate files)
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Domain analysis or null if not found
 */
export async function readDomain(domainId) {
  try {
    // Read all three sections
    const [documentation, requirements, testing] = await Promise.all([
      readDomainDocumentation(domainId),
      readDomainRequirements(domainId),
      readDomainTesting(domainId),
    ]);

    // If all sections are null, domain doesn't exist
    if (!documentation && !requirements && !testing) {
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

    return merged;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write domain analysis to file (legacy - writes all sections to single file)
 * @deprecated Use writeDomainDocumentation, writeDomainRequirements, writeDomainTesting instead
 * @param {string} domainId - The domain ID
 * @param {Object} data - Domain analysis data
 */
export async function writeDomain(domainId, data) {
  // Split data into three separate files
  const { documentation, requirements, testing, domainName, timestamp } = data;

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
}

/**
 * List all domain IDs that have analyses
 * @returns {Promise<string[]>} Array of domain IDs
 */
export async function listDomains() {
  try {
    const domainsDir = path.join(config.paths.targetAnalysis, "domains");
    const files = await fs.readdir(domainsDir);

    // Extract unique domain IDs from filenames
    const domainIds = new Set();
    files
      .filter((f) => f.endsWith(".json"))
      .forEach((f) => {
        // Remove file extension and section suffix
        const domainId = f
          .replace(".json", "")
          .replace(/-documentation$/, "")
          .replace(/-requirements$/, "")
          .replace(/-testing$/, "");
        domainIds.add(domainId);
      });

    return Array.from(domainIds);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
