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
        ⚙️  Code scaffold                │
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

Currently the app has: Dashboard → Domain Details page.

With project-level features, we need a new navigation layer.

### 6.1 How should project-level features appear in the UI?

- [ ] **Top-level tabs/nav** alongside the domain list (e.g. "Design | Domains | Review")
- [ ] **Dashboard sections** — separate card areas for project-level vs. domain-level
- [ ] **Sidebar navigation** — persistent nav, Design has its own entry
- [ ] **Modal / overlay** — Design opens as a full-screen overlay from the dashboard
- [ ] Not decided yet

**Notes:**

### 6.2 Should Design be its own full page (route)?

- [ ] Yes — `/design` route, its own page
- [ ] No — embedded in dashboard
- [ ] Yes, but only if it becomes a navigation hub with links to domains

**Notes:**

---

## 7. Phasing — What to Build and When

### Proposed phases

```
Phase 1 — Project detection
  Backend detects new vs. existing project
  Status endpoint returns projectType: "new" | "existing"
  Frontend shows appropriate entry point

Phase 2 — Design agent (existing project, audit mode)
  New TASK_TYPES.DESIGN + system instruction file
  Persists to .code-analysis/design/
  Design page in the React app (read-only first)
  No domain linking yet

Phase 3 — Design ↔ Domain linking
  AI-inferred screen → domain mappings
  Clickable wireframe regions in the design page
  Back-links from domain areas to design screens

Phase 4 — New project flow
  "Start from scratch" onboarding
  Research agent + Brainstorm agent
  Design agent in creation mode
  Requirements agent seeded from design output
```

### 7.1 Does this phasing make sense?

- [ ] Yes, in this order
- [ ] Yes, but skip Phase 1 for now — project detection can come later
- [ ] Phases 2 and 3 should be a single phase
- [ ] Phase 4 is the priority — new project flow first
- [ ] Different order: **\*\***\_\_\_**\*\***

**Notes:**

---

## 8. Prototype First?

Before implementing any of the above, a static HTML prototype (in `frontend/designs/`) would:

- Show the new top-level navigation structure visually
- Mock a Design page with a wireframe + domain links
- Answer questions 4–6 cheaply before touching React or backend schemas

### 8.1 Should we build an HTML prototype before React implementation?

- [ ] Yes — prototype the design page and nav model first
- [ ] No — decisions are clear enough, go straight to implementation
- [ ] Partial — prototype only the Design page layout, nav is clear

**Notes:**

---

## 9. Modularity — Agents as Independently Shippable Products

This is a key architectural principle that should be decided early, because it affects how agents are structured internally.

Each agent in the platform should be **independently shippable** as a standalone product, while also being composable into the full pipeline. Examples:

| Agent / Module                  | Standalone product                                                       | Combined product                     |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| Research                        | "Market Research Tool" — analyze competitors, market size, user personas | Feeds brainstorm + design stages     |
| Research + Design               | "Product Discovery Tool" — research → wireframes → component spec        | Feeds requirements + scaffold stages |
| Research + Design + Code export | "Idea to Prototype Tool" — full new project flow                         | Feeds into full platform             |
| Full platform                   | "Development Lifecycle Platform"                                         | The complete vision                  |

### What this means technically

Each agent must be:

- **Self-contained**: its own input contract, output schema, system instructions, and persistence layer
- **Composable**: its output is a well-defined JSON that the next agent can consume as input
- **Configurable at deploy time**: a "Research-only" deployment simply doesn't mount the other agents/routes
- **UI-agnostic**: the agent logic lives in the backend; different frontends can wrap different subsets

The composition points (where one agent's output feeds the next) are the API layer — clean JSON handoffs, no tight coupling.

### 9.1 Should agent modularity be a first-class constraint from the start?

- [ ] Yes — every new agent must have a standalone-ready interface before being wired into the platform
- [ ] Yes — but enforce this only for new-project-flow agents (research, brainstorm, design); existing analysis agents are already scoped anyway
- [ ] Not yet — get the full platform working first, extract standalone products later
- [ ] Different approach: **\*\***\_\_\_**\*\***

**Notes:**

### 9.2 How should agents declare their input/output contracts?

- [ ] JSON Schema files (like current `designs/v1/data/contracts.json`)
- [ ] TypeScript interfaces (shared types package)
- [ ] Informal convention — documented but not enforced
- [ ] Not decided yet

**Notes:**

### 9.3 How should multi-agent composition be configured?

- [ ] **Environment variables / config file** — `ENABLED_AGENTS=research,design,code-analysis` at deploy time
- [ ] **Backend plugins** — each agent registers itself, platform mounts what's present
- [ ] **Separate npm packages** — each agent is a package, the platform imports what it needs
- [ ] **Monorepo workspaces** — agents live in `packages/agent-research`, `packages/agent-design`, etc.
- [ ] Not decided yet

**Notes:**

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

### The research report — a user gate

Research output is a **go/no-go report** presented to the user before any design work begins:

- **Competitor matrix** — feature comparison table across all found products
- **Market opportunity** — size, growth, gaps not covered by competitors
- **Pricing landscape** — what exists and at what price points
- **Risk signals** — crowded market, dominant player, declining interest
- **Recommendation** — AI-generated assessment: is this worth building?

Hard gate: design agents do not run until the user explicitly proceeds.

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

- [ ] Retry failed agents automatically
- [ ] Mark partial result as complete, flag failed screens for manual retry
- [ ] Fail the whole task (atomic)
- [ ] Not decided yet

**Notes:**

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
- [ ] Yes — but this is future work, headless-only for now
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

- [ ] Yes — research system instructions and schemas must be domain-agnostic from the start
- [ ] Yes — but this is enforced at code review, not structurally
- [ ] Not yet — clean up isolation later

**Notes:**

### 13.2 Freemium model — tracked where?

- [ ] Backend tracks usage per user/API key, enforces limit
- [ ] Out of scope for now — just build the agent, worry about billing later
- [ ] Other: **\*\***\_\_\_**\*\***

**Notes:**

---

## 14. Open Questions

> ℹ️ Sections 11–13 added above cover tooling, headless mode, and SaaS isolation.

Things not yet decided that may affect architecture:

1. **What happens when the user re-analyzes a domain — does the Design auto-update?**

   > Answer: **\*\***\_\_\_**\*\***

2. **Is Design the right name, or should it be "Product Design" / "UI Design" / "Prototype"?**

   > Answer: **\*\***\_\_\_**\*\***

3. **Should `frontend/designs/` be repurposed as where the agent writes project wireframes, or stay as internal code-analyzer UI prototyping?**

   > Answer: **\*\***\_\_\_**\*\***

4. **How does the design agent handle projects with no frontend (pure API / backend)?**

   > Answer: **\*\***\_\_\_**\*\***

5. **What is the right repo structure if agents become independently shippable — monorepo, separate repos, or npm packages?**

   > Answer: **\*\***\_\_\_**\*\***

6. **Who owns the "composition layer" (pipeline ordering, agent handoffs) — the backend orchestrator, a config file, or the UI?**

   > Answer: **\*\***\_\_\_**\*\***

---

## 15. Decisions Log

> Record final decisions here once discussions above are resolved.

| #   | Decision                                                  | Decided |
| --- | --------------------------------------------------------- | ------- |
| 1.1 | One pipeline, two entry points (new vs. existing project) | ✅      |
| 1.2 | Auto-detect project state, but allow user override        | ✅      |
| -   | —                                                         | —       |
