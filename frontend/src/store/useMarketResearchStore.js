import { create } from "zustand";
import {
  MOCK_COMPETITORS,
  SIMULATION_EVENTS,
} from "../components/market-research/constants";

// ---------------------------------------------------------------------------
// Session ID — persisted in sessionStorage so it survives page refresh
// within the same browser tab, but cleared when the tab is closed.
// ---------------------------------------------------------------------------
const SESSION_STORAGE_KEY = "mr-session-id";

function loadSessionId() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function saveSessionId(sessionId) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // ignore — storage quota / private mode
  }
}

function clearSessionId() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Module-level timer handles — not reactive state, just cancellation tokens
// ---------------------------------------------------------------------------
let simulationTimers = [];

function cancelSimulation() {
  simulationTimers.forEach(clearTimeout);
  simulationTimers = [];
}

function applySimulationEvent(eventType, data) {
  const store = useMarketResearchStore.getState();

  switch (eventType) {
    case "activity":
      store._addActivityEvent({
        id: `${Date.now()}-${Math.random()}`,
        ...data.payload,
        timestamp: Date.now(),
      });
      break;

    case "add_competitors":
      store._setCompetitors(
        MOCK_COMPETITORS.map((c) => ({ ...c, status: "queued" })),
      );
      break;

    case "competitor_status":
      store._updateCompetitorStatus(data.id, data.status);
      break;

    case "analysis_complete":
      store._markAnalysisComplete();
      break;

    default:
      break;
  }
}

function runSimulation() {
  cancelSimulation();

  simulationTimers = SIMULATION_EVENTS.map(({ delay, type, ...rest }) =>
    setTimeout(() => applySimulationEvent(type, rest), delay),
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMarketResearchStore = create((set) => ({
  // --- Navigation ---
  step: "landing", // "landing" | "input" | "analysis"

  // --- Input form ---
  idea: "",
  billingMode: "monthly", // "monthly" | "annual"

  // --- Analysis state ---
  sessionId: loadSessionId(), // null until first analysis is started
  analysisStartedAt: null,
  isAnalyzing: false,
  isAnalysisComplete: false,
  competitors: [],
  activityEvents: [],
  selectedCompetitorId: null,

  // --- Navigation actions ---
  setStep: (step) => set({ step }),

  goToLanding: () => {
    cancelSimulation();
    set({ step: "landing", idea: "" });
  },

  goToInput: () => set({ step: "input" }),

  // --- Input form actions ---
  setIdea: (idea) => set({ idea }),
  setBillingMode: (mode) => set({ billingMode: mode }),

  // --- Analysis actions ---
  startAnalysis: () => {
    cancelSimulation();
    const sessionId = crypto.randomUUID();
    saveSessionId(sessionId);
    set({
      step: "analysis",
      sessionId,
      isAnalyzing: true,
      isAnalysisComplete: false,
      competitors: [],
      activityEvents: [],
      analysisStartedAt: Date.now(),
    });
    runSimulation();
  },

  resetAnalysis: () => {
    cancelSimulation();
    clearSessionId();
    set({
      step: "input",
      sessionId: null,
      isAnalyzing: false,
      isAnalysisComplete: false,
      competitors: [],
      activityEvents: [],
      analysisStartedAt: null,
      selectedCompetitorId: null,
    });
  },

  selectCompetitor: (id) => set({ selectedCompetitorId: id }),
  clearSelectedCompetitor: () => set({ selectedCompetitorId: null }),

  // --- Internal mutation helpers (called by simulation only) ---
  _addActivityEvent: (event) =>
    set((state) => ({
      activityEvents: [...state.activityEvents, event],
    })),

  _setCompetitors: (competitors) => set({ competitors }),

  _updateCompetitorStatus: (id, status) =>
    set((state) => ({
      competitors: state.competitors.map((c) =>
        c.id === id ? { ...c, status } : c,
      ),
    })),

  _markAnalysisComplete: () =>
    set({ isAnalyzing: false, isAnalysisComplete: true }),

  goToSummary: () => set({ step: "summary" }),
}));
