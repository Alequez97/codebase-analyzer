# Token Management Strategy

## Overview

The Codebase Analyzer handles token limits by **delegating complexity to AI agents**. We don't manage tokens in the backend - that's the agent's job.

## How It Works

### Aider (Current Agent)

Aider has built-in repository map technology that handles large codebases:

```bash
aider --map-refresh auto --map-tokens 1024
```

This allows Aider to:

- Understand entire codebase structure without loading all files
- Load only relevant files into LLM context
- Work incrementally on large modules
- Switch between files as needed

### Backend Responsibility

The backend is **intentionally simple**:

```javascript
// Just pass files to Aider - it handles the rest
POST /api/modules/:id/analyze
{
  "files": ["file1.js", "file2.js", ...],  // All files
  "moduleName": "User Auth"
}
```

Backend does NOT:

- ❌ Count tokens
- ❌ Chunk files
- ❌ Manage context windows
- ❌ Split analysis into phases

Backend DOES:

- ✅ Orchestrate tasks
- ✅ Pass instructions to agent
- ✅ Collect results
- ✅ Serve JSON to frontend

### Agent Responsibility

The AI agent (Aider) handles ALL complexity:

- ✅ Token counting
- ✅ Context management
- ✅ File prioritization
- ✅ Incremental work
- ✅ Repository mapping

## Configuration

### Aider Settings (backend/.env)

```env
# Aider handles token limits automatically
# These defaults work for most codebases:
LLM_MODEL=deepseek
AGENT_EXTRA_ARGS=

# Aider uses repository map with 1024 tokens by default
# No need to configure token limits manually
```

### Analysis Instructions

The markdown instructions tell Aider how to handle large modules:

```markdown
## Handling Large Modules

If you encounter token limits:

1. Focus on the most critical files first
2. Use your repository map knowledge to understand context
3. Analyze high-risk areas (auth, data handling, external inputs)
4. You can work incrementally - analyze critical files, output results, then continue
5. Prioritize security issues > bugs > code quality
```

## Why This Approach?

### ✅ Benefits

1. **Simple Backend**: No complex chunking logic
2. **Agent Flexibility**: Different agents can handle tokens differently
3. **No Maintenance**: Aider updates its token management automatically
4. **Better Results**: Agent knows best how to use its context window
5. **Production Ready**: No experimental code, no leftovers

### ❌ What We Don't Do

We don't try to be smarter than the AI agent:

- Don't pre-chunk files (agent knows better)
- Don't count tokens ourselves (agent has accurate counts)
- Don't manage phases manually (agent can do it)
- Don't keep backward compatibility with removed features

## What If Aider Fails?

If a module is genuinely too large:

1. **Aider will work incrementally** - analyze part, save results, continue
2. **Instructions guide prioritization** - critical files first
3. **User can split module** - break into smaller logical pieces
4. **Future agents may handle differently** - we don't lock into one approach

## Migration Notes

Previously we had:

- ❌ `token-counter.js` - Removed
- ❌ `file-summarizer.js` - Removed
- ❌ `smart-analysis.js` - Removed
- ❌ Phase 1/Phase 2 endpoints - Removed
- ❌ Token config in .env - Removed

Now we have:

- ✅ One `/analyze` endpoint
- ✅ Aider manages its own context
- ✅ Simple, clean code

## Summary

**Token management = Agent's responsibility**

The backend doesn't know or care about token limits. That's what makes the architecture simple and maintainable.
