import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import { tryReadJsonFile } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data", "market-research");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(sessionId) {
  // Prevent path traversal — sessionId must be a UUID
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    throw new Error("Invalid sessionId format");
  }
  return path.join(DATA_DIR, `${sessionId}.json`);
}

/**
 * Create a new analysis session.
 * @param {string} idea - The startup idea text
 * @returns {Promise<Object>} Created session
 */
/**
 * Upsert an analysis session — creates or overwrites.
 * Called once when the user logs in and submits their local session data.
 * @param {string} sessionId - UUID from the frontend (sessionStorage)
 * @param {string} idea - The startup idea text
 * @param {Object} state - Full analysis state (competitors, events, etc.)
 * @returns {Promise<Object>} Saved session
 */
export async function upsertSession(sessionId, idea, state) {
  await ensureDataDir();

  const filePath = sessionPath(sessionId);
  const now = Date.now();

  // Preserve original createdAt if the session already exists
  let createdAt = now;
  try {
    const existing = await tryReadJsonFile(filePath, sessionId);
    if (existing?.createdAt) createdAt = existing.createdAt;
  } catch {
    // ENOENT — new session
  }

  const session = { sessionId, idea, createdAt, lastAccessedAt: now, state };

  await fs.writeFile(filePath, JSON.stringify(session, null, 2));

  logger.info("Market research session saved", {
    sessionId,
    component: "MarketResearchPersistence",
  });

  return session;
}

/**
 * Load a session by ID and update its lastAccessedAt.
 * @param {string} sessionId
 * @returns {Promise<Object|null>} Session or null if not found
 */
export async function getSession(sessionId) {
  const filePath = sessionPath(sessionId);

  let session;
  try {
    session = await tryReadJsonFile(filePath, sessionId);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  if (!session) return null;

  // Touch lastAccessedAt
  session.lastAccessedAt = Date.now();
  await fs.writeFile(filePath, JSON.stringify(session, null, 2));

  return session;
}

/**
 * Delete a session.
 * @param {string} sessionId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteSession(sessionId) {
  const filePath = sessionPath(sessionId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Mark a session as complete with competitor count.
 * No-op if the session file doesn't exist yet.
 * @param {string} sessionId
 * @param {number} competitorCount
 */
export async function markSessionComplete(sessionId, competitorCount) {
  const filePath = sessionPath(sessionId);

  let session;
  try {
    session = await tryReadJsonFile(filePath, sessionId);
  } catch {
    return;
  }

  if (!session) return;

  const now = Date.now();
  const updated = {
    ...session,
    lastAccessedAt: now,
    state: {
      ...(session.state || {}),
      status: "complete",
      competitorCount,
      completedAt: now,
    },
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

  logger.info("Market research session marked complete", {
    sessionId,
    competitorCount,
    component: "MarketResearchPersistence",
  });
}

/**
 * List all sessions with their metadata.
 * @returns {Promise<Object[]>}
 */
export async function listSessions() {
  await ensureDataDir();

  let entries;
  try {
    entries = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }

  const sessions = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(DATA_DIR, entry);
    try {
      const session = await tryReadJsonFile(filePath, entry);
      if (session) sessions.push(session);
    } catch {
      // Skip unreadable files
    }
  }

  return sessions;
}

/**
 * Read the AI-generated competitor profile for a session.
 * Written by the LLM agent to
 * .code-analysis/market-research/{sessionId}/competitors/{competitorId}.json
 * @param {string} sessionId
 * @param {string} competitorId
 * @returns {Promise<Object|null>} Competitor profile or null if not found
 */
export async function getCompetitorProfile(sessionId, competitorId) {
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    throw new Error("Invalid sessionId format");
  }
  if (!/^[a-z0-9-]+$/.test(competitorId)) {
    throw new Error("Invalid competitorId format");
  }

  const profilePath = path.join(
    config.paths.targetAnalysis,
    "market-research",
    sessionId,
    "competitors",
    `${competitorId}.json`,
  );

  try {
    const profile = await tryReadJsonFile(profilePath, competitorId);
    return profile;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Read the AI-generated market research report for a session.
 * The report file is written by the LLM agent to
 * .code-analysis/market-research/{sessionId}/report.json
 * inside the target project directory.
 * @param {string} sessionId
 * @returns {Promise<Object|null>} Report object or null if not found
 */
export async function getMarketResearchReport(sessionId) {
  // Validate sessionId to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    throw new Error("Invalid sessionId format");
  }

  const reportPath = path.join(
    config.paths.targetAnalysis,
    "market-research",
    sessionId,
    "report.json",
  );

  try {
    const report = await tryReadJsonFile(reportPath, sessionId);
    return report;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
