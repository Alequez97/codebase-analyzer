import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  requestMarketResearchAnalysis,
  getMarketResearchReport as fetchMarketResearchReport,
  getCompetitorDetails,
} from "../api/market-research";

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

export const useMarketResearchStore = create(
  persist(
    (set, get) => ({
      // --- Navigation ---
      step: "landing", // "landing" | "input" | "analysis" | "summary" | "profile"

      // --- Input form ---
      idea: "",
      billingMode: "monthly", // "monthly" | "annual"
      selectedPlan: null, // { name, numCompetitors, ... } — set when user picks a plan

      // --- Analysis state ---
      sessionId: null,
      analysisStartedAt: null,
      isAnalyzing: false,
      isAnalysisComplete: false,
      competitors: [],
      activityEvents: [],
      selectedCompetitorId: null,
      report: null,
      // Maps taskId → competitorId so progress events can identify which competitor is running
      competitorTaskMap: {},

      // --- Navigation actions ---
      setStep: (step) => set({ step }),

      goToLanding: () => set({ step: "landing", idea: "" }),

      goToInput: () => set({ step: "input" }),

      // --- Input form actions ---
      setIdea: (idea) => set({ idea }),
      setBillingMode: (mode) => set({ billingMode: mode }),
      selectPlan: (plan) => set({ selectedPlan: plan }),
      clearPlan: () => set({ selectedPlan: null }),

      // --- Analysis actions ---
      startAnalysis: async () => {
        const { idea, selectedPlan } = get();
        const numCompetitors = selectedPlan?.numCompetitors ?? 10;
        const sessionId = crypto.randomUUID();

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
          await requestMarketResearchAnalysis(sessionId, idea, numCompetitors);
        } catch {
          // Task queue failed — mark as complete with empty state so UI isn't stuck
          set({ isAnalyzing: false, isAnalysisComplete: true });
        }
      },

      resetAnalysis: () => {
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

      loadCompetitorDetails: async (competitorId) => {
        const { sessionId, competitors } = get();
        if (!sessionId) return;
        const existing = competitors.find((c) => c.id === competitorId);
        if (existing?.details) return; // already loaded
        try {
          const response = await getCompetitorDetails(sessionId, competitorId);
          const profile = response?.data?.competitor;
          if (!profile) return;
          set((state) => ({
            competitors: state.competitors.map((c) =>
              c.id === competitorId
                ? { ...c, ...profile, status: c.status }
                : c,
            ),
          }));
        } catch {
          // silently ignore — the component will show a loading/error state
        }
      },

      // --- Internal mutation helpers ---
      _addActivityEvent: (event) =>
        set((state) => ({
          activityEvents: [...state.activityEvents, event],
        })),

      _setCompetitors: (competitors) => set({ competitors }),

      _addCompetitorStub: ({
        taskId,
        competitorId,
        competitorName,
        competitorUrl,
      }) =>
        set((state) => {
          if (state.competitors.some((c) => c.id === competitorId))
            return state;
          return {
            competitors: [
              ...state.competitors,
              {
                id: competitorId,
                name: competitorName,
                url: competitorUrl,
                status: "queued",
                logoChar: competitorName?.[0]?.toUpperCase() ?? "?",
                logoColor: "#6366f1",
                logoBg: "#eef2ff",
              },
            ],
            competitorTaskMap: {
              ...state.competitorTaskMap,
              [taskId]: competitorId,
            },
          };
        }),

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

        set({
          report,
          competitors,
          isAnalyzing: false,
          isAnalysisComplete: true,
        });
      },

      _markAnalysisComplete: () => {
        set({ isAnalyzing: false, isAnalysisComplete: true });
      },

      goToSummary: () => set({ step: "summary" }),

      goToProfile: () => set({ step: "profile" }),

      openHistoryAnalysis: async (entry) => {
        const sessionId = entry.id;
        set({
          step: "summary",
          idea: entry.idea,
          sessionId,
          report: null,
          competitors: [],
          isAnalyzing: false,
          isAnalysisComplete: true,
        });

        try {
          const response = await fetchMarketResearchReport(sessionId);
          const report = response?.data?.report;
          if (report) {
            get()._applyReport(report);
          }
        } catch {
          // Silently ignore — the page will show with empty state
        }
      },
    }),
    {
      name: "market-research-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ sessionId: state.sessionId }),
    },
  ),
);
