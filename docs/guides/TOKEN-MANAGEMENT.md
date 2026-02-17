# Token Management Strategy

## Overview

Codebase Analyzer delegates token management to AI agents. The backend does not chunk or count tokens.

## How It Works

### Aider (Current Agent)

Aider has built-in repository map support for large codebases:

```bash
aider --map-refresh auto --map-tokens 1024
```

This allows Aider to:

- Understand repository structure without loading every file
- Load only relevant files into LLM context
- Work incrementally on large domains
- Switch context across files as needed

### Backend Responsibility

The backend is intentionally simple:

```javascript
// Pass domain files to Aider/agent and orchestrate the task
POST /api/analysis/domain/:id/analyze/documentation
{
  "files": ["file1.js", "file2.js"],
  "executeNow": true
}
```

Backend does NOT:

- Count tokens
- Chunk files
- Manage context windows
- Split analysis into token phases

Backend DOES:

- Orchestrate tasks
- Pass instructions to agents
- Collect structured results
- Serve JSON to frontend

### Agent Responsibility

The AI agent handles:

- Token counting
- Context management
- File prioritization
- Incremental analysis
- Repository mapping

## What If a Domain Is Very Large?

If a domain is genuinely too large:

1. Agent works incrementally
2. Instructions prioritize critical files first
3. Domain can be split into smaller logical domains
4. Different agents can use different token strategies

## Summary

Token management belongs to the agent layer. Keeping backend orchestration simple keeps the system maintainable.
