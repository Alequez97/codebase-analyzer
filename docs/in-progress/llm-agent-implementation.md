# LLM Agent Implementation - Work in Progress

**Started:** February 13, 2026  
**Status:** In Progress  
**Last Updated:** February 13, 2026

## Objective

Implement a custom LLM-based agent for codebase analysis to replace reliance on Aider. The new agent will:

- Use native LLM API calls (Claude, OpenAI, DeepSeek, etc.)
- Support tool/function calling for iterative file reading
- Handle large codebases through smart context management
- Provide more reliable JSON output generation
- Be provider-agnostic with easy switching between LLMs

## Problem Statement

**Aider Limitations:**

- Constantly avoids writing files despite instructions
- Difficult to reliably get structured JSON output
- Less control over the analysis flow
- Black-box behavior for debugging

**Our Solution:**
Build a custom agent that:

1. Sends project structure initially
2. LLM requests specific files via tool calls
3. Iteratively builds analysis JSON
4. Has transparent, debuggable control flow

## Architecture Design

```
┌─────────────────────────────────────────────────┐
│  LLM Agent (llm-agent.js)                       │
│  - Orchestrates analysis workflow               │
│  - Manages conversation state                   │
│  - Handles tool execution                       │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼────────┐  ┌───────▼──────────┐
│  Chat State     │  │  File Tools      │
│  - Messages     │  │  - read_file     │
│  - Tokens       │  │  - list_dir      │
│  - Compaction   │  │  - search_files  │
└────────┬────────┘  └──────────────────┘
         │
┌────────▼────────┐
│  LLM Clients    │
│  - ClaudeClient │
│  - (OpenAI)     │
│  - (DeepSeek)   │
└─────────────────┘
```

## Implementation Progress

### ✅ Completed Components

#### 1. **Base LLM Client Interface** (`backend/llm/clients/base-client.js`)

- Abstract class defining the contract for all LLM providers
- Methods:
  - `sendMessage(messages, options)` - Single method for all interactions
  - `countTokens(text)` - Token estimation
  - `countMessageTokens(messages)` - Message array token counting
  - `getMaxContextTokens()` - Provider-specific limits
- Designed for easy provider switching

#### 2. **Claude Client Implementation** (`backend/llm/clients/claude-client.js`)

- Full Anthropic API integration
- Uses Claude Sonnet 4.5 (latest model)
- Features:
  - Native tool calling support
  - System message handling (Claude-specific format)
  - Response normalization to standard format
  - Token counting approximation (~3.5 chars/token)
  - 200K context window support
- Response format:
  ```javascript
  {
    content: "text response",
    toolCalls: [{id, name, arguments}],
    stopReason: "end_turn" | "tool_use" | "max_tokens",
    usage: {inputTokens, outputTokens}
  }
  ```

#### 3. **File Tools** (`backend/llm/tools/file-tools.js`)

- Tool definitions for LLM:
  - `read_file` - Read specific file content (500KB limit)
  - `list_directory` - Browse folders (flat or recursive)
  - `search_files` - Find files by pattern (glob-like)
- `FileToolExecutor` class:
  - Executes tool calls from LLM
  - Security: prevents path traversal outside project root
  - Auto-ignores: node_modules, .git, dist, build
  - Graceful error handling
- Ready for Claude's tool calling format

#### 4. **Chat State Manager** (`backend/llm/chat-state.js`)

- Manages conversation history
- Methods:
  - `addSystemMessage(content)` - Initial instructions
  - `addUserMessage(content)` - User/system messages
  - `addAssistantMessage(content)` - LLM responses
  - `addToolUse(toolCalls)` - LLM tool requests
  - `addToolResult(toolCallId, name, result)` - Tool execution results
- Token management:
  - Tracks total tokens across conversation
  - Auto-compaction at 75% of max context (150K tokens for Claude)
  - Compaction strategy: Keep system message + recent context, summarize middle
- File caching:
  - Tracks which files already sent to avoid duplication
  - `markFileCached(path)` / `isFileCached(path)`
- Statistics:
  - `getStats()` - messageCount, tokenCount, utilization%, cachedFiles

#### 5. **Code Quality Improvements**

- Removed all `console.log` from backend
- Migrated to centralized logger utility (`backend/utils/logger.js`)
- Consistent logging with component tags and log levels
- Updated AGENTS.md with logging guideline

### 🚧 Pending Components

#### 6. **LLM Agent Orchestrator** (`backend/agents/llm-agent.js`) - NEXT

**Purpose:** Main orchestrator that ties everything together

**Planned functionality:**

