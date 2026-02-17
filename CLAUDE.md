# Claude Code Instructions

## Project Context

This is the **Codebase Analyzer** - an AI-powered code auditing tool with a web dashboard.

## CRITICAL: Read This First

**Before starting any work, you MUST read the AGENTS.md file:**

```
READ: AGENTS.md
```

The AGENTS.md file contains:
- Project architecture and design principles
- Development guidelines and best practices
- State management patterns (Zustand stores)
- Code quality standards
- Logging conventions
- Storage requirements (sessionStorage only)

## Quick Reference

### Tech Stack
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: React + Vite + Zustand
- **AI Agents**: Aider (current), LLM API (Claude/OpenAI/DeepSeek)

### Key Directories
```
backend/
  agents/          # AI agent implementations (aider, llm-api)
  llm/            # LLM client wrappers and tools
  utils/          # Centralized logger, file scanner, etc.
  persistence/    # File-based data storage
frontend/
  src/
    store/        # Zustand stores (use sessionStorage!)
    components/   # React components
    services/     # API client
```

### Important Rules

1. **Always use the centralized logger** (`backend/utils/logger.js`)
   - Never use `console.log` directly
   - Use appropriate log levels: `debug`, `info`, `warn`, `error`

2. **State Management**
   - Use Zustand stores for shared state and business logic
   - Use React useState only for local UI state
   - **CRITICAL**: Always use `storage: () => sessionStorage` for Zustand persist

3. **Production-Ready Code**
   - No legacy code or backward compatibility unless needed
   - Clean implementation without leftovers
   - Remove unused features immediately
   - Code should be ready to ship at any moment

4. **Error Handling**
   - Never use nested try-catch blocks for control flow
   - Use loops with early returns instead

5. **Configuration**
   - Avoid hardcoded fallback defaults in user-facing behavior
   - Runtime config should be authoritative

## Before Making Changes

1. Read AGENTS.md to understand the full context
2. Check existing patterns in the codebase
3. Follow the established conventions
4. Ensure changes align with design principles

## Common Tasks

### Adding a New Zustand Store
```javascript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useMyStore = create(
  persist(
    (set, get) => ({
      // State
      data: null,

      // Actions
      setData: (data) => set({ data }),
    }),
    {
      name: "my-store",
      storage: () => sessionStorage, // CRITICAL: Use sessionStorage!
      partialize: (state) => ({
        data: state.data, // Only persist what's needed
      }),
    },
  ),
);
```

### Using the Logger
```javascript
import * as logger from "../utils/logger.js";

logger.info("Something happened", {
  component: "MyComponent",
  additionalData: value
});

logger.error("Error occurred", {
  error: error.message,
  stack: error.stack,
  component: "MyComponent"
});
```

### Making API Calls
- Backend: Check existing patterns in `backend/agents/` and `backend/persistence/`
- Frontend: Use the centralized API service at `frontend/src/services/api.js`

## Getting Help

If unclear about project conventions or architecture:
1. First, check AGENTS.md
2. Search for similar patterns in the codebase
3. Ask for clarification if needed

---

**Remember: AGENTS.md is your guide. Read it before starting work!**
