# Design Agent & Platform Architecture Planning

> Use this file to discuss, decide, and track architectural decisions before implementation.
> Answer questions inline, check boxes, and add notes freely.

---

## 1. Platform Vision

The code-analyzer is evolving into a **full development lifecycle platform** — one unified pipeline, not two separate products.

The key insight: **code generated from a brainstorm/design phase is still code**. It will have bugs, missing tests, security issues, and undocumented domains — exactly like any existing codebase. The domain analysis pipeline applies universally, regardless of how the code was born.

### The unified pipeline

```
        NEW PROJECT ENTRY                EXISTING PROJECT ENTRY
        ────────────────                 ──────────────────────
        📡 Research                      │
        💡 Brainstorm                    │
        🎨 Design                        │
        📋 Requirements                  │
        ⚙️  Code generation              │
               │                         │
               └──────────┬─────────────┘
                           ▼
              ══════════════════════════════
                  UNIFIED ANALYSIS PIPELINE
              ══════════════════════════════
                🏗️  Domain breakdown
                📖 Documentation
                📐 Diagrams
                📋 Requirements
                🐛 Bugs & Security
                🧪 Refactoring & Testing
                🎨 Design audit
```

"New project" and "existing project" are just **entry points into the same platform**. The difference is only how much of the pipeline has already happened when you arrive.

### 1.1 Does this single-pipeline model match your vision?

- [x] Yes — one pipeline, two entry points
- [ ] Yes, but new project entry is out of scope for now — focus on existing first
- [ ] No — different idea: **\*\***\_\_\_**\*\***

**Notes:**

### 1.2 Project detection — when should the app decide which entry point to show?

- [ ] On startup, backend checks if source files exist (heuristic: count non-config files)
- [ ] User explicitly chooses ("Start new project" vs "Analyze existing")
- [x] Both — auto-detect but let user override
- [ ] Not needed yet — single entry point for now

**Notes:**

---

### 1.3 Unified `codebase-analysis.json` — the common contract between both entry paths

**Decision:** `codebase-analysis.json` is the shared handoff format for **both** entry paths. A new-project agent (code generation agent) produces the exact same JSON structure as the existing-codebase discovery agent. The UI reads only this file — it has no idea which path was used.

The difference between the two paths is expressed through a small set of flags at the project and domain level, not through a different schema:

```json
{
  "projectOrigin": "existing" | "new",
  "hasFrontend": true | false,
  "domains": [
    {
      "id": "user-authentication",
      "name": "User Authentication",
      "businessPurpose": "...",
      "files": [...],
      "priority": "P0",
      "hasCode": true | false,
      "hasAnalysis": false
    }
  ]
}
```

**`projectOrigin`** — `"existing"` when the project was imported/scanned; `"new"` when domains were planned by the new-project agent before any code was written.

**`hasFrontend`** — detected automatically by scanning for framework deps and frontend directories. Written by the discovery agent for existing projects; declared explicitly by the new-project agent based on what it plans to scaffold. Drives the design agent branching (see section 14, question 4).

**`hasCode`** — `true` for all domains in existing projects (code already exists). `false` for domains in new projects where code has not been generated yet. When `false`, the domain card replaces all analysis action buttons (Docs, Reqs, Bugs, Tests) with a single **"Generate Code"** button. After code generation runs for a domain, `hasCode` flips to `true` and the full audit UI becomes available — same card, same layout, different controls.

**The domain card state machine:**

```
hasCode=false                      →  [ Generate Code ]
hasCode=true, hasAnalysis=false    →  [ Analyze ]
hasCode=true, hasAnalysis=true     →  [ Docs ] [ Reqs ] [ Bugs ] [ Tests ]
```

This means a new project flows the user naturally into the same UI they would see for an existing project — no separate screen or separate product. Just a progressive reveal as more pipeline stages complete.

---

## 2. Hierarchy Problem — "Section / Area" Naming

### Current structure

```
Project
  └── Domain (auth, payments...)
        └── Section (documentation, requirements, bugs...)
```

### Problem

"Section" is generic and doesn't scale. More importantly, Design doesn't belong at the domain level — it spans the entire product.

### Proposed new structure

```
Project
  ├── Project-level features    (one instance per project)
  │     ├── 🎨 Design           ← this discussion
  │     ├── 🔍 Review Changes   ← already exists
  │     └── ⚙️  E2E Config       ← already exists
  │
  └── Domains[]                 (many, each a logical code slice)
        └── Domain Areas[]      (per-domain analysis)
              ├── Documentation
              ├── Diagrams
              ├── Requirements
              ├── Bugs & Security
              └── Refactoring & Testing
```

