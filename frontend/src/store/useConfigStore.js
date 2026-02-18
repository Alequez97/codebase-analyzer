import { create } from "zustand";
import api from "../services/api";

/**
 * Store for server configuration and connection status
 * Contains: target project info, available agents, server metadata
 *
 * Note: This is NOT persisted - it's lightweight and fetched fresh on each
 * session to ensure we have up-to-date server info
 */
export const useConfigStore = create((set, get) => ({
  // State
  config: null, // Server configuration (target project, agents, port)
  configLoading: true, // Start as true to show "Connecting..." on initial load
  configError: null,

  // Actions
  setConfig: (config) => set({ config }),

  setConfigLoading: (configLoading) => set({ configLoading }),

  setConfigError: (configError) => set({ configError }),

  clearConfigError: () => set({ configError: null }),

  /**
   * Fetch server configuration (target project, available agents, etc.)
   * This is lightweight and should be called on each session
   */
  fetchConfig: async () => {
    set({ configLoading: true, configError: null });
    try {
      const response = await api.getStatus();
      set({
        config: response.data,
        configLoading: false,
        configError: null,
      });
      return response.data;
    } catch (err) {
      console.error("Failed to fetch server config:", err);
      set({
        config: null,
        configLoading: false,
        configError: err.message || "Failed to connect to server",
      });
      return null;
    }
  },

  /**
   * Check if connected to server
   */
  isConnected: () => {
    const state = get();
    return !state.configError && !!state.config;
  },
}));
