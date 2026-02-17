import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Store for UI state related to logs display
 */
export const useLogsStore = create(
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
      name: "logs-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        showLogs: state.showLogs,
      }),
    },
  ),
);
