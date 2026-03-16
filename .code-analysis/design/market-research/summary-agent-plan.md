# Plan: market-research-summary Agent

## Overview

Replace the current heuristic-based `synthesizeOpportunity()` function in
`backend/tasks/handlers/market-research.js` with a real LLM agent task
(`market-research-summary`) that reads all competitor profiles and produces
a grounded, honest market verdict.

The pipeline becomes:

```
market-research-initial
  └─ spawns N × market-research-competitor   (parallel, web search)
  └─ queues market-research-summary          (dependsOn: all competitor task IDs)
       └─ queue-processor skips it until all deps are completed/failed
            └─ summary runs → writes opportunity.json → report.json assembled
```

---

## Why

The current `synthesizeOpportunity()` is pure regex + counting heuristics.
It cannot reason about:
- Dominant incumbents with massive funding/scale (e.g. Wolt, Bolt in food delivery)
- Network effects and switching costs
- Geographic saturation
- Realistic investor/founder risk appetite

A model that reads all 10 competitor profiles holistically will produce
verdicts that are actually useful — including honest "don't enter this market"
conclusions when warranted.

---

## What Changes

### 1. New task type constant
**File:** `backend/constants/task-types.js`

Add:
```js
MARKET_RESEARCH_SUMMARY: "market-research-summary",
```

### 2. New task config
**File:** `backend/config.js`

Add under `tasks`:
```js
[TASK_TYPES.MARKET_RESEARCH_SUMMARY]: {
  agent: AGENTS.LLM_API,
  model: MODELS.CLAUDE_SONNET_4_6,  // strong reasoning model
  maxTokens: 16000,
  maxIterations: 5,                  // single-shot: read input → write output
  reasoningEffort: REASONING_EFFORT.HIGH,
},
```

Model choice rationale: this task needs genuine reasoning about market dynamics,
not just data extraction. Claude Sonnet 4.6 or GPT-4o are appropriate.
Can be swapped to a cheaper model later if this becomes a paid gated feature.

### 3. New system instruction
**File:** `backend/system-instructions/market-research/market-research-summary.md`

The prompt receives:
- The startup idea
- All competitor profiles as a JSON block (embedded in the initial message)

The model must produce a JSON block written to the output file with this shape:
```json
{
  "verdict": "worth-entering" | "risky" | "crowded" | "niche-only",
  "confidence": "high" | "medium" | "low",
  "summary": "2-3 sentence honest assessment of the market reality",
  "dominantPlayers": ["name", ...],
  "differentiators": [
    { "label": "...", "detail": "..." }
  ],
  "risks": [
    { "label": "...", "detail": "..." }
  ],
  "marketGaps": [
    {
      "label": "...",
      "detail": "...",
      "competitorCount": 3,
      "competitors": ["...", "..."],
      "examples": ["..."]
    }
  ]
}
```

Key prompt instructions:
- Be honest and contrarian when the data warrants it
- If 2+ competitors have raised Series C+ or are at massive scale, verdict MUST be `"crowded"` unless the idea targets a clearly underserved sub-niche
- `"niche-only"` = market exists but only viable as a narrow geographic or vertical play
- `dominantPlayers` = list names of any competitors with $100M+ funding, millions of users, or public/unicorn status
- Differentiators must be real gaps, not generic SaaS advice
- Risks must be honest, not boilerplate

### 4. New system instruction path constant
**File:** `backend/constants/system-instructions.js`

Add to both `SYSTEM_INSTRUCTION_NAMES` and `SYSTEM_INSTRUCTION_PATHS`:
```js
MARKET_RESEARCH_SUMMARY: "market-research/market-research-summary.md",
// and
MARKET_RESEARCH_SUMMARY: "backend/system-instructions/market-research/market-research-summary.md",
```

### 5. New output path helper
**File:** `backend/constants/task-output-paths.js`

Add:
```js
export function getMarketResearchSummaryOutputPath(sessionId) {
  return joinOutputPath(
    PERSISTENCE_FILES.ANALYSIS_ROOT_DIR,
    "market-research",
    sessionId,
    "opportunity.json",
  );
}
```

Output goes to `opportunity.json` alongside `report.json` — separate file
so it can be regenerated independently without touching competitor data.

### 6. New queue function
**File:** `backend/tasks/queue/market-research-summary.js`

Pattern: same as `market-research-competitor.js`.
Params: `{ sessionId, idea, competitorProfilesJson }` where
`competitorProfilesJson` is the serialized array of all competitor profiles
embedded directly in the initial message (no file read needed by the agent —
keeps the task self-contained and fast).

### 7. New handler
**File:** `backend/tasks/handlers/market-research.js` (add alongside existing handlers)

