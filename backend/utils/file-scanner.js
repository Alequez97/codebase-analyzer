import fs from "fs/promises";
import path from "path";

/**
 * Recursively scan directory for all files
 * @param {string} dirPath - Directory to scan
 * @param {string} relativeTo - Base path for relative paths
 * @param {string[]} ignored - Directories to ignore
 * @returns {Promise<string[]>} - Array of relative file paths
 */
async function scanFiles(
  dirPath,
  relativeTo = dirPath,
  ignored = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".code-analysis",
    ".vscode",
    ".idea",
  ],
) {
  const files = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (ignored.includes(entry.name)) {
          continue;
        }

        // Recursively scan subdirectory
        const subFiles = await scanFiles(fullPath, relativeTo, ignored);
        files.push(...subFiles);
      } else {
        // Add file with relative path
        const relativePath = path
          .relative(relativeTo, fullPath)
          .replace(/\\/g, "/");
        files.push(relativePath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    if (error.code !== "EACCES" && error.code !== "EPERM") {
      throw error;
    }
  }

  return files;
}

/**
 * Get all project files from target directory
 * @param {string} targetDir - Target project directory
 * @returns {Promise<string[]>} - Sorted array of relative file paths
 */
export async function getProjectFiles(targetDir) {
  const files = await scanFiles(targetDir);

  // Sort alphabetically for better UX
  return files.sort((a, b) => a.localeCompare(b));
}
