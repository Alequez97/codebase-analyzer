import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useConfigStore = create(
  persist(
    (set) => ({
      // State
      showLogs: false,

      // Actions
      toggleLogs: () => set((state) => ({ showLogs: !state.showLogs })),

      reset: () =>
        set({
          showLogs: false,
        }),
    }),
    {
      name: "config-store",
      partialize: (state) => ({
        showLogs: state.showLogs,
      }),
    },
  ),
);
