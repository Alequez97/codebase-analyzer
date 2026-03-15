/**
 * Domain Board Component
 *
 * Owns all data, rendering, and interactions for the priority-grouped
 * domain card board on the main dashboard.
 */

/* ══════════════════════════════════════════
   Data
══════════════════════════════════════════ */
const GROUPS = [
  {
    id: "p0", label: "P0", name: "Critical", count: 7,
    domains: [
      {
        title: "CLI Launcher",
        desc: "Starts the backend (and optional frontend) against a target project directory with auto-selected ports.",
      },
      {
        title: "Backend API & WebSocket Server",
        desc: "Serves REST APIs and real-time Socket.IO events for analysis workflows, task status, and UI updates.",
      },
      {
        title: "Task Queue & Orchestration",
        desc: "Queues, executes, retries, cancels, and recovers analysis and implementation tasks using a filesystem-backed queue.",
      },
      {
        title: "Codebase Analysis Generation",
        desc: "Generates and serves the top-level codebase analysis (summary + discovered domains) for the target project.",
      },
      {
        title: "Domain Analysis Sections (Docs/Diagrams/Requirements/Bugs/Testing)",
        desc: "Runs per-domain analyses to produce section outputs and enables fetching/saving those artifacts via APIs.",
      },
      {
        title: "Artifact Persistence & Revision Tracking",
        desc: "Persists analysis outputs and metadata (revisions, logs linkage, section paths) into the target project's .code-analysis structure.",
      },
      {
        title: "LLM Provider Integration",
        desc: "Selects LLM providers/models per task type and executes multi-turn tool-using agent runs.",
      },
    ],
  },
  {
    id: "p1", label: "P1", name: "High", count: 8,
    domains: [
      {
        title: "LLM Tools (File/Command/Delegation)",
        desc: "Provides safe file operations, safe command execution, and task delegation tools to LLM agents.",
      },
      {
        title: "Chat & Section Editing Workflows",
        desc: "Supports persistent per-domain/section chat sessions and AI-driven edit tasks for analysis sections.",
      },
      {
        title: "Custom Codebase Chat (Floating Agent)",
        desc: "Allows users to run freeform AI tasks across the target repo with socket-streamed progress and optional domain context.",
      },
      {
        title: "Review Changes Orchestration",
        desc: "Diffs git changes and delegates targeted edit tasks to keep analysis artifacts consistent with code changes.",
      },
      {
        title: "Implementation Workflows (Fixes/Tests/Refactors)",
        desc: "Queues and validates AI-applied code changes for fixes, test implementations, and refactoring applications.",
      },
      {
        title: "Logs, Progress, and Observability",
        desc: "Captures and serves task logs and progress updates to the UI and persists them for later inspection.",
      },
      {
        title: "Frontend Dashboard & Domain UI",
        desc: "Presents the codebase summary and domains, supports prioritization, and provides per-domain section views and editors.",
      },
      {
        title: "Frontend API Client & State Management",
        desc: "Coordinates API calls, caching, and UI state using Axios wrappers and Zustand stores.",
      },
    ],
  },
  {
    id: "p2", label: "P2", name: "Medium", count: 1, collapsed: true,
    domains: [
      {
        title: "Design System & Prototype",
        desc: "Manages design tokens, screen prototypes, and the design version gallery.",
      },
    ],
  },
  {
    id: "p3", label: "P3", name: "Low", count: 2, collapsed: true,
    domains: [
      {
        title: "Documentation & Guides",
        desc: "Contains project documentation, architectural guides, and onboarding materials.",
      },
      {
        title: "Configuration & Tooling",
        desc: "ESLint, Vite config, package manifests, and other build/dev tooling.",
      },
    ],
  },
];

/* ══════════════════════════════════════════
   SVG Icons
══════════════════════════════════════════ */
const SPARKLE_SVG = `
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z"/>
  </svg>`;

const CHEVRON_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`;

/* ══════════════════════════════════════════
   Render Helpers
══════════════════════════════════════════ */
function dragHandleHTML() {
  return `
    <div class="drag-handle">
      <div class="drag-dots">
        <span></span><span></span>
        <span></span><span></span>
        <span></span><span></span>
      </div>
    </div>`;
}

function cardTagsHTML() {
  return ["Docs", "Reqs", "Bugs", "Tests"]
    .map((t) => `<span class="card-tag"><span class="tag-dot"></span>${t}</span>`)
    .join("");
}

function domainCardHTML(domain) {
  return `
    <div class="domain-card">
      ${dragHandleHTML()}
      <div class="card-body">
        <div class="card-title">${domain.title}</div>
        <div class="card-desc">${domain.desc}</div>
        <div class="card-footer">
          <div class="card-tags">${cardTagsHTML()}</div>
          <div class="card-actions">
            <button class="btn-analyze">${SPARKLE_SVG} Analyze</button>
            <button class="btn-view">View →</button>
          </div>
        </div>
      </div>
    </div>`;
}

function groupHTML(group) {
  const collapsedClass = group.collapsed ? " collapsed" : "";
  const domainsHTML = group.domains.map(domainCardHTML).join("");

  return `
    <div class="priority-group ${group.id}${collapsedClass}" data-group="${group.id}">
      <div class="group-header" onclick="toggleGroup('${group.id}')">
        <div class="group-header-left">
          <div class="priority-dot"></div>
          <span class="priority-label">${group.label}</span>
          <span class="priority-sep"> · </span>
          <span class="priority-name">${group.name}</span>
        </div>
        <div class="group-header-right">
          <span class="count-badge">${group.count}</span>
          <span class="group-chevron">${CHEVRON_SVG}</span>
        </div>
      </div>
      <div class="group-body">
        <div class="cards-grid">${domainsHTML}</div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════
   Mount
══════════════════════════════════════════ */
document.getElementById("groups-root").innerHTML = GROUPS.map(groupHTML).join("");

/* ══════════════════════════════════════════
   Interactions
══════════════════════════════════════════ */
function toggleGroup(id) {
  const el = document.querySelector(`.priority-group[data-group="${id}"]`);
  if (el) el.classList.toggle("collapsed");
}

document.querySelector(".filter-input").addEventListener("input", function () {
  const q = this.value.toLowerCase().trim();
  document.querySelectorAll(".domain-card").forEach((card) => {
    const title = card.querySelector(".card-title").textContent.toLowerCase();
    const desc = card.querySelector(".card-desc").textContent.toLowerCase();
    card.style.display = !q || title.includes(q) || desc.includes(q) ? "" : "none";
  });
});
