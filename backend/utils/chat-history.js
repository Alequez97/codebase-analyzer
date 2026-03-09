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
 * Get the file path for a domain section chat history session
 * @param {string} domainId
 * @param {string} sectionType
 * @param {string} chatId - task ID that owns this session
 * @returns {string}
 */
function getDomainSectionChatPath(domainId, sectionType, chatId) {
  return path.join(
    config.paths.targetAnalysis,
    "tasks",
    "chat-history",
    `domain-${domainId}-${sectionType}-${chatId}.json`,
  );
}

/**
 * Find the most recently modified chat file for a domain section
 * (used when chatId is not yet known, e.g. first page load)
 * @param {string} domainId
 * @param {string} sectionType
 * @returns {Promise<string|null>} absolute path of the latest file, or null
 */
async function findLatestDomainSectionChatPath(domainId, sectionType) {
  const dir = path.join(config.paths.targetAnalysis, "tasks", "chat-history");
  const prefix = `domain-${domainId}-${sectionType}-`;
  try {
    const files = await fs.readdir(dir);
    const matches = files.filter(
      (f) => f.startsWith(prefix) && f.endsWith(".json"),
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return path.join(dir, matches[0]);
    const withStats = await Promise.all(
      matches.map(async (f) => {
        const filePath = path.join(dir, f);
        const stat = await fs.stat(filePath);
        return { filePath, mtime: stat.mtimeMs };
      }),
    );
    withStats.sort((a, b) => b.mtime - a.mtime);
    return withStats[0].filePath;
  } catch {
    return null;
  }
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
 * Load chat history for a domain section.
 * @param {string} domainId
 * @param {string} sectionType
 * @param {string|null} chatId - load a specific session; omit to load the most recent one
 * @returns {Promise<Object|null>}
 */
export async function loadDomainSectionChatHistory(
  domainId,
  sectionType,
  chatId = null,
) {
  let filePath;
  if (chatId) {
    filePath = getDomainSectionChatPath(domainId, sectionType, chatId);
  } else {
    filePath = await findLatestDomainSectionChatPath(domainId, sectionType);
    if (!filePath) return null;
  }
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
 * @param {Object} message - { role, content, chatId }
 * @returns {Promise<void>}
 */
export async function appendDomainSectionChatMessage(
  domainId,
  sectionType,
  { role, content, chatId },
) {
  if (!chatId) {
    logger.warn(
      `appendDomainSectionChatMessage called without chatId for ${domainId}/${sectionType} — skipping`,
      { component: "ChatHistory" },
    );
    return;
  }

  const filePath = getDomainSectionChatPath(domainId, sectionType, chatId);
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
      currentChatId: chatId,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messages: [],
    };
  }

  const message = {
    id: history.messages.length + 1,
    role,
    content,
    chatId,
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
 * List all chat sessions for a domain section (metadata only, no messages).
 * @param {string} domainId
 * @param {string} sectionType
 * @returns {Promise<Array<{ chatId, createdAt, lastMessageAt, messageCount, preview }>>}
 */
export async function listDomainSectionChatSessions(domainId, sectionType) {
  const dir = path.join(config.paths.targetAnalysis, "tasks", "chat-history");
  const prefix = `domain-${domainId}-${sectionType}-`;
  try {
    const files = await fs.readdir(dir);
    const matches = files.filter(
      (f) => f.startsWith(prefix) && f.endsWith(".json"),
    );
    const sessions = await Promise.all(
      matches.map(async (f) => {
        const filePath = path.join(dir, f);
        try {
          const data = await tryReadJsonFile(filePath, f);
          if (!data) return null;
          // chatId is encoded in the filename: domain-{domainId}-{sectionType}-{chatId}.json
          const chatId = f.slice(prefix.length, -".json".length);
          const messages = Array.isArray(data.messages) ? data.messages : [];
          // First user message as preview text
          const firstUserMsg = messages.find((m) => m.role === "user");
          return {
            chatId,
            createdAt: data.createdAt || null,
            lastMessageAt: data.lastMessageAt || null,
            messageCount: messages.length,
            preview: firstUserMsg ? firstUserMsg.content.slice(0, 80) : null,
          };
        } catch {
          return null;
        }
      }),
    );
    const valid = sessions.filter(Boolean);
    // Sort newest first
    valid.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
    return valid;
  } catch {
    return [];
  }
}

/**
 * Delete chat history for a domain section.
 * @param {string} domainId
 * @param {string} sectionType
 * @param {string|null} chatId - delete a specific session file; omit to delete ALL session files
 * @returns {Promise<void>}
 */
export async function deleteDomainSectionChatHistory(
  domainId,
  sectionType,
  chatId = null,
) {
  if (chatId) {
    const filePath = getDomainSectionChatPath(domainId, sectionType, chatId);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  } else {
    // Delete ALL session files for this domain+section ("clear all history")
    const dir = path.join(config.paths.targetAnalysis, "tasks", "chat-history");
    const prefix = `domain-${domainId}-${sectionType}-`;
    try {
      const files = await fs.readdir(dir);
      const matches = files.filter(
        (f) => f.startsWith(prefix) && f.endsWith(".json"),
      );
      await Promise.all(
        matches.map((f) => fs.unlink(path.join(dir, f)).catch(() => {})),
      );
    } catch {
      // Directory may not exist yet — nothing to delete
    }
  }

  logger.debug(`Chat history deleted for ${domainId}/${sectionType}`, {
    component: "ChatHistory",
    chatId: chatId ?? "(all)",
  });
}
