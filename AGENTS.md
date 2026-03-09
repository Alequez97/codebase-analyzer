# Codebase Analyzer - AI-Powered Code Auditing Tool

## Purpose

**Codebase Analyzer** is a web-based tool that leverages AI agents (like Aider) to automatically audit your codebase, find bugs, identify missing tests, detect security vulnerabilities, and help you apply fixes with minimal manual effort.

## The Problem We Solve

Manual code review is time-consuming and error-prone:

- ❌ Finding all bugs requires deep analysis of every file
- ❌ Identifying missing test coverage is tedious
- ❌ Security vulnerabilities often go unnoticed
- ❌ Applying fixes across multiple files is repetitive
- ❌ Understanding legacy code takes forever

## Our Solution

A **beautiful web interface** where you can:

1. **Analyze your codebase** - AI analyzes your project structure
2. **View domains** - See organized breakdown of your code
3. **Review findings** - Browse bugs, security issues, missing tests
4. **Implement fixes** - One-click to implement AI-generated fixes
5. **Track progress** - See what's been fixed and what's pending

### The Flow (Minimal User Actions)

```
┌─────────────────────────────────────────────────┐
│  1. Run CLI in your project root               │
│     $ code-analyze                              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  2. Open web dashboard                          │
│     http://localhost:5173                       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  3. Click "Analyze Codebase"                       │
│     AI analyzes your entire project             │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  4. View discovered domains                     │
│     See all functional areas of your codebase   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  5. Click "Analyze" on a domain                 │
│     AI deep-dives into bugs & security issues   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  6. Review findings in dashboard                │
│     Browse bugs, vulnerabilities, missing tests │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  7. Click "Fix" on any issue                    │
│     AI-generated fix is applied to your code    │
└──────────────────┬──────────────────────────────┘
                   │
                  DONE!
```

**That's it!** Just a few clicks and your code is analyzed and fixed.

## Key Features

### 🎯 Automated Discovery

- **Domain Detection**: AI automatically identifies functional domains in your codebase
- **Dependency Mapping**: Understands how your code is interconnected
- **Priority Assignment**: Highlights critical vs. low-priority areas

### 🐛 Bug Detection

- **Logic Errors**: Finds incorrect algorithms and flawed logic
- **Edge Cases**: Identifies missing validation and boundary conditions
- **Race Conditions**: Detects concurrency issues
- **Error Handling**: Spots missing try-catch and error checks

### 🔒 Security Analysis

- **SQL/NoSQL Injection**: Identifies unsafe database queries
- **XSS Vulnerabilities**: Finds missing input sanitization
- **Authentication Flaws**: Detects weak auth mechanisms
- **Data Exposure**: Spots sensitive data in logs/responses
- **Crypto Issues**: Identifies weak encryption usage

### 🧪 Test Coverage Analysis

- **Missing Tests**: Identifies untested code paths
- **Test Quality**: Evaluates existing test effectiveness
- **Recommendations**: Suggests what tests to write

### 🔧 One-Click Fixes

- **AI-Generated Solutions**: Smart fixes for identified issues
- **Context-Aware**: Understands your codebase patterns
- **Safe Application**: Preview changes before applying
- **Reversible**: All fixes are tracked and can be undone

### 📊 Beautiful Dashboard

- **Domain Overview**: Card-based view of all domains
- **Issue Breakdown**: See bugs, security issues, test gaps at a glance
- **Real-Time Updates**: Live updates as AI completes analysis
- **Detailed Views**: Drill down into specific findings
- **Progress Tracking**: Monitor analysis and fix status

## How It Works

### Architecture

