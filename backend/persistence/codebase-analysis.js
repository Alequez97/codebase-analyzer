import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { tryReadJsonFile } from "./utils.js";

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
    return await tryReadJsonFile(filePath, "codebase-analysis.json");
  } catch (error) {
    if (error.code === "ENOENT") {
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
