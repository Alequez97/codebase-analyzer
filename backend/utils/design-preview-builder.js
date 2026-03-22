import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import config from "../config.js";
import * as logger from "./logger.js";

const inFlightBuilds = new Map();

function designRootDir() {
  return path.join(config.target.directory, ".code-analysis", "design");
}

function designVersionDir(designId) {
  return path.join(designRootDir(), designId);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAppManifest(designId) {
  return readJsonIfExists(
    path.join(designVersionDir(designId), "app-manifest.json"),
  );
}

function isReactStaticBuildPrototype(appManifest) {
  return (
    appManifest?.prototypeType === "react-static-build" ||
    appManifest?.preview?.type === "static-dist"
  );
}

function getPreviewEntryRelativePath(appManifest) {
  return appManifest?.preview?.entryHtml || "dist/index.html";
}

function getBuildAssetsRelativePath(appManifest) {
  const outDir = appManifest?.build?.outDir || "dist";
  const assetsDir = appManifest?.build?.assetsDir || "assets";
  return path.join(outDir, assetsDir);
}

function getPreviewOutputPath(designId, appManifest) {
  return path.join(
    designVersionDir(designId),
    getPreviewEntryRelativePath(appManifest),
  );
}

function normalizePreviewUrl(designId, relativePath) {
  return `/design-preview/${designId}/${String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")}`;
}

function getPreviewUrl(designId, appManifest) {
  return normalizePreviewUrl(designId, getPreviewEntryRelativePath(appManifest));
}

function getExistingPaths(paths) {
  return paths.filter((item) => fs.existsSync(item));
}

function getLatestMtimeMs(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isDirectory()) {
    return stat.mtimeMs;
  }

  let latest = stat.mtimeMs;

  for (const entry of fs.readdirSync(filePath, { withFileTypes: true })) {
    latest = Math.max(
      latest,
      getLatestMtimeMs(path.join(filePath, entry.name)),
    );
  }

  return latest;
}

function needsPreviewBuild(designId, appManifest) {
  const versionDir = designVersionDir(designId);
  const outputPath = getPreviewOutputPath(designId, appManifest);
  const nodeModulesDir = path.join(versionDir, "node_modules");
  const assetsPath = path.join(
    versionDir,
    getBuildAssetsRelativePath(appManifest),
  );

  if (!fs.existsSync(outputPath)) {
    return true;
  }

  if (!fs.existsSync(nodeModulesDir)) {
    return true;
  }

  if (!fs.existsSync(assetsPath)) {
    return true;
  }

  const inputPaths = getExistingPaths([
    path.join(versionDir, "src"),
    path.join(versionDir, "public"),
    path.join(versionDir, "package.json"),
    path.join(versionDir, "package-lock.json"),
    path.join(versionDir, "vite.config.js"),
    path.join(versionDir, "app-manifest.json"),
    path.join(versionDir, "design-system.json"),
    path.join(versionDir, "brief.md"),
  ]);

  if (inputPaths.length === 0) {
    return false;
  }

  const latestInputTime = Math.max(...inputPaths.map(getLatestMtimeMs));
  const outputTime = fs.statSync(outputPath).mtimeMs;
  return latestInputTime > outputTime;
}

function quoteWindowsArg(value) {
  const stringValue = String(value);
  if (!/[ \t"]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '\\"')}"`;
}

function spawnCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const commandArgs = Array.isArray(args) ? args : [];
    const useWindowsShell = process.platform === "win32";
    const spawnCommandName = useWindowsShell
      ? process.env.ComSpec || "cmd.exe"
      : command;
    const spawnArgs = useWindowsShell
      ? [
          "/d",
          "/s",
          "/c",
          [command, ...commandArgs].map(quoteWindowsArg).join(" "),
        ]
      : commandArgs;

    const child = spawn(spawnCommandName, spawnArgs, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        CI: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() || stdout.trim() || `Command failed with exit code ${code}`,
        ),
      );
    });
  });
}

async function installDependencies(versionDir) {
  const nodeModulesDir = path.join(versionDir, "node_modules");
  if (fs.existsSync(nodeModulesDir)) {
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  logger.info("Installing design preview dependencies", {
    component: "DesignPreviewBuilder",
    designDir: versionDir,
  });

  await spawnCommand(
    npmCommand,
    ["install", "--no-fund", "--no-audit"],
    versionDir,
  );
}

async function runBuild(versionDir) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const packageJson = readJsonIfExists(path.join(versionDir, "package.json"));
  const usesViteBuild =
    typeof packageJson?.scripts?.build === "string" &&
    packageJson.scripts.build.includes("vite build");
  const buildArgs = usesViteBuild
    ? ["run", "build", "--", "--base=./"]
    : ["run", "build"];

  logger.info("Building design preview", {
    component: "DesignPreviewBuilder",
    designDir: versionDir,
  });

  await spawnCommand(npmCommand, buildArgs, versionDir);
}

async function buildReactStaticPreview(designId, appManifest, force = false) {
  const versionDir = designVersionDir(designId);
  const packageJsonPath = path.join(versionDir, "package.json");

  if (!fs.existsSync(versionDir)) {
    throw new Error(`Design version "${designId}" does not exist`);
  }

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Design version "${designId}" is missing package.json`);
  }

  if (!force && !needsPreviewBuild(designId, appManifest)) {
    return {
      designId,
      built: false,
      skipped: true,
      previewUrl: getPreviewUrl(designId, appManifest),
    };
  }

  await installDependencies(versionDir);
  await runBuild(versionDir);

  return {
    designId,
    built: true,
    skipped: false,
    previewUrl: getPreviewUrl(designId, appManifest),
  };
}

export async function ensureDesignPreviewReady(designId, { force = false } = {}) {
  const appManifest = getAppManifest(designId);

  if (!appManifest) {
    throw new Error(`Design version "${designId}" is missing app-manifest.json`);
  }

  if (!isReactStaticBuildPrototype(appManifest)) {
    return {
      designId,
      built: false,
      skipped: true,
      previewUrl: getPreviewUrl(designId, appManifest),
    };
  }

  if (inFlightBuilds.has(designId)) {
    return inFlightBuilds.get(designId);
  }

  const buildPromise = buildReactStaticPreview(designId, appManifest, force)
    .catch((error) => {
      logger.error("Failed to prepare design preview", {
        component: "DesignPreviewBuilder",
        designId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    })
    .finally(() => {
      inFlightBuilds.delete(designId);
    });

  inFlightBuilds.set(designId, buildPromise);
  return buildPromise;
}
