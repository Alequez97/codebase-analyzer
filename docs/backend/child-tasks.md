# Child Tasks — Spawning Workflow

Tasks can spawn child tasks after completion. The parent agent acts as a **planner**: it analyzes the situation, writes targeted instruction files for each child, and declares the full plan upfront in `plannedChildrenTasks`.

## Task Schema

```json
{
  "id": "task-abc",
  "type": "review-changes",
  "depth": 0,
  "plannedChildrenTasks": [
    {
      "plannedId": "planned-1",
      "type": "analyze-documentation",
      "domainId": "user-auth",
      "label": "User Auth — Documentation",
      "instructionFile": "temp/task-abc/user-auth-documentation.md",
      "status": "planned"
    }
  ]
}
```

`plannedChildrenTasks` is written when the parent task **completes** (from the agent's output). It is the single source of truth — used by `spawnChildTasks` to queue children and by the UI to render the workflow tree.

## Child Task Status Lifecycle

`planned` → `queued` → `running` → `completed` | `failed`

## Instruction Files

Each planned child has an `instructionFile` path relative to `.code-analysis/` — e.g. `temp/{parentTaskId}/{domainId}-{section}.md`.

The parent agent **generates** these files dynamically based on what it found (e.g. git diff). They contain surgical, targeted instructions — not a full reanalysis prompt. Children use them via the existing `loadInstructionForTask` which resolves `temp/...` paths against the target project's `.code-analysis/` directory (not the analyzer's `backend/instructions/`).

## Spawn Rules (`spawnChildTasks`)

Called in `executeTask` after `persistTaskRevision`, before emitting `TASK_COMPLETED`:

1. Read `plannedChildrenTasks` from completed task
2. Validate each child type is in the **spawnable whitelist** for the parent type
3. Enforce `depth < MAX_DEPTH` (hardcoded, e.g. 3) — prevents loops
4. Queue each child with `parentTaskId` and `depth: parent.depth + 1`
5. Update child `status` from `planned` → `queued` in the parent task file

## Loop Prevention

- **Type whitelist**: defined in `constants/spawnable-tasks.js` — only specific parent types can spawn, and only specific child types are allowed per parent
- **Depth limit**: tasks with `depth >= MAX_DEPTH` are rejected at queue time
- **No child can spawn**: leaf task types (e.g. `analyze-documentation`) are not in the spawnable whitelist at all
