import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useProfileStore = create(
  persist(
    (set) => ({
      // [{ id, idea, completedAt, competitorCount }]
      analysisHistory: [],

      addAnalysis: (entry) =>
        set((state) => ({
          analysisHistory: [entry, ...state.analysisHistory].slice(0, 100),
        })),

      clearHistory: () => set({ analysisHistory: [] }),
    }),
    {
      name: "profile-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ analysisHistory: state.analysisHistory }),
    },
  ),
);
