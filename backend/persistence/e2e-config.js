import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import * as logger from "../utils/logger.js";

const CONFIG_DIR = "config";
const E2E_CONFIG_FILE = "e2e-config.json";

function getE2EConfigPath() {
  return path.join(config.paths.targetAnalysis, CONFIG_DIR, E2E_CONFIG_FILE);
}

/**
 * Read e2e test configuration from .code-analysis/e2e-config.json
 * @returns {Promise<Object>} E2E config or empty defaults
 */
export async function readE2EConfig() {
  const filePath = getE2EConfigPath();
  try {
    const content = await fs.readFile(filePath, "utf-8");
    if (!content || content.trim() === "") return getDefaults();
    return { ...getDefaults(), ...JSON.parse(content) };
  } catch (error) {
    if (error.code === "ENOENT") return getDefaults();
    logger.error("Failed to read e2e config", {
      component: "E2EConfigPersistence",
      error: error.message,
    });
    return getDefaults();
  }
}

/**
 * Write e2e test configuration to .code-analysis/e2e-config.json
 * @param {Object} data - Config to persist
 */
export async function writeE2EConfig(data) {
  const filePath = getE2EConfigPath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  logger.info("E2E config saved", { component: "E2EConfigPersistence" });
}

function getDefaults() {
  return {
    baseUrl: "http://localhost:5173",
    auth: {
      username: "",
      password: "",
    },
  };
}
