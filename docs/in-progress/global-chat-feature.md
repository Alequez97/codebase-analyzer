# Floating Agent Chat Feature - Design Spec

## Concept

Universal floating chat interface for AI-driven codebase operations. Single entry point for all agent tasks.

## UI Components

### FloatingChatButton

- **Visibility**: Only shown on domain detail pages (e.g., `/domain/:domainId`)
- **Context-aware**: Automatically uses current domain ID from page context
- Bottom right corner, fixed position
- Opens chat panel on click
- Badge showing active task count for current domain

### ChatPanel

- Slides in from right side
- Two modes:
  1. **Task Selector** (initial state)
  2. **Chat Interface** (after selection)

### Task Selector

```
┌─────────────────────────────┐
│ What do you want to chat    │
│ about?                      │
├─────────────────────────────┤
│ Domain Sections             │
│ [ Documentation ]           │
│ [ Requirements ]            │
│ [ Diagrams ]                │
│ [ Bugs & Security ]         │
│ [ Testing ]                 │
├─────────────────────────────┤
│ Or create custom task       │
│ [ Custom Task ]             │
└─────────────────────────────┘
```

## Backend Architecture

### New Task Type

```javascript
CUSTOM_CODEBASE_TASK: "custom-codebase-task";
```

### Endpoints

- **Domain sections**: Use existing `POST /api/chat/domain/:domainId/:sectionType`
- **Custom tasks**: `POST /api/chat/codebase`
  ```
  Body: {
    userInstruction: string  // e.g., "Rename TournamentSections to TournamentStages"
  }
  ```

### Task Execution

- **Domain sections**: Use existing `edit-domain-section.md` template
- **Custom tasks**: Use new `custom-codebase-task.md` instruction template

### Custom Task Instruction Template

The agent instruction includes:

- **Code + Documentation awareness**: "When modifying code, ALWAYS update related documentation"
- **Requirements awareness & conflict detection**:
  - Check if requirements exist for affected domains (`.code-analysis/domains/{domainId}.json`)
  - **Detect conflicts** between user request and existing requirements
  - **Ask for clarification** when conflicts are found
  - Example: User asks for 10% discount, but requirements say 20%
    - Agent responds: "⚠️ I found a conflict. Requirement REQ-DISC-01 specifies discount should be 20%, but you're asking for 10%. What should I do?
      - Option A: Implement 10% and update requirement REQ-DISC-01 to reflect this change
      - Option B: Follow existing requirement and implement 20% discount instead
        Please choose A or B."
  - Reference requirements when implementing changes
  - Update requirements if user confirms the change should override existing requirements
  - Ensure changes align with documented requirements
  - Talk about requirements in responses (e.g., "According to requirement X, this change...")
- **Scope detection**: Analyze user request to identify affected files and domains
- **Progress tracking**: Agent writes to `tasks/progress/{task-id}.md`:
  - Create execution plan with checkboxes at start
  - Check off completed steps as work progresses
  - Add notes about issues, conflicts, user decisions
  - Enables resumability if agent/server restarts
- **Systematic execution**:
  1. Create progress file with execution plan
  2. Find all occurrences (code, tests, docs, requirements)
  3. Detect conflicts with existing requirements
  4. Ask for clarification if conflicts exist (wait for user response, log decision)
  5. Apply changes to code files (check off each in progress file)
  6. Update documentation files (check off)
  7. Update requirements if user approved the change (check off)
  8. Report all modifications with requirement references
  9. Mark progress file as complete
- **Safety**: Show what will change before applying

### Consistency Philosophy

The agent acts as a **consistency guardian** - treating the codebase as a unified organism where:

- Requirements, code, tests, and documentation must stay aligned
- Conflicts are surfaced, not silently ignored
- User makes deliberate choices about requirement changes
- All artifacts are updated together to maintain coherence

## Socket Events