```
┌────────────────────────────────────────────────┐
│            Web Dashboard (React)               │
│  Beautiful UI with real-time updates          │
│  - Domain cards                                │
│  - Issue lists                                 │
│  - Fix buttons                                 │
└────────────────┬───────────────────────────────┘
                 │ REST API + WebSocket
┌────────────────▼───────────────────────────────┐
│          Backend (Express + Node)              │
│  - API endpoints                               │
│  - Task orchestration                          │
│  - File watching                               │
│  - Fix application                             │
└────────────────┬───────────────────────────────┘
                 │ Spawns & monitors
┌────────────────▼───────────────────────────────┐
│            AI Agent (Aider, etc.)              │
│  - Analyzes code                               │
│  - Generates findings                          │
│  - Creates fixes                               │
│  - Writes JSON output                          │
└────────────────┬───────────────────────────────┘
                 │ Reads/writes
┌────────────────▼───────────────────────────────┐
│           Your Codebase + Analysis             │
│  .code-analysis/                               │
│    ├── codebase-analysis.json                       │
│    ├── domains/{domain-id}.json                │
│    └── tasks/pending/*.json                    │
└────────────────────────────────────────────────┘
```

### Contract-First Design

The backend and frontend communicate via **JSON contracts**:

- AI writes structured JSON files
- Dashboard reads and displays them
- No tight coupling between components
- Easy to swap AI agents

## Supported AI Agents

### Current: Aider

- **What**: AI-powered coding assistant
- **Why**: Excellent code understanding and modification
- **Setup**: `pip install aider-chat`

#### How Aider Handles Token Limits

Aider has built-in features to handle large codebases without hitting token limits:

- **Repository Map**: Creates a compact representation of your codebase (using `--map-tokens`)
- **Smart Context**: Only loads relevant files into LLM context
- **Auto-Refresh**: Updates its understanding as it works (`--map-refresh auto`)
- **No Manual Chunking**: All complexity is handled internally by Aider

**You don't need to manage tokens** - Aider does it automatically. If you encounter limits, Aider will work incrementally, analyzing critical files first and continuing with remaining files.

### Future Agents

The architecture supports any agent that can:

1. Read instruction files (markdown)
2. Analyze code
3. Write JSON output (following our schemas)

Potential agents:

- Custom LLM integrations (Claude, GPT-4, etc.)
- Specialized security scanners
- Code quality analyzers
- Test generation tools

## Configuration

### CLI Usage

```bash
cd /path/to/your/project
code-analyze
```

The tool analyzes the current directory.

### Environment Setup

```env
# backend/.env
PORT=3001
ANALYSIS_TOOL=aider
LLM_MODEL=deepseek
DEEPSEEK_API_KEY=your_key_here
```

## Output Structure

All analysis results are stored in `.code-analysis/` in your project:

```
your-project/
  .code-analysis/
    codebase-analysis.json           # Domain discovery
    domains/
      user-auth.json            # Detailed analysis per domain
      payment.json
      ...
    tasks/
      pending/                  # Queued analysis tasks
      completed/                # Finished tasks
    logs/                       # Agent execution logs
    temp/                       # Transient task artifacts (deleted after task completes)
```

### Temporary Files (`temp/` folder)

Anything that exists only to support a running task — such as model progress-tracking files — is written to `.code-analysis/temp/` inside the analyzed project. This folder is used by the backend for transient artifacts.

**Rules:**

- **Always use relative paths** within `.code-analysis/` when the LLM agent needs to write files — the agent's `write_file` tool only accepts paths relative to the project root that start with `.code-analysis/`
- **Temp files are cleaned up** after task completion — never persist them as analysis output
- **Do not use `backend/temp/`** for files the LLM writes; that directory is only for backend-internal artifacts (instruction dumps, etc.) that the agent never touches directly

## User Workflow Example

### Step 1: Initial Analysis

```bash
cd /path/to/my-app
code-analyze
```

Dashboard shows: "Click Analyze Codebase to begin"

### Step 2: Discover Domains

**User clicks**: "Analyze Codebase"
**AI does**: Analyzes project structure, identifies domains
**User sees**: Grid of discovered domains (e.g., "User Authentication", "Payment Processing")

