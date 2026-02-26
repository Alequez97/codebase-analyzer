# Backend Architecture

## Overview

The backend is a Node.js/Express service that orchestrates AI-driven analysis tasks and persists domain-oriented JSON outputs.

## Layers

### Persistence

- `backend/persistence/codebase-analysis.js`
- `backend/persistence/domains.js`
- `backend/persistence/tasks.js`
- `backend/persistence/logs.js`

### Orchestrators

- `backend/orchestrators/codebase-analysis.js`
- `backend/orchestrators/task.js`

### Agents

- `backend/agents/llm-api.js`
- `backend/agents/aider.js`

## Data Flow

1. Create task via API
2. Orchestrator stores task JSON
3. Agent executes analysis
4. Results written into `.code-analysis/analysis` and `.code-analysis/domains`
5. Logs written under `.code-analysis/logs`
6. Frontend consumes via REST + socket events

## Main Endpoints

- `GET /api/status`
- `GET /api/analysis/codebase`
- `GET /api/analysis/codebase/full`
- `POST /api/analysis/codebase/request`
- `GET /api/analysis/domain/:id`
- `GET /api/analysis/domain/:id/documentation`
- `GET /api/analysis/domain/:id/requirements`
- `GET /api/analysis/domain/:id/testing`
- `POST /api/analysis/domain/:id/analyze/documentation`
- `POST /api/analysis/domain/:id/analyze/requirements`
- `POST /api/analysis/domain/:id/analyze/testing`
- `GET /api/tasks/pending`
- `GET /api/tasks/:id/logs`
- `GET /api/logs/codebase-analysis`

## Storage Layout

- `.code-analysis/analysis/codebase-analysis.json`
- `.code-analysis/domains/{domainId}/documentation/content.md`
- `.code-analysis/domains/{domainId}/documentation/metadata.json`
- `.code-analysis/domains/{domainId}/requirements/content.json`
- `.code-analysis/domains/{domainId}/requirements/metadata.json`
- `.code-analysis/domains/{domainId}/testing/content.json`
- `.code-analysis/domains/{domainId}/testing/metadata.json`
- `.code-analysis/domains/{domainId}/bugs-security/content.json`
- `.code-analysis/domains/{domainId}/bugs-security/metadata.json`
- `.code-analysis/tasks/pending/*.json`
- `.code-analysis/tasks/completed/*.json`
- `.code-analysis/logs/*.log`

## Notes

The backend now uses domain terminology and domain persistence throughout.