```javascript
CUSTOM_TASK_THINKING: "custom-task:thinking",
CUSTOM_TASK_PROGRESS: "custom-task:progress",
CUSTOM_TASK_FILE_UPDATED: "custom-task:file-updated",
CUSTOM_TASK_DOC_UPDATED: "custom-task:doc-updated",
CUSTOM_TASK_CONFLICT_DETECTED: "custom-task:conflict-detected",  // Agent asks for clarification
CUSTOM_TASK_AWAITING_RESPONSE: "custom-task:awaiting-response", // Agent paused, waiting for user
CUSTOM_TASK_CANCELLED: "custom-task:cancelled",                 // Task cancelled by user
CUSTOM_TASK_COMPLETED: "custom-task:completed",
CUSTOM_TASK_FAILED: "custom-task:failed"
```

## Interactive Conversation Flow

The agent can **pause execution** and wait for user input when conflicts are detected:

1. Agent detects conflict → emits `CUSTOM_TASK_CONFLICT_DETECTED` with options
2. Agent enters waiting state → emits `CUSTOM_TASK_AWAITING_RESPONSE`
3. User responds via chat → sends choice to backend
4. Backend resumes agent with user's choice
5. Agent continues execution with resolved conflict

## Store Structure

### useAgentChatStore

```javascript
{
  isOpen: boolean,
  selectedTaskType: null | "documentation" | "custom" | ...,
  selectedDomainId: string,   // Auto-populated from route params (e.g., /domain/:domainId)
  messages: Array<Message>,
  isAiWorking: boolean,
  currentTaskId: null | string,

  // Actions
  openChat(domainId),             // Opens chat, sets domainId from route context
  sendMessage(message),           // Routes to correct API endpoint
  selectDomainSection(sectionType), // Domain ID already known from route
  selectCustomTask(),
  clearChat(),
  loadChatHistory(taskId),        // Load from file system
  saveChatHistory(taskId),        // Save to file system
}
```

**Context-Aware Behavior:**

- Chat button only appears on domain detail pages
- `domainId` is automatically extracted from route params (e.g., `/domain/user-auth`)
- When user clicks a section button (e.g., "Documentation"), the store already knows which domain
- Custom tasks also have domain context (agent can reference current domain in analysis)

**Chat Persistence:**

Chat conversations are saved to file system to enable resumability:

**File Storage:**

```
.code-analysis/
  tasks/
    chat-history/
      task-1234567890-chat.json    # Conversation for custom task
      domain-abc-documentation.json # Conversation for domain section
```

**Chat History File Format:**

```json
{
  "taskId": "task-1234567890",
  "taskType": "custom-codebase-task",
  "domainId": null,
  "sectionType": null,
  "createdAt": "2026-03-06T14:32:15Z",
  "lastMessageAt": "2026-03-06T14:45:22Z",
  "messages": [
    {
      "id": 1,
      "role": "assistant",
      "content": "Hello! What would you like me to help with?",
      "timestamp": "2026-03-06T14:32:15Z"
    },
    {
      "id": 2,
      "role": "user",
      "content": "Rename TournamentSections to TournamentStages everywhere",
      "timestamp": "2026-03-06T14:33:10Z"
    },
    {
      "id": 3,
      "role": "assistant",
      "content": "I found 23 occurrences across 8 files. Starting refactoring...",
      "timestamp": "2026-03-06T14:33:15Z"
    }
  ]
}
```

**Behavior:**

- Backend saves chat messages to file as they're sent
- Frontend loads chat history when reopening chat for a task
- Conversations survive app restarts and page reloads
- User can continue where they left off
- Old conversations can be reviewed for audit/debugging

**API Endpoints:**

- `GET /api/tasks/:taskId/chat-history` - Load chat for a task
- `POST /api/tasks/:taskId/chat-history` - Append message to chat
- `DELETE /api/tasks/:taskId/chat-history` - Clear chat history

## Chat UI/UX

### Message Types

