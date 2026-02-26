import { create } from "zustand";
import api from "../api";
import { sortDomainsByPriority } from "../utils/domain-utils";
import { TASK_TYPES } from "../constants/task-types";

export const useCodebaseStore = create((set, get) => ({
  // State
  analysis: null,
  analyzingCodebase: false,
  pendingCodebaseTask: null,
  loading: false,
  error: null,

  // Actions
  setAnalysis: (analysis) => set({ analysis }),

  setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

  setPendingCodebaseTask: (task) =>
    set({ pendingCodebaseTask: task, analyzingCodebase: !!task }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  fetchAnalysis: async () => {
    const currentAnalysis = get().analysis;
    if (currentAnalysis) {
      return currentAnalysis;
    }

    set({ loading: true, error: null });
    try {
      const analysisResponse = await api.getFullCodebaseAnalysis();
      const analysisData = analysisResponse.data;

      if (analysisData?.domains) {
        analysisData.domains = sortDomainsByPriority(analysisData.domains);
      }

      set({
        analysis: analysisData,
        loading: false,
      });

      await get().fetchPendingTasks();

      return analysisData;
    } catch (err) {
      if (err?.response?.status === 404) {
        set({
          analysis: null,
          loading: false,
        });

        await get().fetchPendingTasks();

        return null;
      }

      const message = err?.response?.data?.message || "Failed to load analysis";
      set({ error: message, loading: false });
      return null;
    }
  },

  fetchPendingTasks: async () => {
    try {
      const response = await api.getPendingTasks();
      const tasks = response.data?.tasks || [];

      if (!Array.isArray(tasks)) {
        return [];
      }

      const codebaseTask = tasks.find(
        (task) => task.type === TASK_TYPES.CODEBASE_ANALYSIS,
      );

      if (codebaseTask) {
        set({
          pendingCodebaseTask: codebaseTask,
          analyzingCodebase: true,
        });
      }

      return tasks;
    } catch {
      return [];
    }
  },

  analyzeCodebase: async () => {
    set({ analyzingCodebase: true, error: null });
    try {
      const response = await api.requestCodebaseAnalysis();
      const task = response.data;

      set({
        pendingCodebaseTask: task,
        analyzingCodebase: true,
      });

      return { success: true, data: task };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to start analysis";
      set({ error: message, analyzingCodebase: false });
      return { success: false, error: message };
    }
  },

  saveCodebaseSummary: async (summary) => {
    if (typeof summary !== "string") {
      return { success: false, error: "Summary must be a string" };
    }

    try {
      await api.saveCodebaseSummary(summary);

      set((state) => {
        if (!state.analysis) {
          return state;
        }
        return {
          analysis: {
            ...state.analysis,
            summary,
          },
        };
      });

      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to save platform summary";
      return { success: false, error: message };
    }
  },

  clearPendingCodebaseTask: () => {
    set({
      pendingCodebaseTask: null,
      analyzingCodebase: false,
    });
  },

  reset: () =>
    set({
      analysis: null,
      analyzingCodebase: false,
      pendingCodebaseTask: null,
      loading: true,
      error: null,
    }),
}));

// Auto-fetch analysis on store initialization
useCodebaseStore.getState().fetchAnalysis();
