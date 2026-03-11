import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import config from "../config.js";
import { getProjectFiles } from "../utils/file-scanner.js";
import * as logger from "../utils/logger.js";
import { readFileSnippet } from "../utils/file-snippet.js";

const router = express.Router();
const execAsync = promisify(exec);

/**
 * Get all project files for autocomplete
 */
router.get("/files", async (req, res) => {
  try {
    const files = await getProjectFiles(config.target.directory);

    res.json({
      files,
      count: files.length,
      projectPath: config.target.directory,
    });
  } catch (error) {
    logger.error("Error scanning project files", {
      error,
      component: "API",
    });
    res.status(500).json({ error: "Failed to scan project files" });
  }
});

/**
 * Open a file in VS Code
 */
router.post("/open-in-editor", async (req, res) => {
  try {
    const payload = req.body || {};
    const rawPath = payload.path;

    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "path is required",
      });
    }

    const targetRoot = path.resolve(config.paths.targetRoot);
    const resolvedPath = path.isAbsolute(rawPath)
      ? path.normalize(rawPath)
      : path.resolve(targetRoot, rawPath);

    if (
      resolvedPath !== targetRoot &&
      !resolvedPath.startsWith(`${targetRoot}${path.sep}`)
    ) {
      return res.status(400).json({
        error: "Invalid request",
        message: "path must be within target project",
      });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: "File not found",
        message: `File does not exist: ${rawPath}`,
      });
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return res.status(400).json({
        error: "Invalid request",
        message: "path must point to a file",
      });
    }

    const line = Number.isFinite(Number(payload.line))
      ? Number(payload.line)
      : null;
    const column = Number.isFinite(Number(payload.column))
      ? Number(payload.column)
      : null;

    let gotoTarget = resolvedPath;
    if (line && line > 0) {
      gotoTarget = `${resolvedPath}:${line}`;
      if (column && column > 0) {
        gotoTarget = `${gotoTarget}:${column}`;
      }
    }

    await execAsync(`code -g "${gotoTarget}"`);

    res.json({ success: true, message: "File opened in VS Code" });
  } catch (error) {
    logger.warn("Failed to open file in VS Code", {
      error,
      component: "API",
    });
    res.status(500).json({
      error: "Failed to open in VS Code",
      message:
        "Make sure VS Code is installed and accessible via the 'code' command",
    });
  }
});

/**
 * Get the list of local git branches in the target project
 * GET /project/branches
 */
router.get("/branches", async (req, res) => {
  try {
    const [listResult, currentResult] = await Promise.allSettled([
      execAsync("git branch --format=%(refname:short)", {
        cwd: config.target.directory,
      }),
      execAsync("git rev-parse --abbrev-ref HEAD", {
        cwd: config.target.directory,
      }),
    ]);

    const branches =
      listResult.status === "fulfilled"
        ? listResult.value.stdout
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean)
        : [];

    const currentBranch =
      currentResult.status === "fulfilled"
        ? currentResult.value.stdout.trim()
        : null;

    res.json({ branches, currentBranch });
  } catch (error) {
    logger.warn("Failed to list git branches", { error, component: "API" });
    res.json({ branches: [], currentBranch: null });
  }
});

/**
 * Get a code snippet from a project file by line range
 * GET /project/file-snippet?path=...&from=...&to=...
 */
router.get("/file-snippet", async (req, res) => {
  try {
    const rawPath = req.query.path;

    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "path is required" });
    }

    const targetRoot = path.resolve(config.paths.targetRoot);
    const resolvedPath = path.isAbsolute(rawPath)
      ? path.normalize(rawPath)
      : path.resolve(targetRoot, rawPath);

    if (
      resolvedPath !== targetRoot &&
      !resolvedPath.startsWith(`${targetRoot}${path.sep}`)
    ) {
      return res
        .status(400)
        .json({ error: "path must be within target project" });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: "path must point to a file" });
    }

    const rawFrom = parseInt(req.query.from, 10);
    const rawTo = parseInt(req.query.to, 10);

    const { snippet, language, from, to } = readFileSnippet(
      resolvedPath,
      rawFrom,
      rawTo,
    );

    res.json({ snippet, language, file: rawPath, from, to });
  } catch (error) {
    logger.error("Error reading file snippet", { error, component: "API" });
    res.status(500).json({ error: "Failed to read file" });
  }
});

export default router;