### 2.1 Rename `section` → `area`?

- [x] Yes — rename now before adding more things
- [ ] Yes — but only after the architecture decisions below are settled
- [ ] No — keep `section`, it's fine
- [ ] Different name: **\*\***\_\_\_**\*\***

**Notes:**

---

## 3. Design — Project-Level Feature

Design is not a domain area. It is a **project-level feature** that:

- Describes the whole product (screens, flows, component system)
- Links outward to individual domains (Login screen → Auth domain)
- Can be an entry point for navigating the entire platform

### 3.1 What is the scope of Design for now?

- [ ] **Audit mode only** (existing projects): scan CSS/components, reverse-engineer design system, report drift
- [ ] **Creation mode only** (new projects): generate wireframes, tokens, component inventory from scratch
- [x] **Both modes**, unified Design feature, adapts based on project state
- [ ] **Start with audit mode**, add creation mode later

---

### 3.2 Shared agent architecture for both modes

**Decision: both audit mode and creation mode use the same master → sub-agent delegation pattern.**

There is no separate "audit agent" and "creation agent" at the architecture level. There is one design master agent that drives the process differently depending on the project state — but the spawning model, the sub-agent contract, and the output schema are identical in both modes.

```
                 AUDIT MODE                         CREATION MODE
                 ──────────                         ─────────────
                 Reads codebase                     Reads idea + research
                        │                                  │
                        ▼                                  ▼
               ┌─────────────────┐              ┌─────────────────┐
               │  Design master  │              │  Design master  │
               │  (same agent)   │              │  (same agent)   │
               └────────┬────────┘              └────────┬────────┘
                        │ delegates                      │ delegates
           ┌────────────┼────────────┐      ┌────────────┼────────────┐
           ▼            ▼            ▼      ▼            ▼            ▼
       Screen        Screen       Screen  Screen      Screen       Screen
       sub-agent     sub-agent    sub-agent sub-agent  sub-agent   sub-agent
       [Login]       [Dashboard]  [Settings] [Onboard] [Dashboard] [Settings]
           │            │            │          │           │           │
           └────────────┴────────────┘          └───────────┴───────────┘
                        │                                   │
                        ▼                                   ▼
               design/screens/*.html              design/screens/*.html
               (reverse-engineered)               (generated from scratch)
```

The master agent owns: planning, foundation extraction/generation, work partitioning, sub-agent spawning via `delegate_task`, and final consistency validation.

Each sub-agent owns: one slice of the screen inventory, operating entirely within the shared foundation.

---

### 3.3 Audit mode — how it works (existing projects)

The design master agent scans the real codebase and produces a **living prototype** that represents the current state of the product.

**Phase 1 — Foundation extraction (master agent runs alone)**

Agent reads all CSS files, Tailwind config, CSS-in-JS, component libraries in use. Extracts:

- Color palette (primary, secondary, neutrals, semantic colors)
- Typography scale (font families, sizes, weights, line heights)
- Spacing system (padding/margin scales, grid, breakpoints)
- Shadow, border radius, animation tokens

Also reads route files, page components, navigation config to build the full screen list.

Produces: `design/foundation.json`, `design/screen-inventory.json`

Partitions screens into N groups (based on count and complexity) and spawns one sub-agent per group via `delegate_task`.

**Phase 2 — Parallel screen reverse-engineering (N sub-agents)**

Each screen sub-agent receives: its assigned screens + foundation.json (read-only).

For each assigned screen:

- Reads the component tree for that screen
- Understands the layout, data hierarchy, and interactive regions
- Generates a faithful HTML wireframe applying the extracted design tokens — not blank boxes, real layout with real type hierarchy and real colors

Writes: `design/screens/<screen-name>.html`

**Phase 3 — Aggregation + drift detection (master agent resumes)**

Master agent reads all generated screen files and cross-references against the foundation:

- Colors used but not in the token system
- Typography deviating from the scale
- Components that break the grid
- Screens with no consistent header/nav structure

Produces: `design/audit.json` (drift findings, each with file + line reference)

**Output to user:**

- Browse the generated prototype (all screens, clickable)
- See the extracted design system (tokens, palette, typography)
- Review drift findings grouped by severity

---

### 3.4 Creation mode — how it works (new projects)

