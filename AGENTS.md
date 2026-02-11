# Codebase Analyzer - AI-Powered Code Auditing Tool

## Purpose

**Codebase Analyzer** is a web-based tool that leverages AI agents (like Aider) to automatically audit your codebase, find bugs, identify missing tests, detect security vulnerabilities, and help you apply fixes with minimal manual effort.

## The Problem We Solve

Manual code review is time-consuming and error-prone:

- ❌ Finding all bugs requires deep analysis of every file
- ❌ Identifying missing test coverage is tedious
- ❌ Security vulnerabilities often go unnoticed
- ❌ Applying fixes across multiple files is repetitive
- ❌ Understanding legacy code takes forever

## Our Solution

A **beautiful web interface** where you can:

1. **Scan your codebase** - AI analyzes your project structure
2. **View modules** - See organized breakdown of your code
3. **Review findings** - Browse bugs, security issues, missing tests
4. **Apply fixes** - One-click to apply AI-generated fixes
5. **Track progress** - See what's been fixed and what's pending

### The Flow (Minimal User Actions)

```
┌─────────────────────────────────────────────────┐
│  1. Run CLI in your project root               │
│     $ code-analyze                              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  2. Open web dashboard                          │
│     http://localhost:5173                       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  3. Click "Scan Codebase"                       │
│     AI analyzes your entire project             │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  4. View discovered modules                     │
│     See all functional areas of your codebase   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  5. Click "Analyze" on a module                 │
│     AI deep-dives into bugs & security issues   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  6. Review findings in dashboard                │
│     Browse bugs, vulnerabilities, missing tests │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  7. Click "Fix" on any issue                    │
│     AI-generated fix is applied to your code    │
└──────────────────┬──────────────────────────────┘
                   │
                  DONE!
```

**That's it!** Just a few clicks and your code is analyzed and fixed.

## Key Features

### 🎯 Automated Discovery

- **Module Detection**: AI automatically identifies functional modules in your codebase
- **Dependency Mapping**: Understands how your code is interconnected
- **Priority Assignment**: Highlights critical vs. low-priority areas

### 🐛 Bug Detection

- **Logic Errors**: Finds incorrect algorithms and flawed logic
- **Edge Cases**: Identifies missing validation and boundary conditions
- **Race Conditions**: Detects concurrency issues
- **Error Handling**: Spots missing try-catch and error checks

### 🔒 Security Analysis

- **SQL/NoSQL Injection**: Identifies unsafe database queries
- **XSS Vulnerabilities**: Finds missing input sanitization
- **Authentication Flaws**: Detects weak auth mechanisms
- **Data Exposure**: Spots sensitive data in logs/responses
- **Crypto Issues**: Identifies weak encryption usage

### 🧪 Test Coverage Analysis

- **Missing Tests**: Identifies untested code paths
- **Test Quality**: Evaluates existing test effectiveness
- **Recommendations**: Suggests what tests to write

### 🔧 One-Click Fixes

- **AI-Generated Solutions**: Smart fixes for identified issues
- **Context-Aware**: Understands your codebase patterns
- **Safe Application**: Preview changes before applying
- **Reversible**: All fixes are tracked and can be undone

### 📊 Beautiful Dashboard

- **Module Overview**: Card-based view of all modules
- **Issue Breakdown**: See bugs, security issues, test gaps at a glance
- **Real-Time Updates**: Live updates as AI completes analysis
- **Detailed Views**: Drill down into specific findings
- **Progress Tracking**: Monitor analysis and fix status

## How It Works

### Architecture

```
┌────────────────────────────────────────────────┐
│            Web Dashboard (React)               │
│  Beautiful UI with real-time updates          │
│  - Module cards                                │
│  - Issue lists                                 │
│  - Fix buttons                                 │
└────────────────┬───────────────────────────────┘
                 │ REST API + WebSocket
┌────────────────▼───────────────────────────────┐
│          Backend (Express + Node)              │
│  - API endpoints                               │
│  - Task orchestration                          │
│  - File watching                               │
│  - Fix application                             │
└────────────────┬───────────────────────────────┘
                 │ Spawns & monitors
┌────────────────▼───────────────────────────────┐
│            AI Agent (Aider, etc.)              │
│  - Analyzes code                               │
│  - Generates findings                          │
│  - Creates fixes                               │
│  - Writes JSON output                          │
└────────────────┬───────────────────────────────┘
                 │ Reads/writes
┌────────────────▼───────────────────────────────┐
│           Your Codebase + Analysis             │
│  .code-analysis/                               │
│    ├── scan-results.json                       │
│    ├── modules/{module-id}.json                │
│    └── tasks/pending/*.json                    │
└────────────────────────────────────────────────┘
```

### Contract-First Design

The backend and frontend communicate via **JSON contracts**:

- AI writes structured JSON files
- Dashboard reads and displays them
- No tight coupling between components
- Easy to swap AI agents

## Supported AI Agents

### Current: Aider

- **What**: AI-powered coding assistant
- **Why**: Excellent code understanding and modification
- **Setup**: `pip install aider-chat`

#### How Aider Handles Token Limits

Aider has built-in features to handle large codebases without hitting token limits:

- **Repository Map**: Creates a compact representation of your codebase (using `--map-tokens`)
- **Smart Context**: Only loads relevant files into LLM context
- **Auto-Refresh**: Updates its understanding as it works (`--map-refresh auto`)
- **No Manual Chunking**: All complexity is handled internally by Aider