1. **User messages** - Right-aligned bubble, user avatar
2. **AI responses** - Left-aligned bubble, bot avatar, markdown rendered
3. **AI thinking** - Animated indicator: "🤔 Analyzing codebase..."
4. **AI progress** - Status updates: "📝 Updating requirements.json..."
5. **Conflict prompts** - Special message with interactive Option A/B buttons
6. **Task summary** - Final status: "✅ Modified 5 files: CartService.js, checkout.test.js, requirements.json, documentation.md, README.md"
7. **Errors** - Red alert-style message with error details

### Sample Prompts

Shows context-specific examples based on selected task type:

**Documentation:**

- "Add more detailed examples"
- "Make it more concise"
- "Add implementation notes"

**Requirements:**

- "Add acceptance criteria"
- "Break down into sub-requirements"
- "Add edge cases"

**Custom Task:**

- "Rename TournamentSections to TournamentStages everywhere"
- "Add logging to all API endpoints"
- "Update all copyright years to 2026"

### Task Cancellation

- **Stop button** appears while AI is working
- Sends cancel request to backend
- Backend terminates agent process
- Chat shows: "⚠️ Task cancelled by user"
- Partial changes may exist (use git to review/revert)

### Progress Updates

- Real-time status messages via socket events
- Auto-scroll to latest message
- Shows which files are being modified
- Reassures user during long-running operations

### Multi-Agent Execution

Not in scope for initial release. Discussion needed:

- Should we support parallel agents?
- Queue tasks or block new ones while running?
- Resource management?

## User Flows

### Flow 1: Edit Domain Section

```
1. User is viewing domain detail page (e.g., /domain/user-auth)
2. Click floating button (chat opens with user-auth domain context)
3. Select "Documentation" button
4. Type: "Add more examples"
5. AI edits documentation for user-auth domain
6. Receive updated content via socket
7. Review changes with git diff
```

### Flow 2: Custom Task

```
1. User is viewing domain detail page (e.g., /domain/tournament-management)
2. Click floating button
3. Select "Custom Task"
4. Type: "Rename TournamentSections to TournamentStages everywhere"
5. AI analyzes → refactors → updates docs (knows current domain context)
6. Receive file-by-file updates via socket
7. Review changes with git diff
```

### Flow 3: Custom Task with Requirement Conflict

```
1. Click floating button
2. Select "Custom Task"
3. Type: "Add function which calculates discount for coupon REFACTORINGWITHLMM for discount 10%"
4. AI analyzes requirements
5. AI detects conflict:
   "⚠️ I found a conflict. Requirement REQ-DISC-01 in domain 'payment-processing'
   specifies discount should be 20%, but you're asking for 10%. What should I do?

   Option A: Implement 10% and update requirement REQ-DISC-01 to reflect this change
   Option B: Follow existing requirement and implement 20% discount instead

   Please choose A or B."
6. User responds: "A"
7. AI implements:
   - Adds discount calculation function (10%)
   - Updates requirement REQ-DISC-01: "20% → 10%"
   - Updates documentation referencing discount rates
   - Applies changes to code
8. User sees complete report with all modified files and requirement updates
9. User reviews and applies changes
```

## Key Differences from Current Chat

| Current (Domain Sections)     | New (Floating Agent Chat)                      |
| ----------------------------- | ---------------------------------------------- |
| Embedded in detail pages      | Floating UI, always accessible                 |
| Section-specific only         | Section OR custom tasks                        |
| Pre-scoped to domain          | User defines scope                             |
| Uses existing stores          | New agent chat store                           |
| Updates single section        | Updates code + docs + requirements + tests     |
| No conflict detection         | **Detects conflicts, asks for clarification**  |
| Silent requirement divergence | **Maintains consistency across all artifacts** |

## Migration Path

1. Implement floating agent chat with task selector
2. Remove embedded chat buttons from section titles
3. Use only floating chat for all agent interactions

Clean replacement - no redundancy.

## Technical Considerations

### Safety

All changes are made locally to your repository:

- Agent modifies code files, documentation, `.code-analysis/` files
- Everything is in git - revert anytime with `git checkout` or `git reset`
- No external deployments, no production risk
- Review changes with `git diff`, commit when satisfied

### Scope Detection