The design master agent starts from a blank slate (or research output if available) and generates a complete design system and prototype for a product that doesn't exist yet.

**Phase 1 — Foundation generation (master agent runs alone)**

Agent reads: idea description, research report (optional), any brand hints the user provided.
Generates a design system from scratch:

- Chooses a color palette appropriate for the product category
- Picks typography that fits the brand tone
- Defines spacing, grid, component styles

Produces: `design/foundation.json` (same schema as audit mode)

Also plans what screens the product needs and how to partition them:

- Onboarding / auth flow
- Core feature screens
- Settings / account management
- Error / empty states

Produces: `design/screen-inventory.json` (same schema as audit mode)

Partitions screens into N groups and spawns one sub-agent per group via `delegate_task`.

**Phase 2 — Parallel screen generation (N sub-agents)**

Each screen sub-agent receives: its assigned screens + foundation.json (read-only).

For each assigned screen:

- Designs the layout, content hierarchy, and interactive regions appropriate for the screen's purpose
- Generates an HTML wireframe applying the foundation tokens — styled with real colors, type scale, and spacing

Writes: `design/screens/<screen-name>.html`

**Phase 3 — Consistency validation (master agent resumes)**

Master agent reads all generated screen files and validates against the foundation.
Flags any divergence introduced by sub-agents during parallel generation.
Produces: `design/complete.json`

**Output to user:**

- Full clickable prototype of the product (before a line of code exists)
- Complete design system ready to hand to developers
- Screen inventory that feeds directly into Requirements agent

---

### 3.5 The unified prototype — what it is in both modes

Both modes converge on the same artifact: **a folder of HTML files + a foundation.json**. The schema is identical — the agent architecture is identical. Only the input differs.

This means:

- Same viewer component in the React app
- Same linking mechanism to domains (section 4)
- Same edit/regenerate workflow
- Audit mode output can be _evolved_ into creation mode output — the user modifies the extracted prototype rather than starting from scratch

The difference is only what Phase 1 reads: real codebase files (audit) vs. idea description + research report (creation).

### 3.6 How does "further modifications" work?

After the prototype is generated, the user should be able to:

1. **Chat with the design agent** — "make the dashboard more data-dense", "add a dark mode variant for the login screen" → master agent decides whether to handle in-place or spawn a targeted sub-agent; edits specific screen HTML files and updates foundation.json
2. **Trigger partial regeneration** — re-run only specific screens without regenerating the whole prototype; master agent spawns sub-agents only for the affected slice
3. **Manually edit** — HTML files are human-readable, a developer can edit directly and the platform tracks that it was manually modified (not regenerated)

The feedback loop: **prototype modifications feed back into requirements**. If the user changes the dashboard layout in the prototype, the requirements agent can be asked to re-derive requirements from the updated design.

### 3.7 Open questions for design modes

1. **Should extraction in audit mode try to produce _pretty_ wireframes or pixel-faithful reproductions?**

   > Answer: \_\_\_

2. **When the user chats to modify a screen, does the master agent handle it directly or always spawn a sub-agent?**

   > Answer: \_\_\_

3. **What triggers audit mode on an existing project — is it automatic on first run, or strictly user-initiated?**

   > Answer: User-initiated — user clicks "Import Design" on the Design page.

---

## 5. Design Artifact Format

What format does the design agent produce?

### 5.1 Wireframes

- [x] **HTML mockups** (like current `frontend/designs/` folder, static self-contained files)
- [ ] **Mermaid screen flow diagrams** (text-based, versionable, less visual)
- [ ] **JSON schema** (structured data, rendered by the React app)
- [ ] **SVG** (scalable, can embed metadata for links)
- [ ] Combination: **\*\***\_\_\_**\*\***

**Notes:**

### 5.2 Design system / tokens

- [x] `design-system.json` — color palette, typography, spacing, shadows
- [ ] CSS variables file (`:root { --color-primary: ... }`)
- [ ] Both (JSON as source of truth, CSS generated from it)
- [ ] Not needed yet

**Notes:**

### 5.3 Where are design artifacts stored?

- [x] `.code-analysis/design/` — alongside all other analysis output
- [ ] `.code-analysis-design/` — separate top-level folder
- [ ] `design/` — in project root (visible, intentional artifact)
- [ ] Other: **\*\***\_\_\_**\*\***

**Notes:**

---

## 6. Navigation Model in the App

**Decided.** Three clear additions to the existing layout, no new navigation layer needed:

