# Market Research Orchestration: Spawn → Trust → Collect

## Design principle

The master agent (renamed **`market-research-initial`**) does its real work upfront: identify competitors and delegate. After that it is done. The collection step is **server-side code in `onComplete`**, not another LLM turn. This keeps the LLM responsible only for judgment calls, not synchronization mechanics.

---

## Renamed task type

| Old | New |
|-----|-----|
| `MARKET_RESEARCH_MASTER` | `MARKET_RESEARCH_INITIAL` |
| `market-research-master` | `market-research-initial` |

Rationale: "initial" better describes the role — it kicks off the research, not orchestrates it forever.

---

## Two-phase flow

### Phase 1 — Initial agent (LLM-driven, one shot)

The `market-research-initial` agent receives the startup idea and:

1. Identifies 5–8 real competitors.
2. Calls `delegate_competitor` (see below) once per competitor — no more, no less.
3. Writes a **stub `report.json`** with all competitor entries in `"status": "pending"` state, plus the `opportunity` section left empty. This gives the frontend something to render immediately.
4. Stops. Its job is done.

The initial agent does **not** loop, poll, or wait. It trusts that each competitor agent will do its own work.

### Phase 2 — `onComplete` hook (server-side, no LLM)

When the initial task completes, the `onComplete` callback in its handler:

1. Reads the list of spawned competitor task IDs (passed back via `delegate_competitor` return values, stored in task params or a small sidecar file).
2. Waits for all competitor tasks to reach `completed` status — polling `tasksPersistence.readTask()` in a tight loop with a short delay. No LLM involved.
3. Reads each competitor's output file (`.code-analysis/market-research/{sessionId}/competitors/{id}.json`).
4. Merges them into the stub report and writes the final `report.json` with `"status": "complete"` and a populated `opportunity` section filled in by a final lightweight LLM call (optional — or pre-written by the initial agent).
5. Emits `MARKET_RESEARCH_REPORT_READY` via Socket.IO.

This is clean because:
- **No shared state between competitor agents** — each writes to its own isolated output path.
- **No conflict window** — competitor agents never read each other's files.
- **Synchronization is deterministic code**, not an LLM reasoning about task state.
- **The initial agent's token budget stays small** — it only needs to identify and dispatch, not wait.

---

## `delegate_competitor` tool

A new tool added to `DelegationToolExecutor` (or a separate `MarketResearchDelegationExecutor`) specifically for the initial agent.

```
Tool: delegate_competitor
Arguments:
  competitorId:          "stripe"
  competitorName:        "Stripe"
  competitorUrl:         "stripe.com"
  competitorDescription: "Online payments infrastructure for developers"
Returns:
  { success: true, data: { taskId, competitorId } }
```

Under the hood it calls `queueMarketResearchCompetitorTask()` with the current task's ID as `delegatedByTaskId`.

The initial agent calls this N times (once per competitor), collecting the returned task IDs. It writes these IDs to a sidecar file:

```
.code-analysis/market-research/{sessionId}/competitor-tasks.json
[ { "competitorId": "stripe", "taskId": "mrc-abc123" }, ... ]
```

The `onComplete` hook reads this file to know what to wait for.

---

## Competitor agents — tooling

Each competitor agent gets **web search** tooling so it can look up real, up-to-date information. Two options:

### Option A — Built-in web search (recommended for now)

Add a `WebSearchToolExecutor` backed by a search API (Brave Search, Serper, or Tavily). The agent gets a `web_search` tool:

```
Tool: web_search
Arguments:
  query: "Stripe pricing 2024"
Returns:
  { results: [{ title, url, snippet }] }
```

**Why start here:** zero browser overhead, easy to add, sufficient for pricing/funding/employee data. Most of what a competitor profile needs (pricing, funding rounds, product features) is well-covered by search snippets.

### Option B — Chrome DevTools MCP

Gives the agent a real browser — can navigate to `stripe.com/pricing`, read the DOM, scrape dynamically rendered content. More powerful but:
- Requires a running Chrome instance per task (resource heavy when 6–8 agents run concurrently).
- Slower — page loads, JS execution.
- More brittle — selectors break, CAPTCHAs, etc.

**Recommendation:** ship with web search first. Add Chrome DevTools MCP later as an opt-in enhancement when deeper scraping is needed.

---

## Data flow

```
POST /api/market-research/:sessionId/analyze
  │
  ▼
queueMarketResearchInitialTask()
  │
  ▼
executeTask(initialTaskId)
  │
  ▼
market-research-initial LLM agent
  │  ├─ delegate_competitor("stripe", ...)    → queues mrc-abc1  ┐
  │  ├─ delegate_competitor("paypal", ...)    → queues mrc-abc2  │ all queued
  │  ├─ delegate_competitor("adyen", ...)     → queues mrc-abc3  │ immediately,
  │  ├─ ...                                                       │ run concurrently
  │  ├─ writes competitor-tasks.json                             ┘
  │  └─ writes stub report.json  (status: "pending" per competitor)
  │
  ▼ agent stops (end_turn)
  │
  ▼
onComplete(result) — server-side, no LLM
  │  ├─ reads competitor-tasks.json
  │  ├─ polls tasksPersistence.readTask(id) until all → "completed"
  │  ├─ reads each competitors/{id}.json
  │  ├─ merges into report.json  (status: "complete")
  │  └─ emits MARKET_RESEARCH_REPORT_READY
  │
  ▼ (concurrently, started when each sub-task was queued)
market-research-competitor agents  (one per competitor, parallel)
  │  each:
  │  ├─ web_search("Stripe pricing site:stripe.com")
  │  ├─ web_search("Stripe funding 2024")
  │  ├─ ...
  │  └─ writes competitors/{competitorId}.json
  └─ task → "completed"
```

---

## Why `onComplete`, not a separate aggregator task

The existing `onComplete` callback in `LLMAgent.run()` already runs after the agent loop finishes ([agent.js:300](../../backend/agents/agent.js#L300)). It is the natural hook for server-side post-processing — `persistTaskRevision` already uses this pattern via the task orchestrator.

Adding a third "aggregator" task type would introduce unnecessary complexity: another task type, another queue file, another handler, and another LLM call just to do what `Promise.all` + file reads can do deterministically.

---

## Files to create / modify

| Action | File |
|--------|------|
| Rename | `TASK_TYPES.MARKET_RESEARCH_MASTER` → `MARKET_RESEARCH_INITIAL` |
| Rename | `backend/tasks/queue/market-research-master.js` → `market-research-initial.js` |
| Rename | `backend/system-instructions/market-research/market-research-master.md` → `market-research-initial.md` |
| Modify | `market-research-initial.md` — new two-phase prompt: identify + delegate, write stub report, stop |
| Modify | `backend/tasks/handlers/market-research.js` — add `onComplete` aggregation logic |
| Modify | `backend/llm/tools/delegation-tools.js` — add `delegate_competitor` tool (or separate executor) |
| Add | `WebSearchToolExecutor` + `web_search` tool definition |
| Modify | `task-handler-builder.js` — enable web search + `delegate_competitor` for competitor task type |
| Modify | `backend/constants/task-types.js` — rename constant |
| Modify | `backend/constants/system-instructions.js` — rename path constant |
| Modify | `backend/routes/market-research.js` — import renamed queue function |
| Modify | `backend/tasks/handlers/index.js` — update exports |
| Modify | `backend/tasks/queue/index.js` — update export |
