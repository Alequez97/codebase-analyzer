import fs from "fs/promises";
import {
  TESTING_ACTION_STATUS,
  TESTING_ACTION_TYPES,
} from "../constants/testing-actions.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import { tryReadJsonFile } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionDir,
  getDomainSectionFilePath,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

const TESTING_SECTION = "testing";

/**
 * Read domain testing section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Testing section or null if not found
 */
export async function readDomainTesting(domainId) {
  try {
    const filePath = getDomainSectionContentPath(domainId, TESTING_SECTION);
    const content = await tryReadJsonFile(
      filePath,
      `domain ${domainId} testing`,
    );
    const metadata = await readDomainTestingMetadata(domainId);

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
 * Write domain testing section
 * @param {string} domainId - The domain ID
 * @param {Object} data - Testing data
 */
export async function writeDomainTesting(domainId, data) {
  const dirPath = getDomainSectionDir(domainId, TESTING_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(domainId, TESTING_SECTION);
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      TESTING_SECTION,
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }
}

/**
 * Read domain testing metadata
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Metadata or null if not found
 */
export async function readDomainTestingMetadata(domainId) {
  try {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      TESTING_SECTION,
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

function createTestingActionId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ACTION-${Date.now()}-${suffix}`;
}

function createApplyActionsRegistry(domainId) {
  const timestamp = new Date().toISOString();

  return {
    domainId,
    section: TESTING_SECTION,
    metadata: {
      created: timestamp,
      lastUpdated: timestamp,
      version: "1.0",
    },
    actions: [],
  };
}

export async function readTestingApplyActions(domainId) {
  try {
    const filePath = getDomainSectionFilePath(
      domainId,
      TESTING_SECTION,
      PERSISTENCE_FILES.ACTIONS_JSON,
    );

    return await tryReadJsonFile(
      filePath,
      `domain ${domainId} testing apply actions`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeTestingApplyActions(domainId, data) {
  const dirPath = getDomainSectionDir(domainId, TESTING_SECTION);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = getDomainSectionFilePath(
    domainId,
    TESTING_SECTION,
    PERSISTENCE_FILES.ACTIONS_JSON,
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function recordTestingApplyCompleted(domainId, actionInput) {
  const existing = await readDomainTesting(domainId);
  if (!existing) {
    return {
      success: false,
      error: `Domain testing not found for ${domainId}`,
    };
  }

  const registry =
    (await readTestingApplyActions(domainId)) ||
    createApplyActionsRegistry(domainId);

  const action = {
    id: createTestingActionId(),
    testId: actionInput.testId,
    action: TESTING_ACTION_TYPES.APPLY,
    status: TESTING_ACTION_STATUS.COMPLETED,
    taskId: actionInput.taskId || null,
    testFile: actionInput.testFile || "",
    timestamp: new Date().toISOString(),
  };

  registry.actions = [...(registry.actions || []), action];
  registry.metadata = {
    ...(registry.metadata || {}),
    lastUpdated: action.timestamp,
  };

  await writeTestingApplyActions(domainId, registry);

  return {
    success: true,
    action,
  };
}

export async function upsertDomainExistingTest(domainId, testInput) {
  const existing = await readDomainTesting(domainId);
  if (!existing) {
    return {
      success: false,
      error: `Domain testing not found for ${domainId}`,
    };
  }

  const existingTests = Array.isArray(existing.existingTests)
    ? [...existing.existingTests]
    : [];

  const incomingFile = testInput?.file;
  if (!incomingFile) {
    return {
      success: false,
      error: "Test file path is required",
    };
  }

  const nextTest = {
    file: incomingFile,
    description: testInput?.description || "Generated by Apply Test",
    testType: testInput?.testType || "unit",
  };

  const index = existingTests.findIndex((item) => item.file === incomingFile);
  if (index >= 0) {
    existingTests[index] = {
      ...existingTests[index],
      ...nextTest,
    };
  } else {
    existingTests.push(nextTest);
  }

  const updatedData = {
    ...existing,
    existingTests,
  };

  await writeDomainTesting(domainId, updatedData);

  return {
    success: true,
    existingTests,
  };
}