### Step 3: Analyze a Domain

**User clicks**: "Analyze" on "User Authentication"**AI does**: Deep analysis of all auth-related files**User sees**:

- 3 critical security issues
- 7 bugs
- 5 missing tests

### Step 4: Review Findings

**User clicks**: On a security issue**User sees**:

- **Issue**: SQL Injection vulnerability
- **Location**: `auth/login.js:42`
- **Details**: User input not sanitized
- **Fix**: AI-generated code using prepared statements

### Step 5: Implement Fix

**User clicks**: "Implement Fix" button**Backend does**: Applies the fix to `auth/login.js`**User sees**:

- Success message
- Code diff showing changes
- Updated issue status (Fixed ✓)

### Step 6: Batch Fixes (Optional)

**User clicks**: "Fix All" for a category
**Backend does**: Applies all auto-fixable issues
**User sees**: Progress bar, summary of applied fixes

## Why This Approach?

### Minimal Manual Work

- No manual code review needed
- No manual fix application
- No manual test writing (AI suggests tests)
- Just point, click, review, approve

### AI Does the Heavy Lifting

- Reads thousands of lines of code
- Identifies subtle bugs humans miss
- Generates context-aware fixes
- Suggests comprehensive tests

### You Stay in Control

- Review all findings before fixing
- Preview changes before applying
- Undo any fix if needed
- Configure what to analyze and how

### Fast Iteration

1. Make changes to your code
2. Re-analyze affected domains
3. See new issues (if any)
4. Implement fixes
5. Repeat

## Design Principles

### 1. **Simple is Better**

- One analyze endpoint (agent handles complexity)
- Agents encapsulate their own logic (chunking, retries, etc.)
- Backend just orchestrates and serves results

### 2. **JSON Contracts**

- Well-defined schemas
- Agent-agnostic (swap Aider for anything else)
- Easy to test and mock

### 3. **Minimal User Actions**

- Default to smart choices
- One-click operations
- Auto-refresh when possible

### 4. **Developer-Friendly**

- Run in any project directory
- No complex configuration
- Works with existing codebases
- Non-invasive (uses `.code-analysis/` folder)

### 5. **Extensible**

- Support multiple AI agents
- Pluggable fix strategies
- Custom analysis rules
- API-first design

### 6. **State Management Best Practices**

- **Use Zustand stores** for all complex business logic, shared state, and data that needs to be accessed across multiple components
- **Use React useState** only for simple, internal component-specific UI state (toggles, form inputs, local visibility)
- **Examples of Zustand usage**:
  - API data caching, analysis results, domain editing
  - Project files, configuration
  - **Edited/draft data** that may be saved or shared (e.g., `editedTestCases`, `editedMissingTests`)
  - **Working state** that affects application behavior (e.g., `editingTest`, task status)
- **Examples of useState usage**:
  - dropdown open/closed, input field values within a form
  - local search terms, modal visibility
  - **Pure UI state** like `expandedRows`, `activeTab` that doesn't affect data or need to be shared
- **IMPORTANT**: If data is being modified and will be saved (e.g., editing test cases, editing domain data), it should be in a Zustand store, not useState
- Store state should be organized by domain (e.g., `useAnalysisStore`, `useProjectFilesStore`, `useTestingEditorStore`)
- Implement smart caching in stores to avoid redundant API calls
- Keep stores focused and avoid creating a single monolithic store
- **CRITICAL: Always use sessionStorage, never localStorage** - All persisted state must use `sessionStorage` via Zustand's `storage: () => sessionStorage` option to ensure data is cleared when the browser tab/session ends (not persisted across browser restarts)

#### 6.1 **Use Map Instead of Objects for Key-Value State**