### 6.1 Empty project screen

When no `.code-analysis/` data exists yet, the app shows a "start here" screen instead of an empty domain list. Two paths:

- **Analyze existing codebase** → kicks off the domain discovery agent (current flow)
- **Start new project** → enters the new-project onboarding flow (research → design → scaffold)

### 6.2 Design mode toggle

A **"Design" button** lives in the top sidebar next to the project name. Clicking it switches the entire layout to the Design panel. While in design mode, the button label changes to **"Project"** — clicking it returns to the normal domain dashboard.

No separate route needed. The toggle swaps the main content area. State can be a simple URL param (`?mode=design`) so users can link to it.

### 6.3 Market analysis

**Research is a separate product with its own pricing plan.** It is not part of the codebase-analyzer — it is a standalone tool that happens to share infrastructure but is marketed and sold independently.

Its role in the business model:

- User comes to the research product with an idea
- Research agent analyses the market, competitors, pricing landscape
- Report concludes with an AI-generated verdict: is this worth building?
- If positive: the report ends with a **conversion CTA** — "Looks like a solid opportunity. Want to build it? Start your project on [platform name]" — deep-linking into the dev platform's new-project onboarding flow with the research report pre-loaded as context
- If the user doesn't convert, they can **export the report** and take it anywhere

The research product is a top-of-funnel lead generator for the dev platform. No tight coupling in the code — the handoff is a URL + an exportable JSON file.

---

## 7. Phasing — What to Build and When

**Revised phases based on all decisions above:**

```
Phase 1 — Empty project screen
  Detection: backend checks if .code-analysis/ has useful data
  Frontend shows "start here" screen with two entry points
  No new backend work needed — existing status endpoint is sufficient

Phase 2 — Design mode toggle + Design panel (existing project, audit mode)
  "Design" button in top sidebar
  Design panel: Foundation tab, Screens tab (prototype browser), Audit tab
  New TASK_TYPES.DESIGN_IMPORT + system instruction file (master + sub-agent pattern)
  Persists to .code-analysis/design/

Phase 3 — New project flow
  Research agent → standalone market analysis page (with export)
  Design agent in creation mode (same master/sub-agent architecture as audit)
  Requirements agent seeded from design output
  Code generation agent — writes the actual project scaffold from requirements + design
  Generated code feeds directly into the unified analysis pipeline (domain breakdown, bugs, tests, etc.)

Phase 4 — Design chat & partial re-import
  Chat with design agent to evolve prototype after initial import
  Re-import specific screens when codebase changes
```

Domain linking remains out of scope (see section 4).

---

## 8. Prototype First?

~~Deferred — build HTML prototypes to answer navigation questions.~~

**Navigation questions are resolved** (see section 6). No prototype needed before starting implementation. Go straight to Phase 1 backend + Phase 2 design panel.

---

## 9. Modularity — Agents as Composable Units

Each agent (research, design, domain analysis) must be self-contained: its own input contract, output schema, system instructions, and persistence layer. The composition points between agents are clean JSON handoffs — no tight coupling.

**One repo, one backend, one `package.json`.** Research lives in the current `backend/` as new routes, a new task type, and new system instructions — alongside everything else. The "empty project" screen is its natural entry point.

If the platform is ever split into separately deployed products, that's a future business and ops decision. Cross that bridge when you're actually running two separate deployments.

### Input/output contracts

- **Informal convention for now** — JSON files with documented schemas, no enforcement tooling
- **Upgrade path**: add JSON Schema files for the handoff formats (research report → design agent, design foundation → screen agents, etc.) when the contracts stabilize

---

## 10. Multi-Agent Parallelism

This is a core scalability principle. No single LLM can generate a complete design for a large project in one pass — context windows are finite and quality degrades as scope grows.

The solution: **spawn N agents in parallel, each with a focused context, all referencing a shared foundation**.

### How it maps to the existing `delegate_task` tool

The project already has a working `delegate_task` mechanism:

1. Parent agent writes a delegation request file to `.code-analysis/temp/delegation-requests/` describing exactly what the child agent should do (its context, inputs, goal)
2. Parent calls `delegate_task` with the request file path, task type, and domain ID
3. The backend enqueues the child task — it runs as a full, independent queued task
4. Child agent executes, writes its output to `.code-analysis/`, completes

This is exactly the mechanism that research sub-agents and parallel design screen-agents will use. **No new spawning infrastructure is needed** — only new task types and updated delegation support for project-level (non-domain-scoped) tasks.

