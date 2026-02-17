import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        showLogs: state.showLogs,
      }),
    },
  ),
);
