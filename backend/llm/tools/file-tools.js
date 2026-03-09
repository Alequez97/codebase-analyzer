import fs from "fs/promises";
import path from "path";
import { PERSISTENCE_FILES } from "../../constants/persistence-files.js";

/**
 * Constants
 */
const ANALYSIS_OUTPUT_DIR = PERSISTENCE_FILES.ANALYSIS_ROOT_DIR;

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
      "Read the complete content of a file with line numbers. Every line is prefixed with its 1-based line number (e.g. '  42: code here'). Use the line numbers when calling replace_lines. The path should be relative to the project root.",
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
    description: `Write content to a file. By default, only paths in '${ANALYSIS_OUTPUT_DIR}/' are writable. Some task instructions may explicitly allow additional exact target paths.`,
    parameters: {
      path: {
        type: "string",
        description: `Relative path to the output file (MUST start with '${ANALYSIS_OUTPUT_DIR}/', e.g., '${ANALYSIS_OUTPUT_DIR}/domains/my-domain/requirements/content.json')`,
      },
      content: {
        type: "string",
        description:
          "Content to write to the file. For JSON output, provide valid JSON string (not wrapped in markdown code blocks).",
      },
    },
    required: ["path", "content"],
  },
  {
    name: "replace_lines",
    description:
      "Replace a range of lines in an existing source file with new content. The path must be in the task's explicitly allowed write paths. Use read_file first to see the line numbers, then call this tool with the exact start and end lines to replace. This is the primary tool for modifying existing files.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the source file from project root (e.g., 'src/controllers/auth.js'). Must be an explicitly allowed path.",
      },
      start_line: {
        type: "number",
        description:
          "1-based line number of the first line to replace (inclusive).",
      },
      end_line: {
        type: "number",
        description:
          "1-based line number of the last line to replace (inclusive).",
      },
      new_content: {
        type: "string",
        description:
          "The replacement text. Replaces everything from start_line to end_line. Use an empty string to delete lines.",
      },
    },
    required: ["path", "start_line", "end_line", "new_content"],
  },
];

/**
 * Tool execution handlers
 */
export class FileToolExecutor {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.maxFileSize = 500 * 1024; // 500KB limit per file
    this.allowedWritePaths = new Set();
    this.allowAnyWrite = false;
    this.allowAnyRead = false;
  }

  /**
   * Allow the agent to write/edit any file in the project root.
   * Used for IMPLEMENT_FIX tasks where the fix may touch arbitrary source files.
   * @param {boolean} allow
   */
  setAllowAnyWrite(allow) {
    this.allowAnyWrite = allow;
  }

  /**
   * Allow the agent to read any file in the project root, including .code-analysis/ outputs.
   * Used for CUSTOM_CODEBASE_TASK where the agent needs full read access to understand the codebase.
   * @param {boolean} allow
   */
  setAllowAnyRead(allow) {
    this.allowAnyRead = allow;
  }

  /**
   * Allow writing to specific project-relative file paths.
   * @param {string[]} paths - Project-relative paths that can be written
   */
  setAllowedWritePaths(paths) {
    const normalizedPaths = (paths || [])
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.replace(/\\/g, "/"));

    this.allowedWritePaths = new Set(normalizedPaths);
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
      case "replace_lines":
        return await this.replaceLines(
          args.path,
          args.start_line,
          args.end_line,
          args.new_content,
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Replace a range of lines in a file (only allowed on explicitly allowed paths)
   * @private
   */
  async replaceLines(relativePath, startLine, endLine, newContent) {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isExplicitlyAllowedPath = this.allowedWritePaths.has(normalizedPath);

    if (!isExplicitlyAllowedPath && !this.allowAnyWrite) {
      return `Error: replace_lines can only modify explicitly allowed paths. "${relativePath}" is not in the allowed list. Ensure the task handler has granted access to this path.`;
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Access denied: path outside project root");
    }

    let currentContent;
    try {
      currentContent = await fs.readFile(fullPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return `Error: File not found: ${relativePath}. Cannot edit a file that does not exist. Use write_file to create it first.`;
      }
      return `Error reading file: ${error.message}`;
    }

    const lines = currentContent.split("\n");
    const totalLines = lines.length;

    if (startLine < 1 || startLine > totalLines) {
      return `Error: start_line ${startLine} is out of range. File has ${totalLines} lines (1-based).`;
    }
    if (endLine < startLine || endLine > totalLines) {
      return `Error: end_line ${endLine} is out of range. Must be >= start_line (${startLine}) and <= ${totalLines}.`;
    }

    const replacementLines = newContent === "" ? [] : newContent.split("\n");
    // Remove trailing empty element caused by a trailing newline in newContent
    if (
      replacementLines.length > 0 &&
      replacementLines[replacementLines.length - 1] === "" &&
      newContent.endsWith("\n")
    ) {
      replacementLines.pop();
    }

    const before = lines.slice(0, startLine - 1);
    const after = lines.slice(endLine);
    const newLines = [...before, ...replacementLines, ...after];

    try {
      await fs.writeFile(fullPath, newLines.join("\n"), "utf-8");
      const removedCount = endLine - startLine + 1;
      const addedCount = replacementLines.length;
      return `Success: Replaced lines ${startLine}-${endLine} in ${relativePath} (removed ${removedCount} lines, inserted ${addedCount} lines)`;
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  }

  /**
   * Write file content (only allowed in .code-analysis directory)
   * @private
   */
  async writeFile(relativePath, content) {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isAnalysisPath = normalizedPath.startsWith(`${ANALYSIS_OUTPUT_DIR}/`);
    const isExplicitlyAllowedPath = this.allowedWritePaths.has(normalizedPath);

    // Security: by default only allow .code-analysis writes, with optional exact-path allowlist.
    // IMPLEMENT_FIX tasks set allowAnyWrite=true so the model can create/modify any source file.
    if (!isAnalysisPath && !isExplicitlyAllowedPath && !this.allowAnyWrite) {
      return `Error: Can only write files to ${ANALYSIS_OUTPUT_DIR}/ directory for security reasons, unless the path is explicitly allowed by the task. Your path: ${relativePath}`;
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
    // LLM should only read SOURCE CODE, not its own output.
    // Exception: paths explicitly added via setAllowedWritePaths() — edit tasks
    // need to read the current content file before overwriting it.
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isExplicitlyAllowedReadPath =
      this.allowedWritePaths.has(normalizedPath);
    if (
      normalizedPath.startsWith(`${ANALYSIS_OUTPUT_DIR}/`) &&
      !isExplicitlyAllowedReadPath &&
      !this.allowAnyRead
    ) {
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
      const lines = content.split("\n");
      const width = String(lines.length).length;
      const numbered = lines
        .map((line, i) => `${String(i + 1).padStart(width, " ")}: ${line}`)
        .join("\n");
      return numbered;
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
    } catch {
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
