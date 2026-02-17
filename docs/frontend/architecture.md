# Frontend Architecture

## Overview

React dashboard for domain-based codebase analysis.

## Current UX Model

1. Show discovered domains from codebase analysis
2. Open domain details page
3. Analyze domain sections independently:
   - Documentation
   - Requirements
   - Testing
4. View real-time and persisted logs

## Key Pages and Components

- `frontend/src/pages/Dashboard.jsx`: Codebase overview and domain list
- `frontend/src/components/dashboard/ModulesSection.jsx`: Domain cards list (component name is legacy)
- `frontend/src/pages/DomainDetailsPage.jsx`: Domain-level analysis page
- `frontend/src/components/domain/DomainDocumentationSection.jsx`
- `frontend/src/components/domain/DomainRequirementsSection.jsx`
- `frontend/src/components/domain/DomainTestingSection.jsx`
- `frontend/src/components/dashboard/TaskLogs.jsx`

## State Management

- Zustand stores by domain area:
  - `useAnalysisStore`
  - `useDomainEditorStore`
  - `useLogsStore`
  - `useSocketStore`
- Persisted state uses `sessionStorage`

## API Integration

Primary endpoints used by frontend:

- `GET /api/analysis/codebase/full`
- `POST /api/analysis/codebase/request`
- `GET /api/analysis/domain/:id/documentation`
- `GET /api/analysis/domain/:id/requirements`
- `GET /api/analysis/domain/:id/testing`
- `POST /api/analysis/domain/:id/analyze/documentation`
- `POST /api/analysis/domain/:id/analyze/requirements`
- `POST /api/analysis/domain/:id/analyze/testing`
- `GET /api/tasks/pending`
- `GET /api/tasks/:id/logs`
- `GET /api/logs/codebase-analysis`

## Real-Time Updates

Socket events are handled centrally in `useSocketStore`, then forwarded to business stores.

## Notes

Some component filenames still use legacy "module" naming (`ModulesSection.jsx`). Behavior and data model are domain-based.
