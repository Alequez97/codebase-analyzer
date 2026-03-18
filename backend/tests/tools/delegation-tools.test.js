import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DelegationToolExecutor,
  DELEGATABLE_TASK_TYPES,
} from "../../llm/tools/delegation-tools.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Delegation Tools Test Suite
 *
 * Focus: correct delegation flow, instruction file security, chat-history
 * structure written for the child task, and queue-function integration.
 */

describe("DelegationToolExecutor - Successful Delegation", () => {
  let executor;
  let tempDir;
  let mockQueueFn;
  let queueFunctions;

  beforeEach(async () => {
    // Arrange – real temp directory, mock queue function
    tempDir = path.join(os.tmpdir(), `delegation-tools-test-${Date.now()}`);
    await fs.mkdir(
      path.join(tempDir, ".code-analysis", "temp", "delegation-requests"),
      {
        recursive: true,
      },
    );

    mockQueueFn = vi.fn().mockResolvedValue({
      id: "edit-documentation-20260311T120000-abc123",
      type: "edit-documentation",
      status: "pending",
    });

    queueFunctions = {
      "edit-documentation": mockQueueFn,
    };

    executor = new DelegationToolExecutor(
      tempDir,
      "parent-task-id-xyz",
      queueFunctions,
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("returns success with task info after queuing", async () => {
    // Arrange
    const instructionPath =
      ".code-analysis/temp/delegation-requests/update-docs.md";
    await fs.writeFile(
      path.join(tempDir, instructionPath),
      "Update the algorithm section to reflect ELO-based scoring.",
    );

    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "match-scoring",
      requestFile: instructionPath,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.taskId).toBe(
      "edit-documentation-20260311T120000-abc123",
    );
    expect(result.data.type).toBe("edit-documentation");
    expect(result.data.domainId).toBe("match-scoring");
    expect(result.data.message).toContain("match-scoring");
  });

  test("calls queue function with correct domainId, chatId and delegatedByTaskId", async () => {
    // Arrange
    const instructionPath =
      ".code-analysis/temp/delegation-requests/update-docs.md";
    await fs.writeFile(path.join(tempDir, instructionPath), "Do the work.");

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "match-scoring",
      requestFile: instructionPath,
    });

    // Assert
    expect(mockQueueFn).toHaveBeenCalledOnce();
    const callArgs = mockQueueFn.mock.calls[0][0];
    expect(callArgs.domainId).toBe("match-scoring");
    expect(callArgs.delegatedByTaskId).toBe("parent-task-id-xyz");
    expect(callArgs.chatId).toMatch(
      /^delegated-parent-task-id-xyz-[0-9a-f]{6}$/,
    );
  });

  test("writes synthetic chat history file with instruction as user message", async () => {
    // Arrange
    const instructionContent =
      "Update the algorithm section to reflect ELO-based scoring.";
    const instructionPath =
      ".code-analysis/temp/delegation-requests/update-docs.md";
    await fs.writeFile(path.join(tempDir, instructionPath), instructionContent);

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "match-scoring",
      requestFile: instructionPath,
    });

    // Assert – find the written chat-history file
    const chatHistoryDir = path.join(
      tempDir,
      ".code-analysis",
      "tasks",
      "chat-history",
    );
    const files = await fs.readdir(chatHistoryDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(
      /^domain-match-scoring-documentation-delegated-parent-task-id-xyz-[0-9a-f]{6}\.json$/,
    );

    const history = JSON.parse(
      await fs.readFile(path.join(chatHistoryDir, files[0]), "utf-8"),
    );
    expect(history.domainId).toBe("match-scoring");
    expect(history.sectionType).toBe("documentation");
    expect(history.delegated).toBe(true);
    expect(history.delegatedByTaskId).toBe("parent-task-id-xyz");
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0].role).toBe("user");
    expect(history.messages[0].content).toBe(instructionContent);
  });

  test("chat history chatId matches the chatId passed to queue function", async () => {
    // Arrange
    const instructionPath = ".code-analysis/temp/delegation-requests/note.md";
    await fs.writeFile(path.join(tempDir, instructionPath), "Do something.");

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: instructionPath,
    });

    // Assert – chatId in file name matches chatId passed to queue fn
    const chatHistoryDir = path.join(
      tempDir,
      ".code-analysis",
      "tasks",
      "chat-history",
    );
    const files = await fs.readdir(chatHistoryDir);
    const history = JSON.parse(
      await fs.readFile(path.join(chatHistoryDir, files[0]), "utf-8"),
    );

    const queuedChatId = mockQueueFn.mock.calls[0][0].chatId;
    expect(history.chatId).toBe(queuedChatId);
  });

  test("generates unique chatId per delegation call", async () => {
    // Arrange
    const instructionPath = ".code-analysis/temp/delegation-requests/note.md";
    await fs.writeFile(path.join(tempDir, instructionPath), "Do something.");

    const queueFn2 = vi.fn().mockResolvedValue({
      id: "edit-diagrams-20260311T120000-def456",
      type: "edit-diagrams",
      status: "pending",
    });
    executor = new DelegationToolExecutor(tempDir, "parent-task-id-xyz", {
      "edit-documentation": mockQueueFn,
      "edit-diagrams": queueFn2,
    });

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: instructionPath,
    });
    await executor.execute("delegate_task", {
      type: "edit-diagrams",
      domainId: "auth",
      requestFile: instructionPath,
    });

    // Assert
    const chatId1 = mockQueueFn.mock.calls[0][0].chatId;
    const chatId2 = queueFn2.mock.calls[0][0].chatId;
    expect(chatId1).not.toBe(chatId2);
  });

  test("maps section type correctly for all delegatable types", async () => {
    // Arrange
    const expectedSectionTypes = {
      "edit-documentation": "documentation",
      "edit-diagrams": "diagrams",
      "edit-requirements": "requirements",
      "edit-bugs-security": "bugs-security",
      "edit-refactoring-and-testing": "refactoring-and-testing",
    };

    for (const [taskType, expectedSection] of Object.entries(
      expectedSectionTypes,
    )) {
      const instructionPath = `.code-analysis/temp/delegation-requests/note-${taskType}.md`;
      await fs.writeFile(
        path.join(tempDir, instructionPath),
        "Instruction content.",
      );

      const queueFn = vi.fn().mockResolvedValue({
        id: `${taskType}-abc`,
        type: taskType,
        status: "pending",
      });
      const localExecutor = new DelegationToolExecutor(tempDir, "parent-id", {
        [taskType]: queueFn,
      });

      // Act
      await localExecutor.execute("delegate_task", {
        type: taskType,
        domainId: "test-domain",
        requestFile: instructionPath,
      });

      // Assert
      const chatHistoryDir = path.join(
        tempDir,
        ".code-analysis",
        "tasks",
        "chat-history",
      );
      const files = await fs.readdir(chatHistoryDir);
      const relevantFile = files.find((f) =>
        f.includes(`-${expectedSection}-`),
      );
      expect(relevantFile).toBeTruthy();

      // Cleanup for next iteration
      await fs.rm(chatHistoryDir, { recursive: true, force: true });
    }
  });
});

