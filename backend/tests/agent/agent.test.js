import { describe, test, expect, beforeEach, vi } from "vitest";
import { LLMAgent } from "../../agents/agent.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal LLM response that ends the conversation immediately.
 */
function textResponse(content, { inputTokens = 10, outputTokens = 10 } = {}) {
  return {
    content,
    toolCalls: [],
    stopReason: "end_turn",
    usage: { inputTokens, outputTokens },
    reasoningContent: null,
  };
}

/**
 * Build an LLM response that requests a tool call.
 */
function toolCallResponse(name, args, id = "tool-1") {
  return {
    content: null,
    toolCalls: [{ id, name, arguments: args }],
    stopReason: "tool_use",
    usage: { inputTokens: 10, outputTokens: 10 },
    reasoningContent: null,
  };
}

// ─── Mocks ──────────────────────────────────────────────────────────────────

/**
 * Minimal mock for BaseLLMClient.
 * Provide a queue of responses — each call to sendMessage pops the next one.
 */
function createMockClient(responses) {
  const queue = [...responses];
  return {
    config: { maxTokens: 4096 },
    getMaxContextTokens: () => 100_000,
    sendMessage: vi.fn(async () => {
      if (queue.length === 0) throw new Error("No more mock responses");
      return queue.shift();
    }),
    compact: vi.fn(async (messages) => [
      { role: "user", content: "compacted" },
    ]),
  };
}

/**
 * Minimal mock for ChatState.
 */
function createMockState() {
  const messages = [];
  return {
    addSystemMessage: vi.fn((c) =>
      messages.push({ role: "system", content: c }),
    ),
    addUserMessage: vi.fn((c) => messages.push({ role: "user", content: c })),
    addAssistantMessage: vi.fn((c) =>
      messages.push({ role: "assistant", content: c }),
    ),
    addToolUse: vi.fn(),
    addToolResult: vi.fn(),
    getMessages: vi.fn(() => messages),
    getTokenCount: vi.fn(() => 100),
    needsCompaction: vi.fn(() => false),
    setActualTokenCount: vi.fn(),
    compact: vi.fn(),
  };
}

/**
 * Minimal mock executor — returns a fixed result for any tool call.
 */
function createMockExecutor(result = "mock-tool-result") {
  return {
    getToolDescription: vi.fn((name) => `mock: ${name}`),
    execute: vi.fn(async () => result),
  };
}

/**
 * Replace ToolRegistry's findExecutor and getAvailableTools so no real
 * file/command/web tools are involved.
 */
function installMockTools(agent, toolName, executor) {
  agent.tools.findExecutor = vi.fn((name) => {
    if (name === toolName) return { executor, stringifyResult: false };
    return undefined;
  });
  agent.tools.getAvailableTools = vi.fn(() => [
    { name: toolName, description: "mock tool" },
  ]);
}

// ─── Minimal handler ────────────────────────────────────────────────────────

