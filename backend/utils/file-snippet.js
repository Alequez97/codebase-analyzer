import path from "path";
import fs from "fs";

const LANGUAGE_MAP = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  java: "java",
  cs: "csharp",
  go: "go",
  rs: "rust",
  cpp: "cpp",
  c: "c",
  php: "php",
  html: "html",
  css: "css",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  sh: "bash",
  sql: "sql",
};

const MAX_SNIPPET_LINES = 50;

/**
 * Returns the syntax-highlighting language identifier for a file path.
 * Falls back to the raw extension, or "text" if unknown.
 */
export function getLanguageForFile(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return LANGUAGE_MAP[ext] || ext || "text";
}

/**
 * Reads a slice of a file by 1-based line numbers.
 *
 * @param {string} resolvedPath - Absolute path to the file
 * @param {number} [from=1] - First line to include (1-based)
 * @param {number} [to] - Last line to include (1-based); defaults to from+29, capped at MAX_SNIPPET_LINES
 * @returns {{ snippet: string, language: string, from: number, to: number }}
 */
export function readFileSnippet(resolvedPath, from, to) {
  const content = fs.readFileSync(resolvedPath, "utf-8");
  const allLines = content.split("\n");

  const startLine = Number.isFinite(from) && from > 0 ? from : 1;
  const requestedEnd =
    Number.isFinite(to) && to >= startLine ? to : startLine + 29;
  const endLine = Math.min(
    requestedEnd,
    startLine + MAX_SNIPPET_LINES - 1,
    allLines.length,
  );

  const snippet = allLines.slice(startLine - 1, endLine).join("\n");
  const language = getLanguageForFile(resolvedPath);

  return { snippet, language, from: startLine, to: endLine };
}
