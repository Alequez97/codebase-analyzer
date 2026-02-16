import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

export const useConfigStore = create(
  persist(
    (set) => ({
      // State
      tools: [],
      selectedAgent: "aider",
      toolsLoading: false,
      toolsError: null,
      showLogs: false,

      // Actions
      setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

      toggleLogs: () => set((state) => ({ showLogs: !state.showLogs })),

      fetchTools: async () => {
        set({ toolsLoading: true, toolsError: null });
        try {
          const response = await api.getTools();
          set({ tools: response.data.tools || [], toolsLoading: false });
          return response.data.tools;
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to load tools";
          set({ toolsError: message, toolsLoading: false });
          return null;
        }
      },

      reset: () =>
        set({
          tools: [],
          selectedAgent: "aider",
          toolsLoading: false,
          toolsError: null,
          showLogs: false,
        }),
    }),
    {
      name: "config-store",
      partialize: (state) => ({
        selectedAgent: state.selectedAgent,
        showLogs: state.showLogs,
      }),
    },
  ),
);
