import fs from "fs/promises";
import path from "path";
import config from "../config.js";

/**
 * Read full codebase analysis from file
 * @returns {Promise<Object|null>} Codebase analysis or null if file doesn't exist
 */
export async function readCodebaseAnalysis() {
  try {
    const filePath = path.join(
      config.paths.targetAnalysis,
      "codebase-analysis.json",
    );
    const content = await fs.readFile(filePath, "utf-8");

    // Handle empty files
    if (!content || content.trim() === "") {
      console.log("Codebase analysis file is empty");
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    // Handle JSON parse errors (malformed files)
    if (error instanceof SyntaxError) {
      console.error("Invalid JSON in codebase-analysis.json:", error.message);
      return null;
    }

    throw error;
  }
}

/**
 * Write full codebase analysis to file
 * @param {Object} data - Codebase analysis data
 */
export async function writeCodebaseAnalysis(data) {
  const filePath = path.join(
    config.paths.targetAnalysis,
    "codebase-analysis.json",
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
