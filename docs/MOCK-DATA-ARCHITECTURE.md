# Mock Data Architecture

## Overview

The codebase analyzer now has a **production-ready architecture** where all mock data is served from the backend, making it trivial to switch between development (mock) and production (real LLM) modes.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React)                      │
│  ✓ No mock data imports                         │
│  ✓ Only consumes backend APIs                   │
│  ✓ Proper error handling everywhere             │
│  ✓ Loading states for all async operations      │
└────────────────┬────────────────────────────────┘
                 │ HTTP + WebSocket
┌────────────────▼────────────────────────────────┐
│           Backend (Express)                     │
│  ✓ Single toggle: USE_MOCK_DATA flag            │
│  ✓ Mock service for development                 │
│  ✓ Real LLM integration for production          │
│  ✓ Same API contracts for both modes            │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
┌──────▼──────┐    ┌────────▼────────┐
│  Mock Data  │    │  Real LLM       │
│  Service    │    │  Integration    │
│  (Dev)      │    │  (Production)   │
└─────────────┘    └─────────────────┘
```

## Quick Start

### Development Mode (Frontend Testing)

**No API keys needed!**

```bash
# backend/.env
USE_MOCK_DATA=true
```

```bash
# Start backend
cd backend
npm install
npm start

# Start frontend in another terminal
cd frontend
npm install
npm run dev
```

✅ Mock data served instantly  
✅ Real-time WebSocket events simulated  
✅ Full UI testing without LLM costs

### Production Mode (Real Analysis)

```bash
# backend/.env
USE_MOCK_DATA=false
ANTHROPIC_API_KEY=your_key_here
# or DEEPSEEK_API_KEY, OPENAI_API_KEY, etc.
```

```bash
# Start as usual
npm start
```

✅ Real LLM analysis  
✅ Same APIs, same UI  
✅ Just flip one flag!

## What Changed

### Backend

1. **New Mock Service** ([backend/services/mock-data.js](backend/services/mock-data.js))
   - Centralized mock data
   - Exports functions: `getMockCodebaseAnalysis()`, `getMockDomainAnalysis(id)`
   - Simulates async delays with `simulateAnalysisDelay(ms)`

2. **Config Flag** ([backend/config.js](backend/config.js))
   - Added `useMockData` boolean from `USE_MOCK_DATA` env var
   - Exposed in `/api/status` endpoint
   - Displayed in startup logs

3. **API Endpoints** ([backend/index.js](backend/index.js))
   - `GET /api/analysis/codebase` - Returns mock or real data
   - `GET /api/analysis/domain/:id` - Returns mock or real domain data
   - `POST /api/analysis/codebase/request` - Simulates task creation in mock mode
   - `POST /api/analysis/domain/:id/analyze` - Simulates domain analysis in mock mode
   - All endpoints emit WebSocket events in mock mode (after delay)

### Frontend

1. **Removed Mock Data Imports**
   - Deleted all `import { mockData } from "mockData"` references
   - Store ([frontend/src/store/useAppStore.js](frontend/src/store/useAppStore.js)) now only calls APIs
   - No client-side mock fallbacks

2. **Improved Error Handling**
   - All API calls have proper try-catch
   - Error messages from backend responses
   - Loading states for all async operations
   - 404 errors don't trigger error state (expected for empty analysis)

3. **Mock Mode Indicator**
   - StatusBar shows "MOCK DATA" badge when backend uses mocks
   - Fetched from `/api/status` endpoint

## File Changes

### New Files

- ✅ `backend/services/mock-data.js` - Mock data service

### Modified Files

- ✅ `backend/config.js` - Added `useMockData` flag
- ✅ `backend/index.js` - Mock mode support in all analysis endpoints
- ✅ `backend/.env.example` - Documented `USE_MOCK_DATA` flag
- ✅ `frontend/src/store/useAppStore.js` - Removed mock fallbacks, improved error handling
- ✅ `frontend/src/components/dashboard/StatusBar.jsx` - Shows mock mode indicator
- ✅ `frontend/src/pages/Dashboard.jsx` - Passes status to StatusBar

## API Contract (Mock vs Production)

All endpoints return **identical JSON structures** in both modes:

### GET /api/analysis/codebase

```json
{
  "timestamp": "2026-02-16T...",
  "summary": "Platform description...",
  "domains": [...]
}
```

### GET /api/analysis/domain/:id

```json
{
  "domainId": "aircraft-turnaround",
  "domainName": "Aircraft Turnaround",
  "timestamp": "2026-02-16T...",
  "documentation": {...},
  "requirements": [...],
  "testing": {...},
  "tests": [...]
}
```

### POST /api/analysis/codebase/request

Returns task object immediately, emits `CODEBASE_ANALYSIS_COMPLETED` via WebSocket after delay (mock) or completion (production).

## How Mock Mode Works

### Request Flow

```javascript
// User clicks "Analyze Codebase"
POST /api/analysis/codebase/request

