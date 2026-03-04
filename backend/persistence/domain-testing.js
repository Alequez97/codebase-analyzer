import fs from "fs/promises";
import {
  TESTING_ACTION_STATUS,
  TESTING_ACTION_TYPES,
} from "../constants/testing-actions.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import { SECTION_TYPES } from "../constants/section-types.js";
import { tryReadJsonFile } from "./utils.js";
import {
  getDomainSectionContentPath,
  getDomainSectionDir,
  getDomainSectionFilePath,
  getDomainSectionMetadataPath,
} from "./domain-section-paths.js";

/**
 * Read domain testing section
 * @param {string} domainId - The domain ID
 * @returns {Promise<Object|null>} Testing section or null if not found
 */
export async function readDomainTesting(domainId) {
  try {
    const filePath = getDomainSectionContentPath(
      domainId,
      SECTION_TYPES.REFACTORING_AND_TESTING,
    );
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
  const dirPath = getDomainSectionDir(
    domainId,
    SECTION_TYPES.REFACTORING_AND_TESTING,
  );
  await fs.mkdir(dirPath, { recursive: true });

  const { metadata, ...content } = data;
  const filePath = getDomainSectionContentPath(
    domainId,
    SECTION_TYPES.REFACTORING_AND_TESTING,
  );
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

  if (metadata) {
    const metadataPath = getDomainSectionMetadataPath(
      domainId,
      SECTION_TYPES.REFACTORING_AND_TESTING,
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
      SECTION_TYPES.REFACTORING_AND_TESTING,
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
    section: SECTION_TYPES.REFACTORING_AND_TESTING,
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
      SECTION_TYPES.REFACTORING_AND_TESTING,
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
  const dirPath = getDomainSectionDir(
    domainId,
    SECTION_TYPES.REFACTORING_AND_TESTING,
  );
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = getDomainSectionFilePath(
    domainId,
    SECTION_TYPES.REFACTORING_AND_TESTING,
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

/**
 * Mark a refactoring recommendation as applied in the domain testing content
 * @param {string} domainId - The domain ID
 * @param {Object} input - Action input
 * @param {string} input.refactoringId - The refactoring ID (e.g. "REFACTOR-001")
 * @param {string} input.taskId - The task ID that applied the refactoring
 * @param {string} input.serviceFile - The new service file created
 * @param {string} input.timestamp - ISO timestamp
 */
export async function recordRefactoringApplied(domainId, input) {
  const existing = await readDomainTesting(domainId);
  if (!existing) {
    return {
      success: false,
      error: `Domain testing not found for ${domainId}`,
    };
  }

  const refactorings = Array.isArray(existing.refactoringRecommendations)
    ? [...existing.refactoringRecommendations]
    : [];

  const index = refactorings.findIndex((r) => r.id === input.refactoringId);
  if (index < 0) {
    return {
      success: false,
      error: `Refactoring ${input.refactoringId} not found in domain ${domainId}`,
    };
  }

  refactorings[index] = {
    ...refactorings[index],
    status: "applied",
    appliedAt: input.timestamp || new Date().toISOString(),
    appliedTaskId: input.taskId || null,
    serviceFile: input.serviceFile || null,
  };

  const updatedData = {
    ...existing,
    refactoringRecommendations: refactorings,
  };

  await writeDomainTesting(domainId, updatedData);

  return {
    success: true,
    refactoring: refactorings[index],
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