- **Use JavaScript `Map` instead of plain objects** for state that requires frequent mutations by keys (e.g., `*ById` patterns)
- Maps provide better performance for key-based operations (set, get, delete) compared to object spread operations
- When persisting Maps in Zustand, use custom serialization/deserialization:
  ```javascript
  storage: createJSONStorage(() => sessionStorage, {
    replacer: (_key, value) => {
      if (value instanceof Map) {
        return { __type: "Map", value: Array.from(value.entries()) };
      }
      return value;
    },
    reviver: (_key, value) => {
      if (value && value.__type === "Map") {
        return new Map(value.value);
      }
      return value;
    },
  });
  ```

#### 6.2 **Split Large Endpoints into Modular Endpoints**

- **Avoid monolithic endpoints** that return all data at once
- **Split by logical domains/sections** - each section of data should have its own endpoint
- **Example**: Instead of `/api/analysis/domain/:id` returning everything, use:
  - `/api/analysis/domain/:id/documentation` - for documentation analysis
  - `/api/analysis/domain/:id/requirements` - for requirements analysis
  - `/api/analysis/domain/:id/testing` - for testing analysis
- **Benefits**:
  - Reduced payload size and faster initial loads
  - Independent loading states per section
  - Granular error handling (errors don't block unrelated sections)
  - Better caching strategies (cache sections independently)
  - Improved user experience with progressive loading

#### 6.3 **Separate Error Handling for Each Domain Section**

- **Map errors by section** - create separate error Maps for each domain part
- **Example**: Instead of one `domainErrorById`, use:
  - `domainDocumentationErrorById` - errors specific to documentation
  - `domainRequirementsErrorById` - errors specific to requirements
  - `domainTestingErrorById` - errors specific to testing
- **Benefits**:
  - One section failing doesn't block other sections
  - Users can see which specific section failed
  - Retry logic can be applied per section
  - Better debugging and error reporting

### 7. **Production-Ready Code**

- No legacy code or backward compatibility unless explicitly needed
- Clean implementation without leftovers
- Always update existing code rather than keeping old versions
- Remove unused features immediately
- Code should be ready to ship at any moment
- Avoid hardcoded fallback defaults in user-facing behavior/messages when runtime config should be authoritative
- **Never use default function parameters for runtime/request values** - Default parameters create false expectations and hide missing data. Always require explicit values and normalize/validate inside function bodies. This makes bugs visible immediately rather than causing unexpected behavior later.
- Never use nested try-catch blocks for control flow; use loops with early returns instead
- Don't migrate or maintain backward compatibility - just implement the new structure cleanly
- **Always use the centralized logger utility** (`backend/utils/logger.js`) instead of `console.log` for proper log level management and consistent output formatting
- **Always use constants** - Never hardcode task type strings (e.g., `"analyze-documentation"`). Use `TASK_TYPES.DOCUMENTATION` from `constants/task-types.js` instead. This applies to both frontend and backend code for consistency and maintainability.

### 8. **User Feedback with Toasts**

- **Use Chakra UI toasts** (not browser alerts) for all user notifications about completed actions
- Toast notifications provide better UX: non-blocking, auto-dismiss, professional appearance
- **When to use toasts**:
  - Success notifications (e.g., "Files saved successfully", "Documentation saved successfully")
  - Error notifications (e.g., "Failed to save files", "Failed to apply test")
  - Action confirmations (e.g., "Test applied successfully")
- **Never use browser `alert()`** - always use `toaster.create()` from `components/ui/toaster`
- **Toast configuration**:
  - `title`: Main message (required)
  - `description`: Additional details (optional, useful for error messages)
  - `type`: "success" or "error" for appropriate styling
  - Example:

    ```javascript
    toaster.create({
      title: "Files saved successfully",
      type: "success",
    });

    toaster.create({
      title: "Failed to save files",
      description: result.error,
      type: "error",
    });
    ```

### 9. **Socket Event Handling**

- **Handle socket events in the socket store** (`useSocketStore`), not in individual components
- **Update business logic stores** from socket event handlers (e.g., `useLogsStore`, `useAnalysisStore`)
- Components should only **read from stores**, never listen to socket events directly
- **Architecture**:
  - `useSocketStore.initSocket()` sets up all socket event listeners
  - Event handlers call methods on business logic stores to update state
  - Components subscribe to business logic stores via Zustand selectors

- **Benefits**:
  - Single source of truth for socket event handling
  - No duplicate event listeners across components
  - Components remain purely presentational
  - Easier to debug and maintain
  - Clear separation of concerns

- **Example**:

  ```javascript
  // ✅ CORRECT: Handle in socket store
  socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, ({ taskId, domainId, log }) => {
    useLogsStore.getState().appendLogs(domainId, "documentation", log);
  });

  // ❌ WRONG: Handle in component
  useEffect(() => {
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLog);
    return () => socket.off(SOCKET_EVENTS.LOG_DOCUMENTATION);
  }, [socket]);
  ```

### 10. **Modular Architecture - Avoid Large "Master" Files**

- **Split large files by responsibility** - Break down monolithic files into focused, single-purpose modules
- **Don't create "god files"** that export everything - these become maintenance nightmares and violate single responsibility principle
- **Benefits of modular structure**:
  - Easier to navigate and understand
  - Better code organization
  - Reduced merge conflicts
  - Faster builds (tree-shaking works better)
  - Easier to test individual modules
  - Clear separation of concerns
- **Examples of proper splitting**:
  - **API layer**: Split `services/api.js` → `api/` folder with:
    - `api/status.js` - status endpoints
    - `api/project.js` - project files
    - `api/codebase.js` - codebase analysis
    - `api/domain.js` - domain CRUD
    - `api/domain-documentation.js` - documentation endpoints
    - `api/domain-requirements.js` - requirements endpoints
    - `api/domain-bugs-security.js` - bugs & security endpoints
    - `api/domain-testing.js` - testing endpoints
    - `api/tasks.js` - task management
    - `api/index.js` - re-exports all modules

  - **Persistence layer**: Split `persistence/domains.js` → per-section modules:
    - `persistence/domain-documentation.js`
    - `persistence/domain-requirements.js`
    - `persistence/domain-testing.js`
    - `persistence/domain-bugs-security.js`

- **When to split a file**:
  - File exceeds ~200-300 lines
  - Multiple unrelated responsibilities
  - Different parts change for different reasons
  - Hard to find specific functionality
  - Multiple developers frequently edit the same file

- **Keep index files thin** - Only re-export, don't add logic

#### 10.1 **Component File Organization**

- **One component per file** - Each React component should have its own file
- **Component file naming**: Use PascalCase matching the component name (e.g., `TestCaseDetails.jsx`)
- **Shared components folder structure**:
  ```
  components/
    domain/
      testing/
        TestCaseDetails.jsx
        TestCaseInlineEditor.jsx
        ExistingTestsTable.jsx
        MissingTestsSection.jsx
        DomainTestingSection.jsx   # Main component
        index.js                    # Re-exports
  ```
- **Benefits of component separation**:
  - Easier to locate and modify specific components
  - Better code reusability
  - Clearer dependencies and imports
  - Easier to test individual components
  - Reduced file size (better IDE performance)
  - Follows single responsibility principle
- **When to split components from a file**:
  - File exceeds ~300-400 lines
  - Contains 2+ independent components
  - Component is reusable in other contexts
  - Component has complex logic that warrants isolation
- **Component co-location**: Keep related components in subdirectories (e.g., all testing-related components in `components/domain/refactoring-and-testing/`)
- **Index files**: Use `index.js` to re-export components for clean imports:
  ```javascript
  // components/domain/refactoring-and-testing/index.js
  export { default as DomainTestingSection } from "./DomainTestingSection";
  export { TestCaseDetails } from "./TestCaseDetails";
  export { TestCaseInlineEditor } from "./TestCaseInlineEditor";
  // ... etc
  ```

#### 10.2 **Documentation File Organization**

- **Don't place documentation in docs root** - Organize documentation files into appropriate subdirectories
- **Documentation folder structure**:
  ```
  docs/
    README.md                    # Only the main docs index in root
    frontend/                    # Frontend-specific docs
      architecture.md
      ai-chat-integration.md
    backend/                     # Backend-specific docs
      architecture.md
      api-endpoints.md
    guides/                      # How-to guides and tutorials
      TOKEN-MANAGEMENT.md
      DEPLOYMENT.md
    agents/                      # AI agent documentation
      AIDER.md
      LLM-AGENT.md
    examples/                    # Example configurations and use cases
      README.md
  ```
- **Benefits of organized documentation**:
  - Easy to find relevant documentation
  - Clear separation of concerns
  - Better maintenance and updates
  - Prevents docs root from becoming cluttered
  - Improves discoverability
- **Documentation placement guidelines**:
  - Frontend features → `docs/frontend/`
  - Backend features → `docs/backend/`
  - User guides → `docs/guides/`
  - Agent-specific → `docs/agents/`
  - Work in progress → `docs/in-progress/`
  - Examples and templates → `docs/examples/`
- **Don't create**: Large documentation files directly in `docs/` root (except README.md)

#### 10.3 **Avoid Raw Chakra Primitives in Large Components**

- **Never use low-level Chakra UI building blocks directly in large pages or complex components** — doing so leads to bloated, hard-to-read files that mix layout concerns with business logic
- **Extract repeated or visually distinct UI patterns into named components**, even if they are only used in one place (e.g., `BlockedTestCard`, `TestTableRow`, `SummaryCard`)
- **Rule of thumb**: if a JSX block inside a component exceeds ~20–30 lines and has a clear visual identity or responsibility, extract it into its own component file
- **Examples of what to extract**:
  - A card/badge/alert block that repeats across test types → `BlockedTestCard.jsx`
  - A table row with expand/collapse logic → `TestTableRow.jsx`
  - A section header with action buttons → `SectionHeader.jsx`
- **Benefits**:
  - Files stay under the ~300-line limit
  - Easier to reason about each visual unit in isolation
  - Primitive-heavy JSX is hidden behind descriptive component names, improving readability
  - Enables targeted changes without touching unrelated UI
- **Anti-pattern to avoid**:
  ```jsx
  // ❌ BAD: 800-line file with raw Chakra primitives copy-pasted 3x
  {test.blockedBy && (
    <Box borderWidth="1px" borderRadius="md" p={3} bg="orange.50" ...>
      <HStack justify="space-between" mb={2}>
        <HStack><Badge ...>🔒 BLOCKED</Badge>...</HStack>
        <Button ...>Unblock manually</Button>
      </HStack>
      ...
    </Box>
  )}
  ```
  ```jsx
  // ✅ GOOD: extracted into BlockedTestCard.jsx, used by name
  {
    test.blockedBy && <BlockedTestCard blockedBy={test.blockedBy} />;
  }
  ```

### 11. **Mock Data Workflow (When User Requests Mocking)**

- If the user asks for mock responses, prefer reading JSON files from `.code-analysis-example/` instead of hardcoding large inline objects in route handlers.
- Use the shared utility `backend/utils/mock-data.js` for mock loading and timing:
  - `readMockJson([...pathSegments])` for reading/parsing mock payloads
  - `sleep(milliseconds)` for optional artificial delay to simulate async analysis
- Keep route handlers thin:
  - Load mock data
  - Add runtime fields (for example `domainId`, `taskId`, `timestamp`, `analyzedFiles`)
  - Return response
- Reuse the same mock JSON for related endpoints when possible (for example GET section data and POST analyze preview), unless the user explicitly asks for different payloads.
- Keep mock file paths centralized and predictable under `.code-analysis-example` (for example `.code-analysis-example/domains/*.json`).
- Do not use browser-side mocks for backend API behavior unless the user explicitly requests frontend-only mocking.

### 12. **AI Task State — Real-Time Design Principles**

These rules apply to any feature where the UI triggers an AI task and needs to reflect its progress.

#### 12.1 **Always Reflect What the AI Is Doing**

- **The UI must visually communicate the current AI action**, not just show a generic spinner
- Show the live tool message emitted by the backend (e.g. _"Reading src/auth/login.ts"_, _"Editing src/auth/login.ts (lines 42–45)"_)
- Static text like "Loading…" or "AI is working…" is **not acceptable** when the backend provides real-time progress events
- Change the visual appearance of affected elements (e.g. blue background, border color change) to make it immediately obvious something is happening

  ```jsx
  // ❌ BAD: hardcoded static message
  <Text>AI is implementing the fix…</Text>

  // ✅ GOOD: live message from socket progress events
  <Text>{implementingEntry?.message || "AI is starting…"}</Text>
  ```

#### 12.2 **Socket-Driven State — Never REST-Poll After a Task**

- When a task completes, **update the store directly from the socket event payload** — do not call a REST endpoint to re-fetch data
- REST is for initial data load; sockets are for real-time updates
- The `TASK_COMPLETED` / `TASK_FAILED` events carry all the information needed (e.g. `params.findingId`, `params.domainId`) to update the store in-place

  ```javascript
  // ❌ BAD: re-fetching via REST after socket event
  socket.on(SOCKET_EVENTS.TASK_COMPLETED, async ({ type, domainId }) => {
    if (type === TASK_TYPES.IMPLEMENT_FIX) {
      await useDomainBugsSecurityStore.getState().fetch(domainId); // pointless round-trip
    }
  });

  // ✅ GOOD: update store in-place from socket payload
  socket.on(SOCKET_EVENTS.TASK_COMPLETED, ({ type, domainId, params }) => {
    if (type === TASK_TYPES.IMPLEMENT_FIX) {
      store.clearImplementingFix(params.findingId);
      store.updateFindingAction(domainId, params.findingId, "apply");
    }
  });
  ```

#### 12.3 **Track In-Flight Tasks With `taskId`, Not a Boolean/Set**

- Use a `Map<findingId, { taskId, message, stage }>` (or equivalent) — not a plain `Set<id>` or `boolean`
- The `taskId` is the correlation key that links incoming `TASK_PROGRESS` socket events to the correct UI element
- Without `taskId`, progress messages cannot be routed to the right item when multiple tasks run concurrently
- Capture `taskId` from the API response immediately after queuing the task:

  ```javascript
  const response = await api.implementFinding(domainId, findingId, true);
  const taskId = response.data?.task?.id ?? null;
  // store { taskId, message: null, stage: null } keyed by findingId
  ```

#### 12.4 **Never Clear AI Loading State in `finally`**

- Do **not** use a `try/finally` block to clear a loading indicator after the API call returns
- The API returns immediately after queuing the task — the AI is still running
- The loading state must remain active until the `TASK_COMPLETED` or `TASK_FAILED` socket event arrives
- Only clear on error **before** the task is queued (i.e. the API call itself failed):

  ```javascript
  // ❌ BAD: clears spinner as soon as the task is queued, not when it's done
  } finally {
    set((state) => { /* clear loading */ });
  }

  // ✅ GOOD: clear only on queue failure; socket handles the rest
  } catch (err) {
    clearLoadingState(); // task never started
    return { success: false };
  }
  // loading stays active — cleared by TASK_COMPLETED / TASK_FAILED
  ```

#### 12.5 **Persist AI-Driven Actions in Backend Post-Processing**

- When an AI task produces a side-effect that must be recorded (e.g. a fix being applied → `action: "apply"`), **write it inside `persistTaskRevision` in the task orchestrator**, not via a separate frontend API call
- This guarantees the action is always persisted exactly once, even if the client disconnects
- The frontend updates its own in-memory state from the socket event; the backend owns the durable record
