# Backend Architecture

## Overview

The backend is a Node.js Express server that orchestrates AI-powered codebase analysis through external tools (primarily Aider). It uses a file-based architecture with JSON as the contract between components.

## Design Principles

1. **Separation of Concerns**: Clear separation between data persistence, business logic, and external integrations
2. **Contract-First**: JSON schemas define all data structures
3. **Agent Flexibility**: Support for multiple AI tools (Aider, Claude Code, Gemini, etc.)
4. **Simple & Debuggable**: File-based storage, no database required

## Directory Structure

```
backend/
├── agents/              # AI tool integrations
│   ├── aider.js        # Aider CLI integration (detect, execute)
│   └── index.js        # Agent selector and task executor
│
├── orchestrators/       # Business logic coordination
│   ├── codebase-analysis.js         # Codebase analysis workflow (enriches data, coordinates)
│   └── task.js         # Task lifecycle management
│
├── persistence/         # Data access layer (read/write JSON)
│   ├── codebase-analysis.js         # Codebase analysis results persistence
│   ├── modules.js      # Module analyses persistence
│   └── tasks.js        # Task files persistence
│
├── instructions/        # Markdown prompt templates for AI tools
│   ├── analyze-full-codebase.md
│   └── analyze-module.md
│
├── schemas/            # JSON schema definitions and examples
│
├── config.js           # Configuration and environment validation
└── index.js            # Express server and API routes
```

## Data Flow

### Codebase Analysis Workflow

```
User clicks "Analyze" → Frontend → POST /api/analysis/codebase/request
                                      ↓
                          Task Orchestrator creates task
                                      ↓
                          Agent executes Aider with instructions
                                      ↓
                          Aider writes codebase-analysis.json
                                      ↓
                          Frontend polls GET /api/analysis/codebase
                                      ↓
                          Codebase Analysis Orchestrator enriches data
                                      ↓
                          Frontend displays modules
```

### Analysis Workflow

```
User clicks "Analyze Module" → POST /api/modules/:id/analyze
                                      ↓
                          Task Orchestrator creates analysis task
                                      ↓
                          Agent executes Aider with module files
                                      ↓
                          Aider writes modules/{id}.json
                                      ↓
                          Frontend displays analysis results
```

## Layer Responsibilities

### Persistence Layer

- **Pure I/O operations**: Read and write JSON files
- **No business logic**: Just data access
- **Error handling**: Returns null for missing files, throws on actual errors

### Orchestrators Layer

- **Business logic**: Coordinates multiple operations
- **Data enrichment**: Adds computed fields (e.g., hasAnalysis flag)
- **Calls persistence**: Uses persistence layer for data access
- **Calls agents**: Triggers AI tool execution

### Agents Layer

- **Tool detection**: Check if AI tool is installed
- **Execution**: Run AI tool with instructions
- **Abstraction**: Uniform interface for different tools

## Configuration

### Environment Variables

- `CODEBASE_PATH`: Path to codebase being analyzed (required)
- `ANALYSIS_TOOL`: AI tool to use (aider, claude-code, gemini, etc.)
- `PORT`: Server port (default: 3001)

### Agent Selection

1. If `ANALYSIS_TOOL` is set, use that specific tool
2. Otherwise, auto-detect available tools
3. Fail if no tools are available

## API Design

All endpoints follow REST conventions:

- `GET /api/status`: Health check + available agents
- `GET /api/analysis/codebase`: Get codebase analysis results
- `POST /api/analysis/codebase/request`: Create codebase analysis task
- `GET /api/modules`: List modules
- `GET /api/modules/:id`: Get module analysis
- `POST /api/modules/:id/analyze`: Create analysis task
- `GET /api/tasks/pending`: List pending tasks
- `DELETE /api/tasks/:id`: Delete task

### Request Body Options

- `executeNow`: (boolean, default: true) Execute task immediately vs just create

## Future Considerations

### File Watching

- Add file watcher on analysis-output folder
- Notify frontend via WebSocket when files change
- Alternative: Frontend polling (simpler, current approach)

### Fix Application

- Most complex feature (not yet implemented)
- Apply code diffs from analysis to target codebase
- **Safety concerns**:
  - Require git repository?
  - Create backups before applying?
  - Dry-run mode?
  - Show diffs before applying?

### Agent Enhancements

- Add more agents (Claude Code, Gemini, Codex)
- Support streaming responses
- Handle long-running tasks better
- Task progress reporting

### Error Handling

- More specific error codes
- Better error messages for frontend
- Error logging/monitoring
- Retry mechanism for failed tasks

## Technical Decisions

### Why File-Based Storage?

- **Simple**: No database setup/maintenance
- **Debuggable**: Inspect files directly
- **Portable**: Works across systems
- **Fast**: Good for small/medium datasets
- **Cons**: Not suitable for high concurrency or large scale

### Why Separate Instructions Files?

- **Reusable**: Same instructions for different tasks
- **Editable**: Modify prompts without code changes
- **Versionable**: Track prompt changes in git
- **Tool-agnostic**: Works with any AI tool that accepts file input

### Why Plain Functions vs Classes?

- **Simpler**: No need for instance management
- **Stateless**: Each function is independent
- **Easier to test**: Pure functions are easier to test
- **Node.js style**: Aligns with module.exports pattern