#### Current limitation to address

`delegate_task` currently requires a `domainId`, because it was built for domain-level delegations (edit-documentation, edit-requirements, etc.). Research and design agents are project-level — they have no domain. The `domainId` parameter needs to become optional, with project-level task types using a project-scoped queue instead.

### How it works

```
                    ┌─────────────────────────────┐
                    │     SHARED FOUNDATION        │
                    │  design-system.json (tokens) │
                    │  brand-guidelines.json        │
                    │  component-inventory.json     │
                    │  screen-list.json             │
                    └──────────────┬──────────────┘
                                   │ injected as context into every agent
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     Agent: Login page    Agent: Dashboard    Agent: Settings page
     (focused context)    (focused context)   (focused context)
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                        Merge → complete design
```

### Agent data flow — Research

The research master agent drives a dynamic two-phase process:

**Phase 1 — Discovery (master agent runs alone)**

```
User provides: idea description
       │
       ▼
Research master agent
  - Searches the internet by keywords derived from the idea
  - Identifies N competitor / related products
  - Writes competitor-urls.json (list of {name, url, reason})
  - For each competitor: calls delegate_task → spawns a sub-agent
```

**Phase 2 — Parallel exploration (N sub-agents, one per competitor)**

```
Sub-agent [Competitor A]          Sub-agent [Competitor B]      ...
  - Receives: {name, url}           - Same pattern
  - Uses Chrome DevTools MCP
      → navigate app
      → screenshot key screens
      → extract features from DOM
      → read pricing page
  - Writes: research/competitors/competitor-a.json
     {
       name, url,
       features: [...],
       missingFeatures: [...],
       pricing: {...},
       screenshots: [...],
       notes: "..."
     }
```

**Phase 3 — Aggregation (master agent resumes)**

```
Master agent reads all competitor-*.json files
  → produces research/report.json
  → USER GATE: shown as report, user decides go/no-go
```

The master agent decides **how many sub-agents to spawn** based on how many competitors it found. No hardcoded limit — it's a judgment call made autonomously.

---

### Agent data flow — Design

The design master agent drives the same three-phase process in both modes. The difference is only the input it reads in Phase 1 — real codebase vs. idea description. The spawning model, sub-agent contract, and output schema are identical.

**Phase 1 — Planning / extraction (master agent runs alone)**

```
AUDIT MODE                              CREATION MODE
──────────────────────────────────      ──────────────────────────────────
Input: existing codebase                Input: idea + research-report.json (optional)
       │                                       │
       ▼                                       ▼
Design master agent                     Design master agent
  - Reads CSS, theme configs,             - Derives a color palette, type scale,
    component libraries, route files        spacing system appropriate for the idea
  - Extracts design tokens                - Plans what screens the product needs
  - Maps existing screens                 - Maps screen structure from scratch
  - Decides partitioning                  - Decides partitioning
  - Writes design/foundation.json         - Writes design/foundation.json (same schema)
  - Writes design/screen-inventory.json   - Writes design/screen-inventory.json (same schema)
  - Writes design/plan.json               - Writes design/plan.json
  - Spawns N screen sub-agents            - Spawns N screen sub-agents
    via delegate_task                       via delegate_task
```

**Phase 2 — Parallel screen work (N sub-agents, same contract in both modes)**

```
Screen sub-agent [slice A]         Screen sub-agent [slice B]      ...
  - Receives: assigned screens       - Same pattern
  - Reads (read-only):
      design/foundation.json
      design/screen-inventory.json
  AUDIT: reverse-engineers each      CREATION: designs each screen
  screen from the component tree     from the foundation + product intent
  - Writes: design/screens/<name>.html (same format, same schema)
```

**Phase 3 — Aggregation (master agent resumes, same in both modes)**

```
Master agent reads all screens/*.html
  AUDIT: cross-references against foundation → produces design/audit.json (drift report)
  CREATION: validates consistency across sub-agents → produces design/complete.json
  Both: USER GATE — user reviews before proceeding
```

The master agent decides **how many sub-agents to spawn and what each one covers** — a small app might be one agent, a large platform might spawn 15. The master owns that judgment autonomously based on screen count and complexity.

---

### The research report — a separate product with a conversion CTA

**Research is its own product, not a gate inside the dev platform.** It runs independently, has its own pricing, and is marketed separately. Its output:

