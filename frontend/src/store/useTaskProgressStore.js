import { create } from "zustand";

export const useTaskProgressStore = create((set) => ({
  // State - using Map for better performance
  progressById: new Map(),

  // Actions
  setProgress: (domainId, progress) => {
    set((state) => {
      const newMap = new Map(state.progressById);
      if (progress) {
        newMap.set(domainId, progress);
      } else {
        newMap.delete(domainId);
      }
      return { progressById: newMap };
    });
  },

  clearProgress: (domainId) => {
    set((state) => {
      const newMap = new Map(state.progressById);
      newMap.delete(domainId);
      return { progressById: newMap };
    });
  },

  reset: () =>
    set({
      progressById: new Map(),
    }),
}));
