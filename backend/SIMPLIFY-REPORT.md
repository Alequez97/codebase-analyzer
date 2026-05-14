# Simplification Report — `codebase-analyzer/backend`

**Date:** 2026-05-14
**Scope:** Dead code, file-system clutter, reducible patterns, merge candidates

---

## 1. Dead Files — Never Imported (4)

These files exist on disk but are imported by zero source files. Safe to delete.

| File | Lines | What It Does | Why Dead |
|---|---|---|---|
| `services/subscription.js` | 74 | Plan definitions (free/starter/pro/agency) with `getSubscriptionPlanDetails()` | Stub for a SaaS monetization feature that was never wired up. `getSubscription()` always returns `"free"`. No routes or handlers import it. |
| `utils/api-keys.js` | 14 | `getApiKeyForProvider(provider, apiKeys)` — returns `apiKeys[provider] \|\| null` | API keys are now read directly from `config.apiKeys` in `executors/index.js`. This one-liner helper was replaced by inline access. |
| `utils/line-buffered-stream.js` | 34 | `createLineBufferedStream(onLine)` — buffers text chunks, emits complete lines | Leftover from an older streaming implementation. Current task logging uses a `WriteStream` directly (`task-logger.js:82`). |
| `utils/mock-data.js` | 31 | `readMockJson()`, `sleep()` — reads JSON from `.code-analysis-example` directories | Leftover prototype for example data loading. No `.code-analysis-example` directories exist in production. |

**Total dead lines: 153.** Deleting them removes 3 `import` statements from the tree (only `mock-data.js` had imports — `fs/promises`, `path`, `../config.js`).

---

## 2. Local Duplicate of Package Utility (1)

`persistence/utils.js:13` defines `tryReadJsonFile()` which is functionally identical to `@jet-source/task-queue`'s exported `tryReadJsonFile` (already imported in `persistence/task-queue-adapter.js:8`).

| Current Import | Callers |
|---|---|
| Local `persistence/utils.js` | `utils/chat-history.js` (1 caller) |
| Package `@jet-source/task-queue` | `persistence/task-queue-adapter.js` (1 caller) |

**Fix:** Replace the import in `chat-history.js` line 4 from `"../persistence/utils.js"` to `"@jet-source/task-queue"`, then delete `persistence/utils.js`. The `appendRevision` function in that file is also only used by `orchestrators/task.js:12` — that import would need to move inline or have its own small file.

---

## 3. Overlapping Path-Construction Files (Merge Candidate)

| File | Lines | Purpose | Callers |
|---|---|---|---|
| `persistence/domain-section-paths.js` | 45 | Builds paths to `.code-analysis/domains/{domainId}/{section}/*.json` | `utils/template-processor.js`, `utils/chat-history.js`, several domain persistence files |
| `constants/task-output-paths.js` | 59 | Builds paths to `.code-analysis/analysis/*.json` and `.code-analysis/domains/...` | 9+ queue handlers, `utils/template-processor.js` |

Both construct absolute and relative paths under `.code-analysis/` using `config.paths.targetAnalysis`. Both import `PERSISTENCE_FILES`. The patterns are identical — `posix.join` vs `path.join` is the only difference.

**Fix:** Merge both into a single `persistence/paths.js` (or move domain-section-paths into task-output-paths). Same pattern, same config inputs, same consumer pattern. Reduces two files with overlapping concerns to one. If there's a desire to keep `domain-section-paths.js` for routing convenience, at minimum make it the sole path-construction module and `task-output-paths.js` should delegate to it.

---

## 4. Logger — Dead `configure()` (25 lines)

`utils/logger.js:27-29` exports `configure()` for setting log level, timestamps, and output destinations. **It is never called** — zero imports across the entire codebase. The logger always runs with defaults (level: INFO, timestamps: on, output: console).

The `configure` function itself and the internal `config` object at line 14 are only referenced internally. Removing them simplifies `logger.js` with no behavioral change.

Similarly, `LOG_LEVELS` (line 6) is only referenced inside `logger.js` itself for comparison — it's not imported anywhere externally. Could be made module-private, or kept exported as a stable API for future use — less clear-cut than `configure`.

---

## 5. Temp File Buildup — Instruction Dumps

`tasks/handlers/task-handler-builder.js:232-243` dumps system instructions to `temp/system-instructions/{taskId}.md` on every task run. This is debug-only logging:

```js
await fs.writeFile(
  path.join(dumpDir, `${task.id}.md`),
  instructions,
  "utf-8",
);
```

Over time this accumulates files — currently **122 `.md` dump files** across `temp/instructions/` (50) and `temp/system-instructions/` (72). These are never cleaned up and serve no runtime purpose.

**Fix:** Remove the dump block from `task-handler-builder.js` (12 lines), or gate it behind a `DEBUG_INSTRUCTIONS` env var.

---

## 6. Empty Directories (7)

These are auto-created by `config.js:289-301` during startup. Expected but worth noting:

| Directory | Note |
|---|---|
| `temp/progress/` | Per `task-progress.js`, deleted after successful task completion |
| `.code-analysis/analysis/` | Filled during codebase analysis tasks |
| `.code-analysis/domains/` | Filled during domain analysis tasks |
| `.code-analysis/logs/` | Log files appear here when tasks run |
| `.code-analysis/modules/` | Could be obsolete — not written to by any current code |
| `.code-analysis/tasks/completed/` | Filled during task processing |
| `.code-analysis/tasks/pending/` | Filled during task queue operation |

`modules/` is the only one that may be genuinely unused. The rest fill naturally during operation.

---

## Summary

| Type | Count | Lines Affected | Effort |
|---|---|---|---|
| Dead files (delete) | 4 | 153 | Trivial — delete + remove mock-data.js imports |
| Duplicate utility (migrate to package) | 1 | 64 | Small — change import in `chat-history.js` |
| Merge candidate (domain-section-paths + task-output-paths) | 2 → 1 | 104 → ~60 | Medium — requires updating 5+ import sites |
| Logger dead `configure()` | 1 function | 25 | Trivial — remove function + internal `config` var |
| Temp dump cleanup | 122 accumulated files | 12 | Trivial — remove dump block or gate behind env var |

**Quick wins (can be done in minutes):** #1 (4 dead files), #2 (package import), #4 (remove `configure`), #5 (gate temp dumps)
