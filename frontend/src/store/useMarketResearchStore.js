import { create } from "zustand";
import {
  requestMarketResearchAnalysis,
  getMarketResearchReport,
} from "../api/market-research";
import { useProfileStore } from "./useProfileStore";

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
// Parse a raw log line from the backend into an activity event kind
// ---------------------------------------------------------------------------
function logLineToKind(log) {
  const lower = log.toLowerCase();
  if (lower.includes("write_file") || lower.includes("writing")) return "write";
  if (
    lower.includes("read_file") ||
    lower.includes("reading") ||
    lower.includes("extract")
  )
    return "extract";
  if (lower.includes("navigate") || lower.includes("visiting"))
    return "navigate";
  if (lower.includes("found") || lower.includes("identified")) return "found";
  return "search";
}

export { logLineToKind };

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMarketResearchStore = create((set, get) => ({
  // --- Navigation ---
  step: "landing", // "landing" | "input" | "analysis" | "summary" | "profile"

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
  report: null,

  // --- Navigation actions ---
  setStep: (step) => set({ step }),

  goToLanding: () => set({ step: "landing", idea: "" }),

  goToInput: () => set({ step: "input" }),

  // --- Input form actions ---
  setIdea: (idea) => set({ idea }),
  setBillingMode: (mode) => set({ billingMode: mode }),

  // --- Analysis actions ---
  startAnalysis: async () => {
    const { idea } = get();
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
      report: null,
    });

    try {
      await requestMarketResearchAnalysis(sessionId, idea);
    } catch {
      // Task queue failed — mark as complete with empty state so UI isn't stuck
      set({ isAnalyzing: false, isAnalysisComplete: true });
    }
  },

  resetAnalysis: () => {
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
      report: null,
    });
  },

  selectCompetitor: (id) => set({ selectedCompetitorId: id }),
  clearSelectedCompetitor: () => set({ selectedCompetitorId: null }),

  // --- Internal mutation helpers ---
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

  _applyReport: (report) => {
    const competitors = (report?.competitors || []).map((c) => ({
      ...c,
      status: "done",
    }));

    set((state) => {
      useProfileStore.getState().addAnalysis({
        id: state.sessionId ?? crypto.randomUUID(),
        idea: state.idea,
        completedAt: Date.now(),
        competitorCount: competitors.length,
      });
      return {
        report,
        competitors,
        isAnalyzing: false,
        isAnalysisComplete: true,
      };
    });
  },

  _markAnalysisComplete: () =>
    set((state) => {
      useProfileStore.getState().addAnalysis({
        id: state.sessionId ?? crypto.randomUUID(),
        idea: state.idea,
        completedAt: Date.now(),
        competitorCount: state.competitors.length,
      });
      return { isAnalyzing: false, isAnalysisComplete: true };
    }),

  goToSummary: () => set({ step: "summary" }),

  goToProfile: () => set({ step: "profile" }),

  openHistoryAnalysis: (idea) => set({ step: "summary", idea }),
}));
