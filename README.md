# Codebase Analyzer

AI-powered codebase analysis tool with structured workflows and one-click fix actions.

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm run install

# Create backend .env file
cd backend
cp .env.example .env

# Edit backend/.env and set your codebase paths
# CODEBASE_PATH_AVIA_MANAGER=C:\_projects\jfs\avia-manager

# Create frontend .env file (optional, defaults are fine)
cd ../frontend
cp .env.example .env
```

### 2. Install Aider (Required)

```bash
# Install Aider via pip
pip install aider-chat

# Verify installation
aider --version
```

For detailed Aider configuration (models, API keys, etc.), see **[docs/AIDER.md](docs/AIDER.md)**.

### 3. Run

```bash
npm run dev
```

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001

## How It Works

### Architecture

```
Dashboard (React) → Express API → JSON Files ← Claude Code
                                      ↓
                              Target Codebase
```

### Workflow: Analyze Full Codebase

1. Click "Analyze Codebase" button in dashboard
2. Creates `analysis-output/tasks/pending/analyze-codebase-{id}.json`
3. Dashboard shows: "Open `prompts/analyze-full-codebase.md` in Claude Code"
4. Run prompt in Claude Code → creates `analysis-output/codebase-analysis.json`
5. Dashboard auto-refreshes → shows discovered modules

### Workflow: Analyze Module

1. Click "Analyze" on a module card
2. Creates pending task
3. Run corresponding prompt in Claude Code
4. Creates `analysis-output/modules/{module-id}.json` with:
   - Requirements (REQ-001, REQ-002...)
   - Bugs (BUG-001, BUG-002...)
   - Security Issues (SEC-001, SEC-002...)
   - Proposed Fixes (FIX-001, FIX-002...)
   - Test recommendations
   - Documentation

### Workflow: Fix an Issue

1. View module analysis → see "SEC-001: Missing rate limiting"
2. Click "Fix" button
3. Backend applies the fix from JSON to your codebase
4. Shows diff of changes
5. Fix is marked `applied: true` in JSON

## JSON Contracts

All data exchange is via JSON files. See `/schemas/*.example.json` for structure.

### Key Files

- `codebase-analysis.json` - List of discovered modules
- `modules/{id}.json` - Detailed analysis per module
- `tasks/pending/{id}.json` - Tasks waiting to be processed
- `tasks/completed/{id}.json` - Completed tasks log

## Development Status

See [PROGRESS.md](./PROGRESS.md) for detailed roadmap.

**Current Phase:** MVP with Claude Code integration

## Configuration

### Environment Variables

See `backend/.env.example` for all available options.

**Required:**

```env
CODEBASE_PATH_AVIA_MANAGER=C:\_projects\jfs\avia-manager
```

**Aider Configuration:**

```env
LLM_MODEL=deepseek
DEEPSEEK_API_KEY=your-key-here
```

For detailed Aider setup (switching models, API keys, etc.), see **[docs/AIDER.md](docs/AIDER.md)**.

Each developer sets their own paths and API keys - not stored in version control.

## Documentation

- **[docs/AIDER.md](docs/AIDER.md)** - Aider configuration guide (models, API keys)
- **[docs/backend/architecture.md](docs/backend/architecture.md)** - Backend architecture
- **[docs/frontend/architecture.md](docs/frontend/architecture.md)** - Frontend architecture

## Future Phases

- **Phase 1 (Current):** Manual workflow with Claude Code
- **Phase 2:** Direct LLM API integration (automated)
- **Phase 3:** Open source package release

## Tech Stack

- **Frontend:** React, Chakra UI v3, Vite
- **Backend:** Node.js, Express
- **Analysis:** Claude Code (manual) → Anthropic API (future)
