import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { FileToolExecutor } from "../../llm/tools/file-tools.js";
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_TYPES,
} from "../../constants/tool-error-codes.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * File Tools Test Suite
 *
 * Focus: Security and file editing correctness
 * Priority: Path traversal protection, permission system, line editing accuracy
 */

describe("FileToolExecutor - Security Tests", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    // Create a temporary test directory
    tempDir = path.join(os.tmpdir(), `file-tools-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a basic project structure
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.mkdir(path.join(tempDir, ".code-analysis"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "app.js"),
      "console.log('Hello World');\n",
    );

    executor = new FileToolExecutor(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Path Traversal Protection", () => {
    test("rejects path traversal in read_file", async () => {
      // Arrange
      const maliciousPath = "../../../etc/passwd";

      // Act
      const result = await executor.readFile(maliciousPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.ACCESS_DENIED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });

    test("rejects path traversal in write_file", async () => {
      // Arrange
      const maliciousPath = "../../../tmp/malicious.txt";
      const content = "bad content";

      // Act
      const result = await executor.writeFile(maliciousPath, content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.ACCESS_DENIED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });

    test("rejects path traversal in replace_lines", async () => {
      // Arrange
      const maliciousPath = "../../../tmp/file.js";

      // Act
      const result = await executor.replaceLines(
        maliciousPath,
        1,
        1,
        "malicious",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.ACCESS_DENIED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });

    test("rejects absolute path outside project root", async () => {
      // Arrange
      const absolutePath = "/etc/passwd";

      // Act
      const result = await executor.readFile(absolutePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.ACCESS_DENIED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });
  });

  describe(".code-analysis Directory Protection", () => {
    test("rejects reading .code-analysis files by default", async () => {
      // Arrange
      const analysisFile = ".code-analysis/test.json";
      await fs.writeFile(path.join(tempDir, analysisFile), "{}");

      // Act
      const result = await executor.readFile(analysisFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.READ_PROTECTED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });

    test("allows reading .code-analysis when path is explicitly allowed", async () => {
      // Arrange
      const analysisFile = ".code-analysis/test.json";
      await fs.writeFile(path.join(tempDir, analysisFile), '{"test": true}');
      executor.setAllowedWritePaths([analysisFile]);

      // Act
      const result = await executor.readFile(analysisFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.content).toContain("test");
      expect(result.data.lines).toBe(1);
    });

    test("allows reading .code-analysis when allowAnyRead is true", async () => {
      // Arrange
      const analysisFile = ".code-analysis/test.json";
      await fs.writeFile(path.join(tempDir, analysisFile), '{"test": true}');
      executor.setAllowAnyRead(true);

      // Act
      const result = await executor.readFile(analysisFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.content).toContain("test");
      expect(result.data.lines).toBe(1);
    });
  });

  describe("Write Permission System", () => {
    test("allows writing to .code-analysis directory by default", async () => {
      // Arrange
      const outputPath = ".code-analysis/output.json";
      const content = '{"success": true}';

      // Act
      const result = await executor.writeFile(outputPath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.path).toBe(outputPath);
      expect(result.data.bytesWritten).toBe(content.length);
      const writtenContent = await fs.readFile(
        path.join(tempDir, outputPath),
        "utf-8",
      );
      expect(writtenContent).toBe(content);
    });

    test("rejects writing outside .code-analysis without permission", async () => {
      // Arrange
      const sourcePath = "src/new-file.js";
      const content = "content";

      // Act
      const result = await executor.writeFile(sourcePath, content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.PERMISSION_DENIED);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.SECURITY);
    });

    test("allows writing to explicitly allowed path", async () => {
      // Arrange
      const allowedPath = "src/allowed.js";
      const content = "console.log('allowed');";
      executor.setAllowedWritePaths([allowedPath]);

      // Act
      const result = await executor.writeFile(allowedPath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.path).toBe(allowedPath);
    });

    test("allows writing anywhere when allowAnyWrite is true", async () => {
      // Arrange
      const anyPath = "src/anywhere.js";
      const content = "console.log('anywhere');";
      executor.setAllowAnyWrite(true);

      // Act
      const result = await executor.writeFile(anyPath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.path).toBe(anyPath);
    });
  });
});

describe("FileToolExecutor - File Editing Tests", () => {
  let executor;
  let tempDir;
  let testFilePath;

  beforeEach(async () => {
    // Create a temporary test directory
    tempDir = path.join(os.tmpdir(), `file-tools-edit-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a test file with multiple lines
    testFilePath = "src/test.js";
    const testContent = [
      "// Test file",
      "function hello() {",
      "  console.log('Hello');",
      "}",
      "",
      "function world() {",
      "  console.log('World');",
      "}",
      "",
    ].join("\n");

    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tempDir, testFilePath), testContent);

    executor = new FileToolExecutor(tempDir);
    executor.setAllowedWritePaths([testFilePath]);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("replace_lines", () => {
    test("replaces single line correctly", async () => {
      // Arrange
      const startLine = 3;
      const endLine = 3;
      const newContent = "  console.log('Hi there');";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[2]).toBe(newContent);
    });

    test("replaces multiple lines correctly", async () => {
      // Arrange
      const startLine = 2;
      const endLine = 4;
      const newContent = "function greet(name) {\n  return `Hello ${name}`;\n}";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[1]).toBe("function greet(name) {");
      expect(lines[2]).toBe("  return `Hello ${name}`;");
      expect(lines[3]).toBe("}");
    });

    test("deletes lines when new_content is empty", async () => {
      // Arrange
      const startLine = 5;
      const endLine = 8;
      const newContent = "";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines.length).toBeLessThan(9);
      expect(lines[4]).toBe(""); // Empty line at end
    });

    test("replaces first line correctly", async () => {
      // Arrange
      const startLine = 1;
      const endLine = 1;
      const newContent = "// Modified test file";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[0]).toBe(newContent);
    });

    test("replaces last line correctly", async () => {
      // Arrange
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const totalLines = fileContent.split("\n").length;
      const lastLineNum = totalLines;
      const newContent = "// End of file";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        lastLineNum,
        lastLineNum,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const updatedContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = updatedContent.split("\n");
      expect(lines[lines.length - 1]).toBe(newContent);
    });

    test("rejects invalid line range (start > end)", async () => {
      // Arrange
      const startLine = 5;
      const endLine = 2;
      const newContent = "invalid";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_LINE_RANGE);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.VALIDATION);
    });

    test("rejects line number less than 1", async () => {
      // Arrange
      const startLine = 0;
      const endLine = 2;
      const newContent = "invalid";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_LINE_RANGE);
    });

    test("rejects line number beyond file length", async () => {
      // Arrange
      const startLine = 1;
      const endLine = 1000;
      const newContent = "beyond";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_LINE_RANGE);
    });

    test("rejects editing file not in allowed paths", async () => {
      // Arrange
      const unauthorizedPath = "src/unauthorized.js";
      await fs.writeFile(
        path.join(tempDir, unauthorizedPath),
        "console.log('test');",
      );

      // Act
      const result = await executor.replaceLines(
        unauthorizedPath,
        1,
        1,
        "modified",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.PERMISSION_DENIED);
    });
  });

  describe("insert_lines", () => {
    test("inserts at file start", async () => {
      // Arrange
      const content = "// New header\n";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "start",
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[0]).toBe("// New header");
      expect(lines[1]).toBe("// Test file");
    });

    test("inserts at file end", async () => {
      // Arrange
      const content = "\n// Footer comment";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "end",
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      expect(fileContent).toContain("// Footer comment");
    });

    test("inserts before specified line", async () => {
      // Arrange
      const lineNum = 2;
      const content = "// Comment before function\n";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "before",
        lineNum,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[1]).toBe("// Comment before function");
      expect(lines[2]).toBe("function hello() {");
    });

    test("inserts after specified line", async () => {
      // Arrange
      const lineNum = 1;
      const content = "// Added after first line\n";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "after",
        lineNum,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[0]).toBe("// Test file");
      expect(lines[1]).toBe("// Added after first line");
      expect(lines[2]).toBe("function hello() {");
    });

    test("rejects invalid position", async () => {
      // Arrange
      const position = "invalid";
      const content = "test";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        position,
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_POSITION);
    });

    test("rejects insert without line_number for before/after", async () => {
      // Arrange
      const content = "test";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "before",
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(false);
      // Implementation checks line number validity, so INVALID_LINE_RANGE is correct
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_LINE_RANGE);
    });

    test("rejects insert at invalid line number", async () => {
      // Arrange
      const content = "test";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "before",
        1000,
        content,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.INVALID_LINE_RANGE);
    });

    test("rejects insert on file not in allowed paths", async () => {
      // Arrange
      const unauthorizedPath = "src/unauthorized.js";
      await fs.writeFile(
        path.join(tempDir, unauthorizedPath),
        "console.log('test');",
      );

      // Act
      const result = await executor.insertLines(
        unauthorizedPath,
        "start",
        null,
        "// header",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.PERMISSION_DENIED);
    });

    test("handles multi-line content insertion correctly", async () => {
      // Arrange
      const content = "// Line 1\n// Line 2\n// Line 3";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "start",
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[0]).toBe("// Line 1");
      expect(lines[1]).toBe("// Line 2");
      expect(lines[2]).toBe("// Line 3");
      expect(lines[3]).toBe("// Test file");
    });

    test("handles trailing newline in content correctly", async () => {
      // Arrange
      const contentWithNewline = "// Header line\n";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "start",
        null,
        contentWithNewline,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      // Trailing newline should be stripped, so only one line added
      expect(lines[0]).toBe("// Header line");
      expect(lines[1]).toBe("// Test file");
    });

    test("handles empty content insertion", async () => {
      // Arrange
      const emptyContent = "";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "start",
        null,
        emptyContent,
      );

      // Assert
      expect(result.success).toBe(true);
      // Empty content should insert one empty line
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[0]).toBe("");
      expect(lines[1]).toBe("// Test file");
    });

    test("insert after last line behaves like end", async () => {
      // Arrange
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const totalLines = fileContent.split("\n").length;
      const content = "// Added at end";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "after",
        totalLines,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      const updatedContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      expect(updatedContent).toContain("// Added at end");
      const lines = updatedContent.split("\n");
      expect(lines[lines.length - 1]).toBe("// Added at end");
    });
  });

  describe("replace_lines - Content Handling & Error Cases", () => {
    test("returns file not found when file doesn't exist", async () => {
      // Arrange
      const nonexistentPath = "src/missing.js";
      executor.setAllowedWritePaths([nonexistentPath]);

      // Act
      const result = await executor.replaceLines(
        nonexistentPath,
        1,
        1,
        "content",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_NOT_FOUND);
    });

    test("handles multi-line replacement content correctly", async () => {
      // Arrange
      const startLine = 2;
      const endLine = 4;
      const multiLineContent =
        "// New line 1\n// New line 2\n// New line 3\n// New line 4";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        multiLineContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      expect(lines[1]).toBe("// New line 1");
      expect(lines[2]).toBe("// New line 2");
      expect(lines[3]).toBe("// New line 3");
      expect(lines[4]).toBe("// New line 4");
    });

    test("handles trailing newline in replacement content", async () => {
      // Arrange
      const startLine = 1;
      const endLine = 1;
      const contentWithNewline = "// New first line\n";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        contentWithNewline,
      );

      // Assert
      expect(result.success).toBe(true);
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      // Trailing newline should be stripped
      expect(lines[0]).toBe("// New first line");
      expect(lines[1]).toBe("function hello() {");
    });

    test("replaces entire file content", async () => {
      // Arrange
      const fileContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const totalLines = fileContent.split("\n").length;
      const newContent = "// Completely new file\nconst x = 1;";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        1,
        totalLines,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      const updatedContent = await fs.readFile(
        path.join(tempDir, testFilePath),
        "utf-8",
      );
      const lines = updatedContent.split("\n");
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe("// Completely new file");
      expect(lines[1]).toBe("const x = 1;");
    });

    test("verify metadata in successful replacement", async () => {
      // Arrange
      const startLine = 2;
      const endLine = 4;
      const newContent = "single line";

      // Act
      const result = await executor.replaceLines(
        testFilePath,
        startLine,
        endLine,
        newContent,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.linesRemoved).toBe(3); // lines 2-4
      expect(result.data.linesInserted).toBe(1); // single line
      expect(result.data.startLine).toBe(startLine);
      expect(result.data.endLine).toBe(endLine);
    });
  });

  describe("insert_lines - Error Handling & Metadata Validation", () => {
    test("returns file not found when file doesn't exist", async () => {
      // Arrange
      const nonexistentPath = "src/missing.js";
      executor.setAllowedWritePaths([nonexistentPath]);

      // Act
      const result = await executor.insertLines(
        nonexistentPath,
        "start",
        null,
        "content",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_NOT_FOUND);
    });

    test("verify metadata in successful insertion", async () => {
      // Arrange
      const content = "line1\nline2\nline3";

      // Act
      const result = await executor.insertLines(
        testFilePath,
        "start",
        null,
        content,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.linesInserted).toBe(3);
      expect(result.data.totalLines).toBeGreaterThan(9); // original 9 + 3 new
    });
  });
});