- **Competitor matrix** — feature comparison table across all found products
- **Market opportunity** — size, growth, gaps not covered by competitors
- **Pricing landscape** — what exists and at what price points
- **Risk signals** — crowded market, dominant player, declining interest
- **Recommendation** — AI-generated verdict: is this worth building?

If the verdict is positive, the report surfaces a **conversion CTA**: "Looks like a solid opportunity. Want to build it?" — this deep-links the user into the dev platform's new-project onboarding with the research report pre-loaded as context (passed as an exported JSON).

If the user doesn't convert, they export the report and go elsewhere. The handoff is a URL + a JSON file — no tight code coupling between the two products.

---

### Chrome DevTools MCP — where it actually lives

Tool available **only to research sub-agents**. Each sub-agent uses it to explore one competitor app:

- Navigate the live app
- Screenshot key screens
- Extract DOM structure to identify features and UI patterns
- Read pricing pages

Design agents never use it. They work exclusively from `research/report.json` and `design/foundation.json`.

---

### Shared foundation — the consistency contract

Every parallel design screen-agent receives the same read-only foundation injected as context. This prevents divergence across agents:

- **Design tokens** — colors, typography, spacing scale, shadows, border radii
- **Brand guidelines** — logo rules, tone of voice, do/don't examples
- **Component inventory** — names and props of all available components
- **Screen list** — full list of all screens (so each agent knows where its screens fit)

Written once by the master agent. Never modified by screen agents.

---

### 10.1 Should multi-agent parallelism be a first-class architectural constraint?

- [ ] Yes — the orchestrator must support spawning N agents for a single task from day one
- [x] Yes — but implement single-agent first, parallelize later (the JSON contracts make this easy to add)
- [ ] Not decided yet

**Notes:** `delegate_task` already handles this. Single-agent first, then parallelism is just calling `delegate_task` N times.

### 10.2 What is the unit of parallelism for design agents?

- [ ] **Per screen** — one agent per screen/page
- [ ] **Per domain** — one agent per code domain (ties design back to code structure)
- [ ] **Per section type** — one agent for all auth screens, one for all dashboard screens
- [x] **Agent decides autonomously** — master agent partitions work based on project complexity
- [ ] Not decided yet

**Notes:**

### 10.3 How should the orchestrator handle partial failures?

If 8 of 10 parallel agents succeed but 2 fail:

- [x] Retry failed agents automatically
- [ ] Mark partial result as complete, flag failed screens for manual retry
- [ ] Fail the whole task (atomic)

**Decided:** Retry logic lives in the **queue processor** (`orchestrators/queue-processor.js`), not in individual task executors or the master agent.

The queue processor checks whether a task is a delegated sub-task by the presence of `delegatedByTaskId` on the task object. If it exists, the task is a sub-task and qualifies for automatic retry. A `retryCount` field tracks how many times it has been tried; on the 4th failure the task is marked permanently failed.

```
task: {
  ...
  delegatedByTaskId: "parent-task-id",  // present on sub-tasks, set by delegate_task tool
  retryCount: 0,                         // incremented by queue processor on each failure
  maxRetries: 3                          // hardcoded in queue processor
}
```

---

## 11. Agent Tooling

Each agent type needs different tools. This also determines what MCP servers and external integrations the platform must support.

### Research master agent tools

| Tool            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| Web search API  | Find competitors by keywords derived from idea description    |
| `delegate_task` | Spawn per-competitor sub-agents                               |
| `write_file`    | Write `research/competitor-urls.json`, `research/report.json` |
| `read_file`     | Read completed sub-agent output files                         |

The master agent's job is purely orchestration: search → identify targets → delegate → aggregate.

### Research sub-agent tools (one per competitor)

| Tool                | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| Chrome DevTools MCP | Navigate competitor app, extract DOM, read pricing page |
| `write_file`        | Write `research/competitors/competitor-X.json`          |

**What sub-agents collect per competitor:**

- Features present and notable absences
- Pricing: plans, price points, free tier, trial
- Company info: founding year, country, estimated customer count, funding
- Links: homepage, app URL, docs, social, job listings (signals company health)
- Screenshots of key screens (mode-dependent — see below)
- Overall positioning and target market

### Design master agent tools

| Tool            | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `read_file`     | Read `research/report.json`, existing codebase info |
| `write_file`    | Write `design/foundation.json`, `design/plan.json`  |
| `delegate_task` | Spawn N screen agents (count decided autonomously)  |

The master plans the full app structure, writes the foundation, then delegates. It decides partitioning based on project complexity — no hardcoded limit.

