# Codebase Analyzer - Development Progress

## Project Overview

AI-powered codebase analysis tool with structured workflows and one-click actions.

**Key Principle:** Contract-first design with JSON schemas. Dashboard reads JSON files, analysis engine (Claude Code → later direct LLM) writes JSON files.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Dashboard (React + Chakra v3)           │
│  - Module grid view                             │
│  - Analysis detail view                         │
│  - One-click action buttons                     │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│         Express Backend                         │
│  - Serves analysis JSON files                   │
│  - Creates task files for Claude Code           │
│  - Watches for completed tasks                  │
│  - Applies fixes to codebase                    │
└──────────────────┬──────────────────────────────┘
                   │ File System
┌──────────────────▼──────────────────────────────┐
│      Analysis Output (JSON Files)              │
│  - codebase-analysis.json                            │
│  - modules/{module-id}.json                     │
│  - tasks/pending/*.json                         │
│  - tasks/completed/*.json                       │
└─────────────────────────────────────────────────┘
                   │ Claude Code reads/writes
┌──────────────────▼──────────────────────────────┐
│         Target Codebase                         │
│  (CLI runs in project root)                     │
└─────────────────────────────────────────────────┘
```

## Phase 1: MVP with Claude Code (Current)

### ✅ Completed

- [x] Project structure (separate tool, multi-codebase support)
- [x] Package.json files (root, client)
- [x] .env for developer-specific paths

### 🚧 In Progress

- [ ] JSON schemas/contracts definition
- [ ] PROGRESS.md planning document

### 📋 Planned - Backend

#### Core Structure

- [ ] `/server/index.js` - Express server setup
- [ ] `/server/config.js` - Load .env and configuration
- [ ] `/server/utils/file-watcher.js` - Watch analysis-output for changes

#### API Endpoints

- [ ] `GET /api/status` - Health check and configuration status
- [ ] `GET /api/analysis/codebase` - Get current codebase analysis results
- [ ] `POST /api/analysis/codebase/request` - Create pending codebase analysis task
- [ ] `GET /api/modules` - List all modules
- [ ] `GET /api/modules/:id` - Get module analysis
- [ ] `POST /api/modules/:id/analyze` - Create pending analysis task
- [ ] `POST /api/fix/:moduleId/:issueId` - Apply a specific fix
- [ ] `GET /api/tasks/pending` - List pending tasks (on startup recovery)
- [ ] `DELETE /api/tasks/:id` - Clear completed/cancelled task

#### Services

- [ ] `/server/services/AnalysisReader.js` - Read JSON files
- [ ] `/server/services/TaskManager.js` - Create/manage task files
- [ ] `/server/services/FixApplier.js` - Apply code fixes to codebase

### 📋 Planned - Frontend

#### Pages/Components

- [ ] `Dashboard.jsx` - Main view with module grid
- [ ] `ModuleCard.jsx` - Module overview card
- [ ] `ModuleAnalysis.jsx` - Detailed analysis view
- [ ] `IssueCard.jsx` - Bug/security issue with "Fix" button
- [ ] `TaskStatus.jsx` - Shows pending tasks, instructions

#### Features

- [ ] Auto-refresh when files change (polling or websocket)
- [ ] Click "Scan Codebase" → creates task → shows instructions
- [ ] Click "Analyze Module" → creates task → shows instructions
- [ ] Click "Fix" on issue → calls API → applies fix → shows diff
- [ ] File watcher notifications

### 📋 Planned - Prompt Templates

Templates that generate the JSON files:

- [ ] `/prompts/scan-codebase.md` - Generate scan-results.json
- [ ] `/prompts/analyze-module.md` - Generate modules/{id}.json
- [ ] `/prompts/generate-fix.md` - Generate fix for specific issue

### 📋 Planned - Example Data

For development without running Claude Code:

- [ ] `/examples/scan-results.example.json`
- [ ] `/examples/module-analysis.example.json`
- [ ] Instructions to copy examples for testing

## JSON Contracts

### `scan-results.json`

```javascript
{
  "timestamp": "ISO-8601",
  "modules": [
    {
      "id": "kebab-case-id",
      "name": "Display Name",
      "businessPurpose": "...",
      "files": ["path/to/file"],
      "priority": "P0|P1|P2",
      "testCoverage": "none|partial|full",
      "hasAnalysis": boolean
    }
  ]
}
```

### `modules/{module-id}.json`

```javascript
{
  "moduleId": "...",
  "moduleName": "...",
  "timestamp": "...",
  "requirements": [
    {
      "id": "REQ-XXX",
      "description": "...",
      "source": "...",
      "confidence": "HIGH|MEDIUM|LOW",
      "priority": "P0|P1|P2"
    }
  ],
  "bugs": [
    {
      "id": "BUG-XXX",
      "severity": "critical|high|medium|low",
      "type": "...",
      "location": { "file": "...", "line": 123 },
      "description": "...",
      "recommendation": "...",
      "fixable": boolean,  // Can we auto-fix?
      "fixId": "FIX-XXX"   // Reference to fix if generated
    }
  ],
  "securityIssues": [
    {
      "id": "SEC-XXX",
      "severity": "critical|high|medium|low",
      "category": "...",
      "location": { "file": "...", "line": 123 },
      "vulnerability": "...",
      "exploit": "...",
      "fixable": boolean,
      "fixId": "FIX-XXX"
    }
  ],
  "fixes": [
    {
      "id": "FIX-XXX",
      "targetIssue": "BUG-XXX or SEC-XXX",
      "file": "path/to/file",
      "description": "...",
      "oldCode": "...",
      "newCode": "...",
      "applied": boolean
    }
  ],
  "tests": [...],
  "documentation": {...}
}
```

### `tasks/pending/{task-id}.json`

```javascript
{
  "id": "unique-task-id",
  "type": "scan|analyze-module|generate-fix",
  "status": "pending",
  "createdAt": "...",
  "params": {
    // Type-specific params
    "moduleId": "..." // for analyze-module
  },
  "promptFile": "prompts/scan-codebase.md", // Which prompt to use
  "outputFile": "analysis-output/scan-results.json" // Where to write
}
```

## Workflow: Scan Codebase

1. User clicks "Scan Codebase" in dashboard
2. Frontend → `POST /api/scan/request`
3. Backend creates `tasks/pending/scan-{timestamp}.json`
4. Backend returns instructions: "Open prompts/scan-codebase.md in Claude Code"
5. File watcher detects `scan-results.json` created
6. Backend moves task to `tasks/completed/`
7. Frontend auto-refreshes → shows modules

## Workflow: Fix an Issue

1. User views module analysis, sees "SEC-001: Missing rate limiting"
2. Clicks "Fix" button
3. Frontend → `POST /api/fix/user-authentication/SEC-001`
4. Backend:
   - Reads module analysis JSON
   - Finds fix with `fixId` associated with SEC-001
   - Applies `newCode` to target file
   - Updates `applied: true` in JSON
   - Returns diff
5. Frontend shows success + diff

## Phase 2: Direct LLM Integration (Future)

- [ ] Swap Claude Code with direct Anthropic API
- [ ] Same JSON contracts, zero frontend changes
- [ ] Automated analysis (no manual steps)

## Phase 3: Open Source Release (Future)

- [ ] Clean up for public release
- [ ] Documentation
- [ ] Example projects
- [ ] npm package

## Notes

- CLI tool runs in project root directory (no CODEBASE_PATH env needed)
- Analysis output stored in `.code-analysis/` folder in target project
- Pending tasks checked on startup (crash recovery)
- All fixes are reversible (stored in JSON)
- Agents handle their own complexity (chunking, retries, token management)
- Production-ready code: no leftovers, no backward compatibility unless explicitly needed