`marketResearchSummaryHandler(task, taskLogger)`:

- `initialMessage`: includes the idea + full competitor JSON inline
- `onComplete`: reads `opportunity.json` written by the agent, merges it into
  `report.json`, marks session complete, emits `MARKET_RESEARCH_REPORT_READY`
- No web search tools needed — purely reads input, reasons, writes output

### 8. Wire up in task-handler-builder
**File:** `backend/tasks/handlers/task-handler-builder.js`

Add `else if (task.type === TASK_TYPES.MARKET_RESEARCH_SUMMARY)` block —
no special tools needed (no web search, no delegation, no git).

### 9. `dependsOn` support in the task queue
**Files:** `backend/persistence/tasks.js`, `backend/orchestrators/queue-processor.js`

Tasks can optionally declare a `dependsOn: string[]` array of task IDs they
must wait for. The queue processor skips any pending task whose dependencies
are not yet all completed or failed.

#### queue-processor.js — change in `poll()`

```js
// Before dispatching a task, check if all dependencies are satisfied.
// A dependency is satisfied when it is in completed/ or failed/ (not pending/running/).
async function areDependenciesMet(task) {
  if (!task.dependsOn || task.dependsOn.length === 0) return true;
  for (const depId of task.dependsOn) {
    const dep = await tasksPersistence.readTask(depId);
    if (!dep) return false; // dependency missing — wait
    if (dep.status !== TASK_STATUS.COMPLETED && dep.status !== TASK_STATUS.FAILED) {
      return false; // still pending or running
    }
  }
  return true;
}
```

In `poll()`, replace the current `for (const task of toProcess)` body with:

```js
for (const task of toProcess) {
  if (!(await areDependenciesMet(task))) continue; // skip, will retry next poll
  // ... existing claim + dispatch logic
}
```

No new status needed — tasks just stay in `pending/` until their deps are done.

#### queue function — set dependsOn when queuing summary

In `queueMarketResearchSummaryTask({ sessionId, idea, dependsOn })`:

```js
const task = {
  ...
  dependsOn: dependsOn ?? [],   // array of competitor task IDs
  ...
};
```

#### Where dependsOn is populated

In `market-research.js` `onComplete` of the initial handler, after reading
`competitor-tasks.json`:

```js
const competitorTaskIds = competitorTasks.map(ct => ct.taskId);

await queueMarketResearchSummaryTask({
  sessionId,
  idea: report.idea,
  dependsOn: competitorTaskIds,   // ← waits for all N competitor tasks
});
```

This means the summary task is queued immediately after competitors are
delegated — it just sits in `pending/` with `dependsOn` set and won't run
until every competitor task has landed in `completed/` or `failed/`.

No polling loops in handlers. No custom waiting. The queue processor handles it.

### 10. Remove heuristic code
**File:** `backend/tasks/handlers/market-research.js`

Delete:
- `GAP_PATTERNS` array
- `buildGapInsights()`
- `inferVerdict()`
- `inferConfidence()`
- `buildOpportunitySummary()`
- `buildRisks()`
- `synthesizeOpportunity()`
- All the partial heuristic additions made in the previous session

Also revert the half-applied `isDominant` / `DOMINANT_FUNDING_KEYWORDS` additions
that were added before this plan was written.

### 11. Frontend: show summary thinking phase
**File:** `frontend/src/store/useMarketResearchStore.js`

Add a new `summaryStatus` value: `"summarizing"` (between `"waiting-competitors"` and `"ready"`).

**File:** `frontend/src/components/market-research/MarketResearchSummaryPanel.jsx`

Show a loading/thinking state when `summaryStatus === "summarizing"` so the
user knows the AI is actively reasoning about the market, not just assembling data.

---

## Task Flow (after change)

```
User submits idea
  → market-research-initial queues:
      - 10 × market-research-competitor  (parallel, web search)
      - 1 × market-research-summary      (pending, dependsOn: all 10 competitor task IDs)

  queue-processor polls every 2s:
      - runs competitor tasks as slots free up (MAX_CONCURRENT = 5)
      - skips summary task until all deps are completed/failed

  once last competitor finishes:
      → queue-processor picks up summary task (deps now met)
          → LLM reads profiles inline, reasons, writes opportunity.json
              → onComplete: merges into report.json, emits MARKET_RESEARCH_REPORT_READY
                  → frontend receives event → shows final verdict
```

---

## Notes

- The summary task is a natural place to gate on paid plans later —
  free tier could show raw competitor cards but no AI verdict
- `maxIterations: 5` is intentionally low — the agent should do one read
  of its input (already in the message) and one write. No browsing needed.
- If the summary task fails, fall back to the old heuristic result so the
  report is never left empty (add a try/catch in the initial handler's onComplete)
