import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "../persistence/utils.js";
import * as logger from "./logger.js";

/**
 * Get the file path for a task's chat history
 * @param {string} taskId
 * @returns {string}
 */
function getChatHistoryPath(taskId) {
  return path.join(
    config.paths.targetAnalysis,
    "tasks",
    "chat-history",
    `${taskId}-chat.json`,
  );
}

/**
 * Get the file path for a domain section chat history
 * @param {string} domainId
 * @param {string} sectionType
 * @returns {string}
 */
function getDomainSectionChatPath(domainId, sectionType) {
  return path.join(
    config.paths.targetAnalysis,
    "tasks",
    "chat-history",
    `domain-${domainId}-${sectionType}.json`,
  );
}

/**
 * Initialize an empty chat history file for a new task
 * @param {string} taskId
 * @param {Object} meta - { taskType, domainId, sectionType }
 * @returns {Promise<void>}
 */
export async function initChatHistory(
  taskId,
  { taskType, domainId = null, sectionType = null } = {},
) {
  const filePath = getChatHistoryPath(taskId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const history = {
    taskId,
    taskType,
    domainId,
    sectionType,
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messages: [],
  };

  await fs.writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");

  logger.debug(`Chat history initialized for task ${taskId}`, {
    component: "ChatHistory",
    filePath,
  });
}

/**
 * Load chat history for a task
 * @param {string} taskId
 * @returns {Promise<Object|null>}
 */
export async function loadChatHistory(taskId) {
  const filePath = getChatHistoryPath(taskId);

  try {
    return await tryReadJsonFile(filePath, `chat-history ${taskId}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Append a message to a task's chat history
 * @param {string} taskId
 * @param {Object} message - { role, content }
 * @returns {Promise<void>}
 */
export async function appendChatMessage(taskId, { role, content }) {
  const filePath = getChatHistoryPath(taskId);

  let history;
  try {
    history = await tryReadJsonFile(filePath, `chat-history ${taskId}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.warn(
        `Chat history file not found for task ${taskId}, creating new`,
        {
          component: "ChatHistory",
        },
      );
      await initChatHistory(taskId, {});
      history = await tryReadJsonFile(filePath, `chat-history ${taskId}`);
    } else {
      throw error;
    }
  }

  if (!history) {
    logger.error(`Failed to load chat history for task ${taskId}`, {
      component: "ChatHistory",
    });
    return;
  }

  const message = {
    id: history.messages.length + 1,
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  history.messages.push(message);
  history.lastMessageAt = message.timestamp;

  await fs.writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");

  logger.debug(`Chat message appended for task ${taskId}`, {
    component: "ChatHistory",
    role,
    messageId: message.id,
  });
}

/**
 * Delete chat history for a task
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export async function deleteChatHistory(taskId) {
  const filePath = getChatHistoryPath(taskId);

  try {
    await fs.unlink(filePath);
    logger.debug(`Chat history deleted for task ${taskId}`, {
      component: "ChatHistory",
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

// ─── Domain Section Chat History ─────────────────────────────────────────────
// Persistent per domain+section file that survives across tasks and sessions.

/**
 * Load chat history for a domain section
 * @param {string} domainId
 * @param {string} sectionType
 * @returns {Promise<Object|null>}
 */
export async function loadDomainSectionChatHistory(domainId, sectionType) {
  const filePath = getDomainSectionChatPath(domainId, sectionType);
  try {
    return await tryReadJsonFile(
      filePath,
      `chat-history ${domainId}-${sectionType}`,
    );
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Append a message to a domain section's persistent chat history
 * @param {string} domainId
 * @param {string} sectionType
 * @param {Object} message - { role, content }
 * @returns {Promise<void>}
 */
export async function appendDomainSectionChatMessage(
  domainId,
  sectionType,
  { role, content },
) {
  const filePath = getDomainSectionChatPath(domainId, sectionType);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let history;
  try {
    history = await tryReadJsonFile(
      filePath,
      `chat-history ${domainId}-${sectionType}`,
    );
  } catch {
    history = null;
  }

  if (!history) {
    history = {
      domainId,
      sectionType,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messages: [],
    };
  }

  const message = {
    id: history.messages.length + 1,
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  history.messages.push(message);
  history.lastMessageAt = message.timestamp;

  await fs.writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");

  logger.debug(`Chat message appended for ${domainId}/${sectionType}`, {
    component: "ChatHistory",
    role,
  });
}

/**
 * Delete chat history for a domain section
 * @param {string} domainId
 * @param {string} sectionType
 * @returns {Promise<void>}
 */
export async function deleteDomainSectionChatHistory(domainId, sectionType) {
  const filePath = getDomainSectionChatPath(domainId, sectionType);
  try {
    await fs.unlink(filePath);
    logger.debug(`Chat history deleted for ${domainId}/${sectionType}`, {
      component: "ChatHistory",
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
