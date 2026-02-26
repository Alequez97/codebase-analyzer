import fs from "fs/promises";
import path from "path";

/**
 * Constants
 */
const ANALYSIS_OUTPUT_DIR = ".code-analysis";

/**
 * File system tools that LLM can use during codebase analysis
 */

/**
 * Tool definitions for LLM
 */
export const FILE_TOOLS = [
  {
    name: "read_file",
    description:
      "Read the complete content of a file. Use this when you need to analyze specific code files. The path should be relative to the project root.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the file from project root (e.g., 'src/app.js')",
      },
    },
    required: ["path"],
  },
  {
    name: "list_directory",
    description:
      "List all files and subdirectories in a given directory. Use this to explore the project structure. Returns file names with indicators for directories (ends with /).",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to directory from project root (e.g., 'src' or 'src/components'). Use '.' for project root.",
      },
      recursive: {
        type: "boolean",
        description:
          "If true, list files recursively in subdirectories. Default is false.",
      },
    },
    required: ["path"],
  },
  {
    name: "search_files",
    description:
      "Search for files matching a pattern (glob-like). Use this to find specific types of files or files with certain names across the project.",
    parameters: {
      pattern: {
        type: "string",
        description:
          "Search pattern (e.g., '*.js' for all JS files, 'test/**/*.spec.js' for test files)",
      },
      directory: {
        type: "string",
        description:
          "Starting directory for search, relative to project root. Default is '.' (project root).",
      },
    },
    required: ["pattern"],
  },
  {
    name: "write_file",
    description:
      "Write content to a file in the .code-analysis directory. REQUIRED to save your analysis output. The path must be relative to the project root and MUST start with '.code-analysis/'.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the output file (MUST start with '.code-analysis/', e.g., '.code-analysis/domains/my-domain/requirements.json')",
      },
      content: {
        type: "string",
        description:
          "Content to write to the file. For JSON output, provide valid JSON string (not wrapped in markdown code blocks).",
      },
    },
    required: ["path", "content"],
  },
];

/**
 * Tool execution handlers
 */
export class FileToolExecutor {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.maxFileSize = 500 * 1024; // 500KB limit per file
  }

  /**
   * Execute a tool call
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} args - Tool arguments
   * @returns {Promise<string>} Result of tool execution
   */
  async executeTool(toolName, args) {
    switch (toolName) {
      case "read_file":
        return await this.readFile(args.path);
      case "list_directory":
        return await this.listDirectory(args.path, args.recursive);
      case "search_files":
        return await this.searchFiles(args.pattern, args.directory);
      case "write_file":
        return await this.writeFile(args.path, args.content);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Write file content (only allowed in .code-analysis directory)
   * @private
   */
  async writeFile(relativePath, content) {
    const normalizedPath = relativePath.replace(/\\/g, "/");

    // Security: ONLY allow writing to .code-analysis directory
    if (!normalizedPath.startsWith(`${ANALYSIS_OUTPUT_DIR}/`)) {
      return `Error: Can only write files to ${ANALYSIS_OUTPUT_DIR}/ directory for security reasons. Your path: ${relativePath}`;
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    // Security: ensure path is within project root
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Access denied: path outside project root");
    }

    try {
      // Create directory if it doesn't exist
      const dirPath = path.dirname(fullPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, "utf-8");

      return `Success: File written to ${relativePath} (${content.length} bytes)`;
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  }

  /**
   * Read file content
   * @private
   */
  async readFile(relativePath) {
    const fullPath = path.join(this.projectRoot, relativePath);

    // Security: ensure path is within project root
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Access denied: path outside project root");
    }

    // Prevent reading output files in .code-analysis directory
    // LLM should only read SOURCE CODE, not its own output
    const normalizedPath = relativePath.replace(/\\/g, "/");
    if (normalizedPath.startsWith(`${ANALYSIS_OUTPUT_DIR}/`)) {
      return `Error: Cannot read files in ${ANALYSIS_OUTPUT_DIR} directory. This directory contains analysis outputs, not source code. Only read source code files from your codebase.`;
    }

    try {
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        return `Error: ${relativePath} is not a file`;
      }

      if (stats.size > this.maxFileSize) {
        return `Error: File too large (${Math.round(stats.size / 1024)}KB). Maximum size is ${this.maxFileSize / 1024}KB`;
      }

      const content = await fs.readFile(fullPath, "utf-8");
      return content;
    } catch (error) {
      if (error.code === "ENOENT") {
        return `Error: File not found: ${relativePath}`;
      }
      throw error;
    }
  }

  /**
   * List directory contents
   * @private
   */
  async listDirectory(relativePath, recursive = false) {
    const fullPath = path.join(this.projectRoot, relativePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Access denied: path outside project root");
    }

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return `Error: ${relativePath} is not a directory`;
      }

      if (recursive) {
        return await this._listRecursive(fullPath, relativePath);
      } else {
        return await this._listFlat(fullPath, relativePath);
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        return `Error: Directory not found: ${relativePath}`;
      }
      throw error;
    }
  }

  /**
   * List directory (non-recursive)
   * @private
   */
  async _listFlat(fullPath, relativePath) {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const items = entries.map((entry) => {
      return entry.isDirectory() ? `${entry.name}/` : entry.name;
    });

    return `Contents of ${relativePath}:\n${items.join("\n")}`;
  }

  /**
   * List directory recursively
   * @private
   */
  async _listRecursive(fullPath, relativePath, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
      return "";
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      // Skip common ignored directories
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)
      ) {
        continue;
      }

      const indent = "  ".repeat(depth);
      const marker = entry.isDirectory() ? "📁" : "📄";
      items.push(`${indent}${marker} ${entry.name}`);

      if (entry.isDirectory()) {
        const subPath = path.join(fullPath, entry.name);
        const subRelative = path.join(relativePath, entry.name);
        const subItems = await this._listRecursive(
          subPath,
          subRelative,
          depth + 1,
          maxDepth,
        );
        if (subItems) items.push(subItems);
      }
    }

    return items.join("\n");
  }

  /**
   * Search for files matching pattern
   * @private
   */
  async searchFiles(pattern, directory = ".") {
    const startPath = path.join(this.projectRoot, directory);

    // Security check
    const resolvedPath = path.resolve(startPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Access denied: path outside project root");
    }

    const matches = [];
    await this._searchRecursive(startPath, pattern, matches, directory);

    if (matches.length === 0) {
      return `No files found matching pattern: ${pattern}`;
    }

    return `Files matching "${pattern}":\n${matches.join("\n")}`;
  }

  /**
   * Recursive file search helper
   * @private
   */
  async _searchRecursive(currentPath, pattern, matches, basePath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip ignored directories
        if (
          entry.isDirectory() &&
          ["node_modules", ".git", "dist", "build"].includes(entry.name)
        ) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(
          path.join(this.projectRoot, basePath),
          fullPath,
        );

        if (entry.isDirectory()) {
          await this._searchRecursive(fullPath, pattern, matches, basePath);
        } else if (this._matchPattern(entry.name, pattern)) {
          matches.push(relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   * @private
   */
  _matchPattern(filename, pattern) {
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }
}
