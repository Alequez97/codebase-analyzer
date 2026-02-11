import { create } from "zustand";
import api from "../services/api";

export const useAppStore = create((set, get) => ({
  // State
  status: null,
  modules: [],
  selectedCodebase: null,
  scanning: false,
  loading: true,
  error: null,

  // Actions
  setStatus: (status) => set({ status }),

  setModules: (modules) => set({ modules }),

  setSelectedCodebase: (codebase) => set({ selectedCodebase: codebase }),

  setScanning: (scanning) => set({ scanning }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Auto-select first codebase
  autoSelectCodebase: () => {
    const { status, selectedCodebase } = get();
    if (status?.config?.codebases?.length > 0 && !selectedCodebase) {
      set({ selectedCodebase: status.config.codebases[0] });
    }
  },

  // Async Actions
  fetchStatus: async () => {
    try {
      const response = await api.getStatus();
      set({ status: response.data, error: null, loading: false });
      get().autoSelectCodebase();
    } catch (err) {
      set({ error: "Failed to connect to backend server", loading: false });
    }
  },

  fetchModules: async () => {
    const { selectedCodebase } = get();
    if (!selectedCodebase) return;

    try {
      const response = await api.getModules();
      set({ modules: response.data.modules || [] });
    } catch (err) {
      console.log("No modules found yet");
      set({ modules: [] });
    }
  },

  startScan: async () => {
    const { selectedCodebase } = get();
    if (!selectedCodebase) return;

    set({ scanning: true });
    try {
      await api.requestScan(true);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const response = await api.getModules();
          if (response.data.modules && response.data.modules.length > 0) {
            set({ modules: response.data.modules, scanning: false });
            clearInterval(pollInterval);
          }
        } catch (err) {
          // Still waiting
        }
      }, 3000);

      // Stop after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        set({ scanning: false });
      }, 120000);
    } catch (err) {
      set({ error: "Failed to start scan", scanning: false });
    }
  },

  reset: () =>
    set({
      status: null,
      modules: [],
      selectedCodebase: null,
      scanning: false,
      loading: true,
      error: null,
    }),
}));
