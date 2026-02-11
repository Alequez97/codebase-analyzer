# Frontend Architecture

## Overview

React-based dashboard that provides a visual interface for codebase analysis. Built with Vite, React 18, and Chakra UI v3.

## Key Features (Planned)

1. **Module Grid View**: Display discovered modules from scan
2. **Analysis Detail View**: Show detailed analysis for each module
3. **One-Click Actions**: Buttons to scan, analyze, and fix
4. **Real-Time Updates**: Auto-refresh when analysis completes
5. **Task Status**: Show pending tasks and execution status

## Technology Stack

- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Chakra UI v3**: Component library
- **Axios**: HTTP client
- **React Router**: Navigation

## Proposed Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ModuleCard.jsx      # Module overview card
│   │   ├── ModuleAnalysis.jsx  # Detailed analysis view
│   │   ├── IssueCard.jsx       # Bug/security issue display
│   │   ├── TaskStatus.jsx      # Pending tasks indicator
│   │   └── Header.jsx          # App header
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main view with module grid
│   │   └── ModuleDetail.jsx    # Individual module analysis
│   │
│   ├── services/
│   │   └── api.js              # Axios API wrapper
│   │
│   ├── hooks/
│   │   ├── usePolling.js       # Auto-refresh hook
│   │   └── useModules.js       # Module data hook
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── index.html
├── package.json
└── vite.config.js
```

## Data Flow

### Dashboard View
```
Dashboard Component
    ↓
useModules hook
    ↓
api.getModules()
    ↓
GET /api/modules
    ↓
Display module cards
```

### Scan Flow
```
User clicks "Scan Codebase"
    ↓
api.requestScan()
    ↓
POST /api/scan/request
    ↓
Show "Scanning..." indicator
    ↓
Poll GET /api/scan until data appears
    ↓
Refresh module list
```

### Analysis Flow
```
User clicks "Analyze" on module card
    ↓
api.analyzeModule(id, moduleName, files)
    ↓
POST /api/modules/:id/analyze
    ↓
Show "Analyzing..." indicator
    ↓
Poll GET /api/modules/:id until data appears
    ↓
Navigate to analysis view
```

## Component Design

### ModuleCard
- Props: `module` (id, name, businessPurpose, priority, hasAnalysis)
- Shows: Module name, business purpose, priority badge
- Actions: "Analyze" button (if no analysis), "View Analysis" button (if has analysis)

### ModuleAnalysis
- Props: `moduleId`
- Fetches: Module analysis data
- Shows: Requirements, bugs, security issues, proposed fixes
- Actions: "Fix" buttons for each issue

### IssueCard
- Props: `issue` (id, severity, description, fixable)
- Shows: Issue details, severity badge
- Actions: "Fix" button if fixable

### TaskStatus
- Polls: GET /api/tasks/pending
- Shows: Count of pending tasks, expandable list
- Updates: Every 2 seconds while tasks exist

## State Management

### Approach: React Hooks + Context (if needed)
- **Local state**: Component-specific UI state
- **Custom hooks**: Shared data fetching logic
- **Context**: Global state (if needed, e.g., auth, theme)

### Polling Strategy
```js
usePolling(fetchFn, interval, condition) {
  // Poll fetchFn every interval while condition is true
  // Stop polling when condition is false
  // Example: Poll scan results while no data exists
}
```

## API Service

```js
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export default {
  // Status
  getStatus: () => api.get('/status'),
  
  // Scan
  getScan: () => api.get('/scan'),
  requestScan: (executeNow = true) => api.post('/scan/request', { executeNow }),
  
  // Modules
  getModules: () => api.get('/modules'),
  getModule: (id) => api.get(`/modules/${id}`),
  analyzeModule: (id, moduleName, files, executeNow = true) => 
    api.post(`/modules/${id}/analyze`, { moduleName, files, executeNow }),
  
  // Tasks
  getPendingTasks: () => api.get('/tasks/pending'),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  
  // Fixes (future)
  applyFix: (moduleId, issueId) => api.post(`/fix/${moduleId}/${issueId}`),
};
```

## UI/UX Considerations

### Auto-Refresh
- Poll for updates every 3-5 seconds while tasks pending
- Stop polling when no pending tasks
- Show visual indicator when polling

### Error Handling
- Toast notifications for errors
- Retry buttons for failed requests
- Clear error messages

### Loading States
- Skeleton loaders for initial load
- Spinners for actions
- Disable buttons during processing

### Visual Priority
- Color-coded priority badges (P0=red, P1=orange, P2=yellow)
- Severity indicators for issues (critical, high, medium, low)
- Test coverage indicators

## Chakra UI Theme

```js
// Customize Chakra theme
const theme = extendTheme({
  colors: {
    brand: {
      50: '#e3f2fd',
      // ... brand colors
    },
  },
  components: {
    Card: {
      // Custom card styles
    },
  },
});
```

## Future Enhancements

### WebSocket for Real-Time Updates
- Replace polling with WebSocket connection
- Server pushes updates when files change
- More efficient than polling

### Diff Viewer
- Show code diffs before applying fixes
- Syntax highlighting
- Side-by-side comparison

### Filtering and Search
- Filter modules by priority, test coverage
- Search modules by name or files
- Filter issues by severity, type

### Export Functionality
- Export analysis reports to PDF/HTML
- Generate summary dashboards
- Share analysis results

## Development Workflow

1. Start backend: `npm run server` (port 3001)
2. Start frontend: `npm run client` (port 3000)
3. Or both: `npm run dev`

## Build and Deploy

```bash
# Build for production
cd frontend
npm run build

# Serve static files
# Backend can serve built files from frontend/dist
```