function makeHandler(overrides = {}) {
  return {
    systemPrompt: "You are a test assistant.",
    initialMessage: "Hello",
    onStart: vi.fn(),
    onProgress: vi.fn(),
    onToolCall: vi.fn(),
    onIteration: vi.fn(),
    onMessage: vi.fn(),
    onCompaction: vi.fn(),
    onComplete: vi.fn(async () => {}),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("LLMAgent", () => {
  let client;
  let state;
  let agent;

  beforeEach(() => {
    client = createMockClient([textResponse("Done")]);
    state = createMockState();
    agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
  });

  describe("basic conversation", () => {
    test("returns success result with token usage after single turn", async () => {
      // Arrange
      const handler = makeHandler();

      // Act
      const result = await agent.run(handler);

      // Assert
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.stopReason).toBe("end_turn");
      expect(result.tokenUsage.totalTokens).toBe(20);
    });

    test("calls onStart before first iteration", async () => {
      // Arrange
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(handler.onStart).toHaveBeenCalledOnce();
    });

    test("calls onMessage with assistant content", async () => {
      // Arrange
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(handler.onMessage).toHaveBeenCalledWith("assistant", "Done");
    });

    test("calls onIteration once per LLM call", async () => {
      // Arrange
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(handler.onIteration).toHaveBeenCalledOnce();
    });

    test("calls onComplete and merges its return value into result", async () => {
      // Arrange
      const handler = makeHandler({
        onComplete: vi.fn(async () => ({ customField: "yes" })),
      });

      // Act
      const result = await agent.run(handler);

      // Assert
      expect(handler.onComplete).toHaveBeenCalledOnce();
      expect(result.customField).toBe("yes");
    });

    test("adds system and user messages to state", async () => {
      // Arrange
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(state.addSystemMessage).toHaveBeenCalledWith(
        "You are a test assistant.",
      );
      expect(state.addUserMessage).toHaveBeenCalledWith("Hello");
    });

    test("replays prior conversation turns before current message", async () => {
      // Arrange
      const handler = makeHandler({
        priorMessages: [
          { role: "user", content: "prior user" },
          { role: "assistant", content: "prior assistant" },
        ],
      });

      // Act
      await agent.run(handler);

      // Assert
      expect(state.addUserMessage).toHaveBeenNthCalledWith(1, "prior user");
      expect(state.addAssistantMessage).toHaveBeenCalledWith("prior assistant");
      expect(state.addUserMessage).toHaveBeenNthCalledWith(2, "Hello");
    });
  });

  describe("tool call handling", () => {
    test("executes a tool call and continues conversation", async () => {
      // Arrange
      client = createMockClient([
        toolCallResponse("mock_tool", { input: "data" }),
        textResponse("All done"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      const executor = createMockExecutor("tool-output");
      installMockTools(agent, "mock_tool", executor);
      const handler = makeHandler();

      // Act
      const result = await agent.run(handler);

      // Assert
      expect(executor.execute).toHaveBeenCalledWith("mock_tool", {
        input: "data",
      });
      expect(state.addToolResult).toHaveBeenCalledWith(
        "tool-1",
        "mock_tool",
        "tool-output",
      );
      expect(result.iterations).toBe(2);
    });

    test("calls onToolCall callback with name, args, and result", async () => {
      // Arrange
      client = createMockClient([
        toolCallResponse("mock_tool", { x: 1 }),
        textResponse("Done"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      installMockTools(agent, "mock_tool", createMockExecutor("result"));
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(handler.onToolCall).toHaveBeenCalledWith(
        "mock_tool",
        { x: 1 },
        "result",
      );
    });

    test("records tool call error in state and fires onToolCall with error", async () => {
      // Arrange
      client = createMockClient([
        toolCallResponse("mock_tool", {}),
        textResponse("Done"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      const failingExecutor = {
        getToolDescription: vi.fn(() => "mock_tool"),
        execute: vi.fn(async () => {
          throw new Error("boom");
        }),
      };
      installMockTools(agent, "mock_tool", failingExecutor);
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert
      expect(state.addToolResult).toHaveBeenCalledWith(
        "tool-1",
        "mock_tool",
        "Error: boom",
      );
      expect(handler.onToolCall).toHaveBeenCalledWith(
        "mock_tool",
        {},
        "Error: boom",
        expect.any(Error),
      );
    });

    test("records error in state when no executor found for tool", async () => {
      // Arrange — second response ends the conversation after the error is handled
      client = createMockClient([
        toolCallResponse("unknown_tool", {}),
        textResponse("Done"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      agent.tools.findExecutor = vi.fn(() => undefined);
      agent.tools.getAvailableTools = vi.fn(() => []);
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert — agent captures the error as a tool result and keeps going
      expect(state.addToolResult).toHaveBeenCalledWith(
        "tool-1",
        "unknown_tool",
        "Error: No executor found for tool: unknown_tool",
      );
    });
  });

  describe("iteration limits", () => {
    test("stops after maxIterations even without end_turn", async () => {
      // Arrange — client always returns tool calls so the loop never naturally ends
      const infiniteClient = {
        config: { maxTokens: 4096 },
        getMaxContextTokens: () => 100_000,
        sendMessage: vi.fn(async () =>
          toolCallResponse("mock_tool", {}, "tool-x"),
        ),
      };
      state = createMockState();
      agent = new LLMAgent(infiniteClient, state, {
        workingDirectory: "/tmp/test",
        maxIterations: 3,
      });
      const executor = createMockExecutor();
      installMockTools(agent, "mock_tool", executor);
      const handler = makeHandler();

      // Act
      const result = await agent.run(handler);

      // Assert
      expect(result.iterations).toBe(3);
    });
  });

  describe("cancellation", () => {
    test("throws TASK_CANCELLED when abort signal fires before LLM call", async () => {
      // Arrange
      const controller = new AbortController();
      controller.abort();
      const handler = makeHandler();

      // Act & Assert
      await expect(agent.run(handler, controller.signal)).rejects.toMatchObject(
        { code: "TASK_CANCELLED" },
      );
    });
  });

  describe("max_tokens handling", () => {
    test("sends a continuation message when stop reason is max_tokens", async () => {
      // Arrange
      client = createMockClient([
        { ...textResponse("partial"), stopReason: "max_tokens" },
        textResponse("final"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      const handler = makeHandler();

      // Act
      await agent.run(handler);

      // Assert — agent should have asked for final output
      expect(state.addUserMessage).toHaveBeenCalledWith(
        "You've reached the token limit. Please provide your final output now.",
      );
      expect(client.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe("custom shouldContinue", () => {
    test("stops when shouldContinue returns false", async () => {
      // Arrange
      client = createMockClient([
        textResponse("first"),
        textResponse("second"),
      ]);
      state = createMockState();
      agent = new LLMAgent(client, state, { workingDirectory: "/tmp/test" });
      const handler = makeHandler({
        shouldContinue: vi.fn(() => false),
      });

      // Act
      const result = await agent.run(handler);

      // Assert
      expect(result.iterations).toBe(1);
      expect(client.sendMessage).toHaveBeenCalledTimes(1);
    });
  });
});
