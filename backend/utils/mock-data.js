import fs from "fs/promises";
import path from "path";
import config from "../config.js";

const MOCK_DATA_ROOTS = [
  path.join(config.paths.analyzerRoot, ".code-analysis-example"),
  path.join(config.target.directory, ".code-analysis-example"),
];

export async function readMockJson(pathSegments) {
  let lastError = null;

  for (const rootPath of MOCK_DATA_ROOTS) {
    const filePath = path.join(rootPath, ...pathSegments);
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

export async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