**You don't need to manage tokens** - Aider does it automatically. If you encounter limits, Aider will work incrementally, analyzing critical files first and continuing with remaining files.

### Future Agents

The architecture supports any agent that can:

1. Read instruction files (markdown)
2. Analyze code
3. Write JSON output (following our schemas)

Potential agents:

- Custom LLM integrations (Claude, GPT-4, etc.)
- Specialized security scanners
- Code quality analyzers
- Test generation tools

## Configuration

### CLI Usage

```bash
cd /path/to/your/project
code-analyze
```

The tool analyzes the current directory.

### Environment Setup

```env
# backend/.env
PORT=3001
ANALYSIS_TOOL=aider
AIDER_MODEL=deepseek
DEEPSEEK_API_KEY=your_key_here
```

## Output Structure

All analysis results are stored in `.code-analysis/` in your project:

```
your-project/
  .code-analysis/
    scan-results.json           # Module discovery
    modules/
      user-auth.json            # Detailed analysis per module
      payment.json
      ...
    tasks/
      pending/                  # Queued analysis tasks
      completed/                # Finished tasks
    logs/                       # Agent execution logs
```

## User Workflow Example

### Step 1: Initial Scan

```bash
cd /path/to/my-app
code-analyze
```

Dashboard shows: "Click Scan Codebase to begin"

### Step 2: Discover Modules

**User clicks**: "Scan Codebase"  
**AI does**: Analyzes project structure, identifies modules  
**User sees**: Grid of discovered modules (e.g., "User Authentication", "Payment Processing")

### Step 3: Analyze a Module

**User clicks**: "Analyze" on "User Authentication"  
**AI does**: Deep analysis of all auth-related files  
**User sees**:

- 3 critical security issues
- 7 bugs
- 5 missing tests

### Step 4: Review Findings

**User clicks**: On a security issue  
**User sees**:

- **Issue**: SQL Injection vulnerability
- **Location**: `auth/login.js:42`
- **Details**: User input not sanitized
- **Fix**: AI-generated code using prepared statements

### Step 5: Apply Fix

**User clicks**: "Apply Fix" button  
**Backend does**: Applies the fix to `auth/login.js`  
**User sees**:

- Success message
- Code diff showing changes
- Updated issue status (Fixed ✓)

### Step 6: Batch Fixes (Optional)

**User clicks**: "Fix All" for a category  
**Backend does**: Applies all auto-fixable issues  
**User sees**: Progress bar, summary of applied fixes

## Why This Approach?

### Minimal Manual Work

- No manual code review needed
- No manual fix application
- No manual test writing (AI suggests tests)
- Just point, click, review, approve

### AI Does the Heavy Lifting

- Reads thousands of lines of code
- Identifies subtle bugs humans miss
- Generates context-aware fixes
- Suggests comprehensive tests

### You Stay in Control

- Review all findings before fixing
- Preview changes before applying
- Undo any fix if needed
- Configure what to scan and how

### Fast Iteration

1. Make changes to your code
2. Re-scan affected modules
3. See new issues (if any)
4. Apply fixes
5. Repeat

## Design Principles

### 1. **Simple is Better**

- One analyze endpoint (agent handles complexity)
- Agents encapsulate their own logic (chunking, retries, etc.)
- Backend just orchestrates and serves results

### 2. **JSON Contracts**

- Well-defined schemas
- Agent-agnostic (swap Aider for anything else)
- Easy to test and mock

### 3. **Minimal User Actions**

- Default to smart choices
- One-click operations
- Auto-refresh when possible

### 4. **Developer-Friendly**

- Run in any project directory
- No complex configuration
- Works with existing codebases
- Non-invasive (uses `.code-analysis/` folder)

### 5. **Extensible**

- Support multiple AI agents
- Pluggable fix strategies
- Custom analysis rules
- API-first design

### 6. **Production-Ready Code**

- No legacy code or backward compatibility unless explicitly needed
- Clean implementation without leftovers
- Always update existing code rather than keeping old versions
- Remove unused features immediately
- Code should be ready to ship at any moment

## Roadmap

### Phase 1: MVP (Current)

- ✅ Basic scanning
- ✅ Module analysis
- ✅ Bug detection
- ✅ Fix application
- ✅ Web dashboard

### Phase 2: Enhanced Analysis

- [ ] Test suggestion and generation
- [ ] Performance issue detection
- [ ] Code smell identification
- [ ] Refactoring recommendations

### Phase 3: Team Features

- [ ] Multi-user support
- [ ] Analysis history
- [ ] Team dashboards
- [ ] CI/CD integration

### Phase 4: Advanced Intelligence

- [ ] Learning from applied fixes
- [ ] Custom rule definitions
- [ ] Cross-project patterns
- [ ] Automated PR generation

## Get Started

```bash
# Install
npm install -g codebase-analyzer

# Run in your project
cd /path/to/your/project
code-analyze

# Open dashboard
# Browser opens automatically at http://localhost:5173
```

## Philosophy

> **"Let AI do the tedious work, you do the creative work."**

Code auditing should be:

- **Automated** - AI scans, you review
- **Fast** - Minutes, not days
- **Accurate** - Catches what humans miss
- **Actionable** - One-click fixes
- **Enjoyable** - Beautiful interface, not command-line hell

---

**Made for developers who want to ship better code faster.** 🚀