describe("FileToolExecutor - Read, Search & Rename Tests", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `file-tools-ops-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create test structure
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "src", "components"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, "tests"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "src", "app.js"), "// app.js");
    await fs.writeFile(path.join(tempDir, "src", "index.js"), "// index.js");
    await fs.writeFile(
      path.join(tempDir, "src", "components", "Button.jsx"),
      "// Button",
    );
    await fs.writeFile(path.join(tempDir, "tests", "app.test.js"), "// test");

    executor = new FileToolExecutor(tempDir);
    executor.setAllowAnyRead(true);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("read_file", () => {
    test("reads file with line numbers", async () => {
      // Arrange
      const filePath = "src/app.js";

      // Act
      const result = await executor.readFile(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.content).toContain("// app.js");
      expect(result.data.lines).toBe(1);
      expect(result.data.path).toBe(filePath);
    });

    test("returns file not found error", async () => {
      // Arrange
      const filePath = "src/nonexistent.js";

      // Act
      const result = await executor.readFile(filePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_NOT_FOUND);
      expect(result.error.type).toBe(TOOL_ERROR_TYPES.FILESYSTEM);
    });

    test("rejects reading directory as file", async () => {
      // Arrange
      const dirPath = "src";

      // Act
      const result = await executor.readFile(dirPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.NOT_A_FILE);
    });

    test("handles empty file", async () => {
      // Arrange
      const emptyFile = "src/empty.js";
      await fs.writeFile(path.join(tempDir, emptyFile), "");

      // Act
      const result = await executor.readFile(emptyFile);

      // Assert
      expect(result.success).toBe(true);
      // Empty file results in one empty line: "1: "
      expect(result.data.content).toBe("1: ");
      expect(result.data.lines).toBe(1);
    });

    test("rejects file exceeding size limit", async () => {
      // Arrange
      const largeFile = "src/large.js";
      const largeContent = "x".repeat(501 * 1024); // 501KB
      await fs.writeFile(path.join(tempDir, largeFile), largeContent);

      // Act
      const result = await executor.readFile(largeFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_TOO_LARGE);
    });
  });

  describe("list_directory", () => {
    test("lists directory contents non-recursively", async () => {
      // Arrange
      const dirPath = "src";

      // Act
      const result = await executor.listDirectory(dirPath, false);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.listing).toContain("app.js");
      expect(result.data.listing).toContain("index.js");
      expect(result.data.listing).toContain("components/");
      expect(result.data.entries).toBe(3); // 2 files + 1 directory
    });

    test("lists directory contents recursively", async () => {
      // Arrange
      const dirPath = "src";

      // Act
      const result = await executor.listDirectory(dirPath, true);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.listing).toContain("app.js");
      expect(result.data.listing).toContain("Button.jsx");
      expect(result.data.entries).toBeGreaterThanOrEqual(3);
    });

    test("lists root directory", async () => {
      // Arrange
      const dirPath = ".";

      // Act
      const result = await executor.listDirectory(dirPath, false);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.listing).toContain("src/");
      expect(result.data.listing).toContain("tests/");
    });

    test("returns error for non-existent directory", async () => {
      // Arrange
      const dirPath = "nonexistent";

      // Act
      const result = await executor.listDirectory(dirPath, false);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_NOT_FOUND);
    });

    test("returns error when listing file as directory", async () => {
      // Arrange
      const filePath = "src/app.js";

      // Act
      const result = await executor.listDirectory(filePath, false);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.NOT_A_DIRECTORY);
    });
  });

  describe("search_files", () => {
    test("searches for files by pattern", async () => {
      // Arrange
      const pattern = "*.js";

      // Act
      const result = await executor.searchFiles(pattern, ".");

      // Assert
      expect(result.success).toBe(true);
      // Normalize paths for cross-platform comparison
      const normalizedMatches = result.data.matches.map((p) =>
        p.replace(/\\/g, "/"),
      );
      expect(normalizedMatches).toContain("src/app.js");
      expect(normalizedMatches).toContain("src/index.js");
      expect(result.data.count).toBeGreaterThanOrEqual(2);
    });

    test("searches in specific directory", async () => {
      // Arrange
      const pattern = "*.js";
      const directory = "tests";

      // Act
      const result = await executor.searchFiles(pattern, directory);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.matches).toContain("app.test.js");
      expect(result.data.count).toBe(1);
    });

    test("searches for specific file type", async () => {
      // Arrange
      const pattern = "*.jsx";

      // Act
      const result = await executor.searchFiles(pattern, ".");

      // Assert
      expect(result.success).toBe(true);
      // Normalize paths for cross-platform comparison
      const normalizedMatches = result.data.matches.map((p) =>
        p.replace(/\\/g, "/"),
      );
      expect(normalizedMatches).toContain("src/components/Button.jsx");
    });

    test("returns empty result for no matches", async () => {
      // Arrange
      const pattern = "*.xyz";

      // Act
      const result = await executor.searchFiles(pattern, ".");

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.matches).toEqual([]);
      expect(result.data.count).toBe(0);
    });
  });

  describe("rename_file", () => {
    test("renames file successfully", async () => {
      // Arrange
      const oldPath = "src/app.js";
      const newPath = "src/application.js";
      executor.setAllowedWritePaths([oldPath, newPath]);

      // Act
      const result = await executor.renameFile(oldPath, newPath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.oldPath).toBe(oldPath);
      expect(result.data.newPath).toBe(newPath);
      const newFileExists = await fs
        .access(path.join(tempDir, newPath))
        .then(() => true)
        .catch(() => false);
      expect(newFileExists).toBe(true);
    });

    test("moves file to different directory", async () => {
      // Arrange
      const oldPath = "src/app.js";
      const newPath = "tests/app.js";
      executor.setAllowedWritePaths([oldPath, newPath]);

      // Act
      const result = await executor.renameFile(oldPath, newPath);

      // Assert
      expect(result.success).toBe(true);
      const newFileExists = await fs
        .access(path.join(tempDir, newPath))
        .then(() => true)
        .catch(() => false);
      expect(newFileExists).toBe(true);
    });

    test("rejects rename without permission", async () => {
      // Arrange
      const oldPath = "src/app.js";
      const newPath = "src/renamed.js";

      // Act
      const result = await executor.renameFile(oldPath, newPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.PERMISSION_DENIED);
    });

    test("rejects rename when source doesn't exist", async () => {
      // Arrange
      const oldPath = "src/nonexistent.js";
      const newPath = "src/new.js";
      executor.setAllowedWritePaths([oldPath, newPath]);

      // Act
      const result = await executor.renameFile(oldPath, newPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_NOT_FOUND);
    });

    test("rejects rename when destination exists", async () => {
      // Arrange
      const oldPath = "src/app.js";
      const newPath = "src/index.js"; // already exists
      executor.setAllowedWritePaths([oldPath, newPath]);

      // Act
      const result = await executor.renameFile(oldPath, newPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(TOOL_ERROR_CODES.FILE_EXISTS);
    });
  });
});

describe("FileToolExecutor - executeTool", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `file-tools-exec-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.mkdir(path.join(tempDir, ".code-analysis"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "app.js"),
      "line one\nline two\nline three\n",
    );
    executor = new FileToolExecutor(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("read_file returns numbered file content as string", async () => {
    // Arrange / Act
    const result = await executor.executeTool("read_file", {
      path: "src/app.js",
    });

    // Assert
    expect(typeof result).toBe("string");
    expect(result).toContain("1: line one");
    expect(result).toContain("2: line two");
  });

  test("write_file returns success message as string", async () => {
    // Arrange / Act
    const result = await executor.executeTool("write_file", {
      path: ".code-analysis/out.json",
      content: '{"ok":true}',
    });

    // Assert
    expect(typeof result).toBe("string");
    expect(result).toContain(".code-analysis/out.json");
  });

  test("read_file on missing file returns error message as string", async () => {
    // Arrange / Act
    const result = await executor.executeTool("read_file", {
      path: "src/missing.js",
    });

    // Assert
    expect(typeof result).toBe("string");
    expect(result).toContain("not found");
  });

  test("unknown tool returns error message as string", async () => {
    // Arrange / Act
    const result = await executor.executeTool("nonexistent_tool", {});

    // Assert
    expect(typeof result).toBe("string");
    expect(result).toContain("Unknown tool");
  });
});
