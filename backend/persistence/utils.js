import fs from "fs/promises";
import * as logger from "../utils/logger.js";

/**
 * Safely read and parse a JSON file
 * Handles empty files and JSON parse errors
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} [identifier] - Optional identifier for logging (e.g., task ID, domain ID)
 * @returns {Promise<Object|null>} Parsed JSON object or null if file is empty/invalid
 * @throws {Error} Re-throws errors other than ENOENT and SyntaxError
 */
export async function tryReadJsonFile(filePath, identifier = "file") {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Handle empty files
    if (!content || content.trim() === "") {
      logger.debug(`File ${identifier} is empty (path: ${filePath})`, {
        component: "Persistence",
      });
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    // Handle JSON parse errors (malformed files)
    if (error instanceof SyntaxError) {
      logger.error(`Invalid JSON in ${identifier} (path: ${filePath})`, {
        error: error.message,
        component: "Persistence",
      });
      return null;
    }

    // Re-throw other errors (like ENOENT) for caller to handle
    throw error;
  }
}