```javascript
export async function detect() {
  // Check if API keys are configured
  // Return true if LLM client can be initialized
}

export async function execute(task) {
  // 1. Initialize LLM client (Claude by default)
  // 2. Create ChatState instance
  // 3. Build initial context:
  //    - System message with analysis instructions
  //    - Project structure (directory tree)
  //    - Available tools
  // 4. Main loop:
  //    while (!done) {
  //      - Send message to LLM with tools
  //      - If LLM returns tool calls:
  //        - Execute each tool (read files, etc.)
  //        - Add results to chat state
  //        - Continue conversation
  //      - If LLM returns final JSON:
  //        - Validate JSON structure
  //        - Save to outputFile
  //        - Return success
  //      - If context approaching limit:
  //        - Trigger compaction
  //    }
  // 5. Return execution result
}
```

**Context management strategy:**

- Initial message: System instructions + full directory tree
- LLM requests files it needs via tools
- Only send file content when explicitly requested
- Compact old messages when reaching token limits

**Error handling:**

- Max iterations limit (prevent infinite loops)
- Timeout handling
- Invalid JSON recovery
- Tool execution errors
- API rate limiting

#### 7. **Integration with Task System**

- Register LLM agent in `backend/agents/index.js`
- Add to `AGENTS` object alongside Aider and Gemini
- Update agent detection and selection logic
- Configure via `backend/config.js`:
  ```javascript
  llm: {
    provider: 'claude', // 'claude' | 'openai' | 'deepseek'
    model: 'claude-sonnet-4.5-20260101',
    apiKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
    }
  }
  ```

#### 8. **Testing & Validation**

- Test with small codebase first
- Validate JSON output matches schema
- Test token compaction with large codebases
- Compare results with Aider output
- Performance benchmarking

#### 9. **Future Enhancements**

- OpenAI client implementation
- DeepSeek client implementation
- Streaming responses support
- Parallel tool execution
- Context caching (Anthropic's prompt caching feature)
- Cost tracking per analysis
- Retry logic with exponential backoff

## File Structure

```
backend/
  llm/
    clients/
      base-client.js          ✅ Base interface
      claude-client.js        ✅ Claude implementation
      openai-client.js        🚧 TODO
      deepseek-client.js      🚧 TODO
    tools/
      file-tools.js           ✅ File operations for LLM
    chat-state.js             ✅ Conversation management
  agents/
    llm-agent.js              🚧 TODO - Main orchestrator
    index.js                  🚧 TODO - Register LLM agent
```

## Key Design Decisions

### 1. **Single `sendMessage()` Method**

- Originally planned separate `sendMessage()` and `sendMessageWithTools()`
- Simplified to single method with optional `tools` parameter
- Cleaner API, easier to use

### 2. **Native Tool Calling**

- Use LLM provider's native tool/function calling
- More reliable than parsing JSON responses
- Better error handling
- Supports multiple tool calls in single response

### 3. **Context Compaction Strategy**

- Keep system message (instructions) always
- Keep recent N messages (last 2-4 exchanges)
- Summarize old middle messages
- Track already-seen files to avoid re-sending

### 4. **Provider Agnostic**

- All providers implement same `BaseLLMClient` interface
- Easy to swap: just change config
- Response format normalized across providers

### 5. **Security**

- File tools validate paths (prevent traversal attacks)
- File size limits (500KB default)
- Ignored directories (node_modules, .git, etc.)

## Next Steps

1. **Implement LLM Agent Orchestrator** (`llm-agent.js`)
   - Create file with `detect()` and `execute()` functions
   - Implement main conversation loop
   - Tool execution handling
   - JSON validation and output

2. **Register with Agent System**
   - Add to `backend/agents/index.js`
   - Update configuration
   - Test detection

3. **Initial Testing**
   - Small codebase test
   - Validate JSON output
   - Debug any issues

4. **Refinement**
   - Improve prompts for better analysis
   - Optimize context usage
   - Handle edge cases

## Dependencies

**Required npm packages:**

- `@anthropic-ai/sdk` - Anthropic/Claude API client (needs installation)

**To install:**

```bash
cd backend
npm install @anthropic-ai/sdk
```

## Environment Variables

```env
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
LLM_PROVIDER=claude  # Default provider
LLM_MODEL=claude-sonnet-4.5-20260101
```

## References

- [Anthropic API Docs](https://docs.anthropic.com/en/api)
- [Claude Models Overview](https://docs.anthropic.com/en/docs/about-claude/models)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/tool-use)
- Current implementation: `backend/agents/aider.js` (reference)

## Notes

- This replaces Aider dependency while maintaining same task interface
- Can run both agents side-by-side during transition
- LLM agent should be faster for large codebases (no external process spawning)
- More control over analysis quality and output format
- Easier to debug and iterate on prompts

---

**Last stopped at:** Base infrastructure complete, ready to implement main orchestrator.