describe("DelegationToolExecutor - Security", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `delegation-security-test-${Date.now()}`);
    await fs.mkdir(
      path.join(tempDir, ".code-analysis", "temp", "delegation-requests"),
      {
        recursive: true,
      },
    );

    executor = new DelegationToolExecutor(tempDir, "parent-id", {
      "edit-documentation": vi.fn(),
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("rejects requestFile outside .code-analysis/temp/", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: ".code-analysis/domains/auth/documentation/content.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("ACCESS_DENIED");
    expect(result.error.message).toContain(".code-analysis/temp/");
  });

  test("rejects path traversal in requestFile", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: ".code-analysis/temp/../../../etc/passwd",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("ACCESS_DENIED");
  });

  test("rejects requestFile in project root", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: "README.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("ACCESS_DENIED");
  });

  test("rejects requestFile with absolute path", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: "/etc/passwd",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("ACCESS_DENIED");
  });
});

describe("DelegationToolExecutor - Validation", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `delegation-validation-test-${Date.now()}`,
    );
    await fs.mkdir(
      path.join(tempDir, ".code-analysis", "temp", "delegation-requests"),
      {
        recursive: true,
      },
    );

    executor = new DelegationToolExecutor(tempDir, "parent-id", {
      "edit-documentation": vi.fn(),
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("returns error for missing type", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      domainId: "auth",
      requestFile: ".code-analysis/temp/delegation-requests/note.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("required");
  });

  test("returns error for missing domainId", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      requestFile: ".code-analysis/temp/delegation-requests/note.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("required");
  });

  test("returns error for missing requestFile", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("required");
  });

  test("returns error for unknown task type", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "analyze-full-codebase",
      domainId: "auth",
      requestFile: ".code-analysis/temp/delegation-requests/note.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("UNSUPPORTED_TYPE");
    expect(result.error.message).toContain("analyze-full-codebase");
  });

  test("returns error when request file does not exist", async () => {
    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: ".code-analysis/temp/delegation-requests/nonexistent.md",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  test("returns error when request file is empty", async () => {
    // Arrange
    const emptyPath = ".code-analysis/temp/delegation-requests/empty.md";
    await fs.writeFile(path.join(tempDir, emptyPath), "   \n  ");

    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: emptyPath,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("EMPTY_INSTRUCTION");
  });

  test("returns error for unknown tool name", async () => {
    // Act
    const result = await executor.execute("unknown_tool", {});

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("unknown_tool");
  });

  test("returns error when no queue function registered for type", async () => {
    // Arrange – executor with empty queue functions map
    const bareExecutor = new DelegationToolExecutor(tempDir, "parent-id", {});
    const instructionPath = ".code-analysis/temp/delegation-requests/note.md";
    await fs.writeFile(path.join(tempDir, instructionPath), "Do something.");

    // Act
    const result = await bareExecutor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: instructionPath,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("UNSUPPORTED_TYPE");
  });
});