### Design screen agent tools

| Tool         | Purpose                                           |
| ------------ | ------------------------------------------------- |
| `read_file`  | Read `design/foundation.json`, `design/plan.json` |
| `write_file` | Write `design/screens/<name>.json`                |

Screen agents are intentionally narrow — they only design the screens assigned to them and must stay consistent with the shared foundation.

---

## 12. Chrome DevTools MCP — Headless Mode & Screenshots

Chrome DevTools MCP can run in two modes:

| Mode                         | When                                          | Screenshots                   |
| ---------------------------- | --------------------------------------------- | ----------------------------- |
| **Headed** (local)           | Running the platform locally on dev machine   | ✅ Full screenshots available |
| **Headless** (server / SaaS) | Hosted deployment, research tool as a product | ⚠️ No visual screenshots      |

### Headless limitation

In headless mode, the sub-agent can still collect:

- Full DOM structure and text content
- Page title, meta description, navigation structure
- Pricing text, feature lists, CTA copy
- All links and their anchor text

It cannot collect:

- Visual screenshots of the UI
- CSS-derived visual design patterns
- Anything that requires rendering to be meaningful

**Decision for now**: headless-first is acceptable. The research report's value is in competitive intelligence (features, pricing, market data), not visual screenshots. Screenshots are a nice-to-have enhancement for the local/headed mode, not a blocker.

### 12.1 Should the platform detect headless vs. headed and adapt output?

- [ ] Yes — enrich output with screenshots when headed, skip when headless
- [x] Yes — but this is future work, headless-only for now
- [ ] No — always headless for consistency

**Notes:**

---

## 13. Research as a Separate Product — Not a Feature

Research has no relationship to codebase analysis. It answers a fundamentally different question: **"Should I build this at all?"** — before a single line of code exists.

### Two separate products, one funnel

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT 1: Market Research Tool              │
│                                                                  │
│  User has an idea → runs research → gets go/no-go report        │
│                                                                  │
│  Standalone SaaS. No codebase. No local CLI. Hosted entirely.   │
│  Monetized independently (free tier + subscription).            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              "I want to build it"
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               PRODUCT 2: Development Platform                   │
│                                                                  │
│  Design → Requirements → Scaffold → Analyze → Fix → Test        │
│                                                                  │
│  Can start from scratch (research output as seed)               │
│  or integrate into existing codebase.                           │
│  Runs locally (CLI) or hosted.                                  │
│  Separate subscription.                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Business model

| Tier   | Product              | What you get                                |
| ------ | -------------------- | ------------------------------------------- |
| Free   | Research             | 5 market research reports                   |
| Paid   | Research             | Unlimited reports                           |
| Paid   | Development Platform | Full lifecycle: design → code → analysis    |
| Bundle | Research + Platform  | Research report seeds the platform directly |

The research tool is the **top of the funnel**. A user who just validated their idea with a research report is the ideal customer for the development platform — they already trust the AI output quality and have a concrete next step.

### What this means architecturally

Research must be buildable and deployable **completely independently** of the development platform codebase. Today they live in the same repo for convenience — that's fine. But the internal structure must reflect the independence:

- Research agent logic: no imports from domain-analysis modules
- Research API routes: mountable as a standalone Express app
- Research persistence: must work with both local filesystem and cloud storage
- Research output schema: no `domainId`, no section types, no platform-specific concepts

The development platform **optionally consumes** research output as seed input — it reads `research/report.json` if present. But it never depends on research being available.

### 13.1 Should we isolate research agent files now (no domain coupling)?

- [x] Yes — research system instructions and schemas must be domain-agnostic from the start

**Decided:** Reorganize `backend/system-instructions/` into subdirectories by agent scope:

```
backend/system-instructions/
  domain/                     ← per-domain analysis instructions (existing)
    analyze-domain-bugs-security.md
    analyze-domain-diagrams.md
    analyze-domain-documentation.md
    analyze-domain-refactoring-and-testing.md
    analyze-domain-requirements.md
    edit-bugs-security.md
    edit-diagrams.md
    edit-documentation.md
    edit-requirements.md
    edit-refactoring-and-testing.md
    implement-finding-fix.md
    implement-test.md
    apply-refactoring.md
  project/                    ← project-level instructions (new + some existing)
    analyze-full-codebase.md
    edit-codebase-analysis.md
    edit-domain-section.md
    review-changes.md
    custom-codebase-task.md
    design-import.md          ← new: audit mode master agent
    design-screen.md          ← new: screen sub-agent (both modes)
  research/                   ← research product instructions (new)
    research-master.md
    research-competitor.md
```

