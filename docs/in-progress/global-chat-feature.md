# Floating Agent Chat Feature - Design Spec

## Concept

Universal floating chat interface for AI-driven codebase operations. Single entry point for all agent tasks.

## UI Components

### FloatingChatButton

- Bottom right corner, fixed position
- Opens chat panel on click
- Badge showing active task count

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
- **Systematic execution**:
  1. Find all occurrences (code, tests, docs, requirements)
  2. Detect conflicts with existing requirements
  3. Ask for clarification if conflicts exist (wait for user response)
  4. Apply changes to code files
  5. Update documentation files
  6. Update requirements if user approved the change
  7. Report all modifications with requirement references
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
  selectedDomainId: null | string,
  messages: Array<Message>,
  isAiWorking: boolean,
  currentTaskId: null | string
}
```

## User Flows

### Flow 1: Edit Domain Section

```
1. Click floating button
2. Select "Documentation" + domainId
3. Type: "Add more examples"
4. AI edits documentation
5. Receive updated content via socket
6. Apply changes
```

### Flow 2: Custom Task

```
1. Click floating button
2. Select "Custom Task"
3. Type: "Rename TournamentSections to TournamentStages everywhere"
4. AI analyzes → refactors → updates docs
5. Receive file-by-file updates via socket
6. Review changes
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

## File Changes Required

### Frontend

- `components/FloatingChat/ChatButton.jsx`
- `components/FloatingChat/ChatPanel.jsx`
- `components/FloatingChat/TaskSelector.jsx`
- `store/useAgentChatStore.js`
- `App.jsx` (mount floating button)

### Backend

- `routes/codebase-chat.js`
- `constants/task-types.js` (add CUSTOM_CODEBASE_TASK)
- `constants/socket-events.js` (add custom task events)
- `instructions/custom-codebase-task.md` (instruction template with code+docs awareness)
- `tasks/handlers/custom-codebase-task.js`
- `tasks/factory/createCustomCodebaseTask.js`

### Socket

- `useSocketStore.js` (handle agent chat events)
- `backend/index.js` (emit agent chat events)