describe("DelegationToolExecutor - Queue Function Failure", () => {
  let executor;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `delegation-failure-test-${Date.now()}`);
    await fs.mkdir(
      path.join(tempDir, ".code-analysis", "temp", "delegation-requests"),
      {
        recursive: true,
      },
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("returns error when queue function returns {success: false}", async () => {
    // Arrange
    const failingQueueFn = vi.fn().mockResolvedValue({
      success: false,
      error: "No agent configured",
      code: "NO_AGENT",
    });
    executor = new DelegationToolExecutor(tempDir, "parent-id", {
      "edit-documentation": failingQueueFn,
    });

    const instructionPath = ".code-analysis/temp/delegation-requests/note.md";
    await fs.writeFile(path.join(tempDir, instructionPath), "Do something.");

    // Act
    const result = await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: instructionPath,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("No agent configured");
    expect(result.error.code).toBe("NO_AGENT");
  });

  test("does not call queue function when request file is missing", async () => {
    // Arrange
    const mockQueueFn = vi.fn();
    executor = new DelegationToolExecutor(tempDir, "parent-id", {
      "edit-documentation": mockQueueFn,
    });

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: ".code-analysis/temp/delegation-requests/missing.md",
    });

    // Assert
    expect(mockQueueFn).not.toHaveBeenCalled();
  });

  test("does not write chat history when request file is missing", async () => {
    // Arrange
    executor = new DelegationToolExecutor(tempDir, "parent-id", {
      "edit-documentation": vi.fn(),
    });

    // Act
    await executor.execute("delegate_task", {
      type: "edit-documentation",
      domainId: "auth",
      requestFile: ".code-analysis/temp/delegation-requests/missing.md",
    });

    // Assert – chat-history dir not created
    const chatHistoryDir = path.join(
      tempDir,
      ".code-analysis",
      "tasks",
      "chat-history",
    );
    const exists = await fs
      .access(chatHistoryDir)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});

describe("DelegationToolExecutor - DELEGATABLE_TASK_TYPES export", () => {
  test("includes all edit-* task types", () => {
    // Assert
    expect(DELEGATABLE_TASK_TYPES).toContain("edit-documentation");
    expect(DELEGATABLE_TASK_TYPES).toContain("edit-diagrams");
    expect(DELEGATABLE_TASK_TYPES).toContain("edit-requirements");
    expect(DELEGATABLE_TASK_TYPES).toContain("edit-bugs-security");
    expect(DELEGATABLE_TASK_TYPES).toContain("edit-refactoring-and-testing");
    expect(DELEGATABLE_TASK_TYPES).toContain("design-generate-page");
  });

  test("does not include analyze-* or implement-* types", () => {
    // Assert – delegation targets only edit tasks
    const nonEditTypes = DELEGATABLE_TASK_TYPES.filter(
      (t) => !t.startsWith("edit-") && t !== "design-generate-page",
    );
    expect(nonEditTypes).toHaveLength(0);
  });
});