This is a structural enforcement — file location makes scope obvious and prevents domain instructions from being accidentally reused for project/research agents. Do the reorganization when adding the first new instruction file (design or research), not as a standalone refactor.

### 13.2 Freemium model — tracked where?

- [x] Backend tracks usage per user/API key, enforces limit
- [ ] Out of scope for now — just build the agent, worry about billing later
- [ ] Other: **\*\***\_\_\_**\*\***

**Notes:**

---

## 14. Open Questions

> ℹ️ Sections 11–13 added above cover tooling, headless mode, and SaaS isolation.

Things not yet decided that may affect architecture:

1. **What happens when the user re-analyzes a domain — does the Design auto-update?**

   > **Answer:** Not related. The Design prototype is a standalone, pure browser app that uses only mocked data — it has no connection to the live codebase analysis pipeline. Re-analyzing a domain never touches the prototype. The prototype is a separate artifact: a reference and communication tool, not a live reflection of the code.

2. **Is Design the right name, or should it be "Product Design" / "UI Design" / "Prototype"?**

   > **Answer:** Keep **"Design"** as the top-level label in the sidebar toggle. Inside the Design panel, there are two views: **"Prototype"** (the full clickable prototype with screen navigation) and **"Components"** (a component gallery with isolated examples). The Design panel is a browser-only viewer — it serves HTML mockup files from `.code-analysis/design/` in an iframe. All data inside those files is mocked; nothing is fetched from the backend at runtime.

3. **Should `frontend/designs/` be repurposed as where the agent writes project wireframes, or stay as internal code-analyzer UI prototyping?**

   > **Answer:** `frontend/designs/` human-authored prototypes for the codebase-analyzer platform itself are moved to `.code-analysis/design/` — the same folder that agent-generated wireframes use. There is no longer a distinction between human-authored and agent-generated design artifacts at the folder level; both live in `.code-analysis/design/` and are served as static files by the backend. `frontend/designs/` is removed.

4. **How does the design agent handle projects with no frontend (pure API / backend)?**

   > **Answer:** Stored in `codebase-analysis.json` as `hasFrontend: boolean`, detected by the discovery agent (no `frontend/`/`client/`/`web/` directories, no framework deps in any `package.json`) or declared explicitly by the new-project agent.
   >
   > The design agent branches on this flag:
   >
   > - **`hasFrontend: true`** — normal audit/import flow (existing project) or full creation mode (new project).
   > - **`hasFrontend: false`, project has API routes** — design panel shows "No UI detected. Want to design one?" → creation mode seeded from discovered route definitions, data models, and inferred CRUD screens rather than a blank slate. Produces the same `design/screens/` output and the same foundation JSON.
   > - **`hasFrontend: false`, no HTTP API either (CLI tool, library, etc.)** — Design panel is hidden entirely. The "Design" button in the sidebar is replaced with a disabled indicator and a tooltip: "Design is not available for this project type."

5. **Who owns the "composition layer" (pipeline ordering, agent handoffs) — the backend orchestrator, a config file, or the UI?**

   > **Answer:** The **AI agent** owns it — there is no separate composition layer. The only pipeline mechanism is `delegate_task`, and sub-agent spawning decisions are made autonomously by master agents at runtime, not pre-wired in config or orchestrator code.
   >
   > The current model:
   >
   > - **User** initiates master agents only (clicks Analyze, clicks Generate Code, etc.)
   > - **Master agent** decides what sub-tasks to spawn, when, and with what context — entirely at inference time
   > - **Backend orchestrator** (`queue-processor.js`) is a dumb runner: it executes tasks from the queue, handles retries, emits socket events — it has no knowledge of pipeline shape
   > - **No config file** describes pipeline order — that knowledge lives in the master agent's system instructions
   >
   > This question is therefore moot for now. It becomes relevant only if we ever want to hardcode a fixed multi-step pipeline that runs automatically without a master agent driving it. That is not the current design.

---

## 15. Decisions Log

> Record final decisions here once discussions above are resolved.

| #   | Decision                                                  | Decided |
| --- | --------------------------------------------------------- | ------- |
| 1.1 | One pipeline, two entry points (new vs. existing project) | ✅      |
| 1.2 | Auto-detect project state, but allow user override        | ✅      |
| -   | —                                                         | —       |
