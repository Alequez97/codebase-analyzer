import { create } from "zustand";
import api from "../services/api";

export const useProjectFilesStore = create((set, get) => ({
  // State
  files: [],
  loading: false,
  error: null,
  lastFetched: null,

  // Actions
  fetchProjectFiles: async (forceRefresh = false) => {
    const state = get();

    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && state.files.length > 0 && state.lastFetched) {
      const timeSinceLastFetch = Date.now() - state.lastFetched;
      // Cache for 5 minutes
      if (timeSinceLastFetch < 5 * 60 * 1000) {
        return;
      }
    }

    set({ loading: true, error: null });

    try {
      const response = await api.getProjectFiles();
      set({
        files: response.data.files || [],
        loading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      set({
        loading: false,
        error: error?.response?.data?.error || "Failed to load project files",
      });
    }
  },

  // Search/filter files
  searchFiles: (query) => {
    const state = get();
    if (!query) return state.files;

    const queryLower = query.toLowerCase();
    return state.files.filter((file) =>
      file.toLowerCase().includes(queryLower),
    );
  },

  // Reset state
  reset: () =>
    set({
      files: [],
      loading: false,
      error: null,
      lastFetched: null,
    }),
}));