- For custom tasks: AI determines affected files across entire codebase
- AI can modify any files: source code, tests, docs, `.code-analysis/` files
- User instruction defines the scope (e.g., "rename X to Y everywhere")

### Validation

- AI explains what it will change before executing
- User can cancel or adjust the request in chat

### Task Resilience & Resumability

Tasks can fail or be interrupted (server restart, agent crash, network issues). To handle this:

**Progress Tracking File:**

- Create `tasks/progress/{task-id}.md` when task starts
- Store path in task object: `task.progressFile` (similar to `task.instructionFile`)
- Agent writes execution plan with checkboxes
- Agent updates progress as it works
- Agent adds comments/notes about issues encountered

**Task Object Structure:**

```javascript
{
  id: "custom-codebase-1234567890",
  type: "custom-codebase-task",
  status: "in-progress",
  instructionFile: ".code-analysis/tasks/pending/task-1234567890.md",
  progressFile: ".code-analysis/tasks/progress/task-1234567890.md",
  chatHistoryFile: ".code-analysis/tasks/chat-history/task-1234567890-chat.json",
  createdAt: "2026-03-06T14:32:15Z",
  // ... other properties
}
```

**Example Progress File:**

```markdown
# Task: Rename TournamentSections to TournamentStages

Task ID: custom-codebase-1234567890
Started: 2026-03-06 14:32:15

## Execution Plan

- [x] Analyze codebase for all occurrences
- [x] Update src/components/TournamentSections.jsx → TournamentStages.jsx
- [x] Update src/components/TournamentStages.test.js
- [ ] Update documentation/tournament-guide.md
- [ ] Update requirements in .code-analysis/domains/tournament.json
- [ ] Update README.md

## Notes

- Found 23 occurrences across 8 files
- Conflict detected in requirements.json (20% vs 10% discount) - waiting for user response
- User selected Option A: update requirement to 10%
- Resumed after conflict resolution
```

**Resumability:**

- If agent/server restarts, read progress file
- Skip completed steps (checked boxes)
- Resume from next pending step
- Preserve context and user decisions
- Update progress file as work continues

**Benefits:**

- No lost work on crashes
- Transparent progress tracking
- Manual intervention possible (edit progress file)
- Debugging aid (see what agent was thinking)

**File Structure:**

```
.code-analysis/
  tasks/
    pending/         # Task queue
    progress/        # Active task progress files
      task-1234.md
      task-5678.md
    chat-history/    # Chat conversations
      task-1234-chat.json
      task-5678-chat.json
      domain-abc-documentation.json
    completed/       # Finished task records
```

      task-5678.md
    completed/     # Finished task records

```

## File Changes Required

### Frontend

- `components/FloatingChat/ChatButton.jsx`
- `components/FloatingChat/ChatPanel.jsx`
- `components/FloatingChat/TaskSelector.jsx`
- `store/useAgentChatStore.js`
- `App.jsx` (mount floating button)

### Backend

- `routes/codebase-chat.js`
- `routes/tasks.js` (add endpoints):
  - `POST /api/tasks/:taskId/cancel` - Cancel running task
  - `GET /api/tasks/:taskId/chat-history` - Load chat conversation
  - `POST /api/tasks/:taskId/chat-history` - Append message to chat
  - `DELETE /api/tasks/:taskId/chat-history` - Clear chat history
- `constants/task-types.js` (add CUSTOM_CODEBASE_TASK)
- `constants/socket-events.js` (add custom task events)
- `instructions/custom-codebase-task.md` (instruction template with code+docs awareness)
- `tasks/handlers/custom-codebase-task.js`
- `tasks/factory/createCustomCodebaseTask.js`
- `tasks/progress/` (folder for progress tracking files)
- `tasks/chat-history/` (folder for chat history files)
- `utils/task-progress.js` (create/read/update progress files)
- `utils/chat-history.js` (load/save/append chat messages)

### Socket

- `useSocketStore.js` (handle agent chat events)
- `backend/index.js` (emit agent chat events)
```
