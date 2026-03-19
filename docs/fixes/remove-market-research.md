# Remove Market Research Product References

## Overview

The codebase contains references to a "market research" feature that was never fully implemented in the source code. These references exist only in:

- Planning/documentation files
- Generated analysis data (`.code-analysis/` directory)
- Backend temp files
- An empty data directory

## Status

✅ **Good news**: No actual source code implementation exists. The market research feature was never built into the application code (no routes, no persistence layer, no frontend components, no tasks).

## Files/Directories to Remove

### 1. Empty Data Directory

**Location**: `backend/data/market-research/`  
**Status**: Empty folder  
**Action**: Delete the directory

### 2. Planning Documentation

**Location**: `.code-analysis/tasks/market-research-orchestration.md`  
**Description**: Planning document describing how market research feature would work  
**Action**: Delete the file

### 3. Generated Analysis Data

**Location**: `.code-analysis/market-research/`  
**Description**: Contains generated task data and competitor analysis from test runs  
**Subdirectories**:

- `.code-analysis/market-research/06784324-1e8f-4a06-b42b-a2c4b8be8ac0/`
- `.code-analysis/market-research/0ba26941-57df-4457-b8ff-2b984c6d4c3b/`
- `.code-analysis/market-research/54eaa88f-a207-443a-b788-f60f4f9f62a3/`
- `.code-analysis/market-research/e863a26c-bc85-46c3-9394-a4f988673a97/`
- `.code-analysis/market-research/eafe9dbe-6a9f-43cd-8ce5-6abda201e375/`

**Action**: Delete the entire directory and all subdirectories

### 4. Completed Task Files

**Location**: `.code-analysis/tasks/completed/market-research-*.json`  
**Examples**:

- `market-research-competitor-20260315T203209-b462f8.json`
- `market-research-competitor-20260315T203235-*.json`
- And many more...

**Action**: Delete all files matching pattern `market-research-*.json`

### 5. Backend Temp System Instructions

**Location**: `backend/temp/system-instructions/market-research-*.md`  
**Description**: Generated system instructions for market research tasks  
**Examples**:

- `market-research-initial-*.md`
- `market-research-competitor-*.md`
- `market-research-summary-*.md`

**Action**: Delete all files matching pattern `market-research-*.md`

## What Does NOT Need to be Changed

The following do NOT contain any market research references and require no changes:

✅ **Backend Source Code**:

- `backend/routes/` - No market research routes
- `backend/persistence/` - No market research persistence layer
- `backend/constants/` - No market research constants
- `backend/tasks/` - No market research task handlers
- `backend/orchestrators/` - No market research orchestration
- `backend/system-instructions/` - No market research instructions

✅ **Frontend Source Code**:

- `frontend/src/` - No market research components, stores, or services

✅ **Configuration Files**:

- Package.json files
- Config files
- Environment files

## Cleanup Commands

### Windows PowerShell

```powershell
# Remove empty data directory
Remove-Item -Path "backend\data\market-research" -Recurse -Force

# Remove planning documentation
Remove-Item -Path ".code-analysis\tasks\market-research-orchestration.md" -Force

# Remove generated analysis data
Remove-Item -Path ".code-analysis\market-research" -Recurse -Force

# Remove completed task files
Remove-Item -Path ".code-analysis\tasks\completed\market-research-*.json" -Force

# Remove temp system instructions
Remove-Item -Path "backend\temp\system-instructions\market-research-*.md" -Force
```

### Linux/macOS

```bash
# Remove empty data directory
rm -rf backend/data/market-research

# Remove planning documentation
rm -f .code-analysis/tasks/market-research-orchestration.md

# Remove generated analysis data
rm -rf .code-analysis/market-research

# Remove completed task files
rm -f .code-analysis/tasks/completed/market-research-*.json

# Remove temp system instructions
rm -f backend/temp/system-instructions/market-research-*.md
```

## Verification

After cleanup, verify no references remain:

```powershell
# Search for any remaining references
git grep -i "market-research" --or --name-only
git grep -i "marketResearch" --or --name-only
git grep -i "Market Research" --or --name-only
```

Expected result: No matches in source code or committed files (only potentially in .gitignore or documentation about this cleanup).

## Risk Assessment

**Risk Level**: ⚠️ **VERY LOW**

- No source code changes required
- Only removing generated data and planning docs
- No database migrations needed
- No API changes
- No breaking changes to existing functionality

## Timeline

**Estimated Time**: 5 minutes

This is a simple file/directory deletion task with no code changes required.

## Notes

The market research feature appears to have been planned but never implemented. All references are either:

1. Planning documents describing the intended feature
2. Test data generated during development/testing
3. Temporary files from agent task execution

The actual codebase (routes, components, stores, etc.) contains **zero** market research references.
