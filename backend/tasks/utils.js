import { randomBytes } from "crypto";

/**
 * Generate a unique task ID
 * @param {string} prefix - Prefix for the task ID
 * @returns {string} Unique task ID
 */
export function generateTaskId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const random = randomBytes(3).toString("hex");
  return `${prefix}-${timestamp}-${random}`;
}