// Backend checks config
if (config.useMockData) {
  // 1. Return mock task immediately
  return { id: 'mock-task-123', status: 'pending' }

  // 2. Simulate async execution (2 seconds)
  setTimeout(() => {
    // 3. Emit completion event
    io.emit('CODEBASE_ANALYSIS_COMPLETED', { taskId: '...' })
  }, 2000)
} else {
  // Real LLM execution
  executeAiderTask(...)
}

// Frontend socket listener updates UI
socket.on('CODEBASE_ANALYSIS_COMPLETED', () => {
  fetchCodebaseAnalysis() // Fetches mock or real data
})
```

## Benefits

### ✅ Development

- **Fast iteration** - No LLM wait times
- **No API costs** - Mock data is free
- **Consistent data** - Same mocks every time
- **Full testing** - Test all UI states

### ✅ Production

- **One flag switch** - `USE_MOCK_DATA=false`
- **Same codebase** - No separate branches
- **Same APIs** - Frontend doesn't change
- **Easy debugging** - Toggle mock mode to isolate issues

### ✅ Deployment

- **Backend controls mode** - Frontend doesn't care
- **Environment-specific** - Dev uses mocks, prod uses LLMs
- **No code changes** - Just `.env` configuration
- **Clear indication** - UI shows mock mode badge

## Testing the Implementation

### 1. Test Mock Mode

```bash
# backend/.env
USE_MOCK_DATA=true

# Start backend
npm start

# Should see:
# Mode: MOCK DATA
# ⚠️  MOCK MODE ENABLED - Using sample data instead of real analysis
```

Open frontend → Should see "MOCK DATA" badge in StatusBar  
Click "Analyze Codebase" → Should see mock domains after 2 seconds

### 2. Test Production Mode

```bash
# backend/.env
USE_MOCK_DATA=false
ANTHROPIC_API_KEY=sk-ant-...

# Start backend
npm start

# Should see:
# Mode: PRODUCTION
```

No "MOCK DATA" badge → Real LLM execution

## Future Enhancements

- [ ] Add more mock scenarios (error states, partial data)
- [ ] Mock data configuration via API (dynamic mocks)
- [ ] Record/replay real LLM responses for testing
- [ ] A/B testing mock vs real side-by-side

## Migration Guide (For Existing Deployments)

If you have an existing deployment:

1. **Update backend env**

   ```bash
   echo "USE_MOCK_DATA=false" >> backend/.env
   ```

2. **No code changes needed** - Everything is backward compatible

3. **Restart backend** - New flag takes effect

4. **Verify** - Check logs for "Mode: PRODUCTION"

## Conclusion

This architecture gives you:

- ✅ **Clean separation** between dev and prod data
- ✅ **Easy switching** via environment variable
- ✅ **Production-ready** error handling
- ✅ **Consistent contracts** across modes
- ✅ **Better DX** - Fast frontend development without LLM setup

**The frontend doesn't know or care if data is mocked - it just calls APIs and renders results.**
