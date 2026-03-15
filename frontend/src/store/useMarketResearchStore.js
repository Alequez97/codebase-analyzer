import { create } from "zustand";
import {
  MOCK_COMPETITORS,
  SIMULATION_EVENTS,
} from "../components/market-research/constants";

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
  analysisStartedAt: null,
  isAnalyzing: false,
  isAnalysisComplete: false,
  competitors: [],
  activityEvents: [],

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
    set({
      step: "analysis",
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
    set({
      step: "input",
      isAnalyzing: false,
      isAnalysisComplete: false,
      competitors: [],
      activityEvents: [],
      analysisStartedAt: null,
    });
  },

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
}));
