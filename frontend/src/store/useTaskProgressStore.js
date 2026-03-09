import { create } from "zustand";

/**
 * Returns a Map<taskType, {stage, message}> for a given domain,
 * derived from the flat progressByTaskId map.
 */
export function selectDomainProgress(progressByTaskId, domainId) {
  const result = new Map();
  for (const entry of progressByTaskId.values()) {
    if (entry.domainId === domainId) {
      result.set(entry.type, { stage: entry.stage, message: entry.message });
    }
  }
  return result;
}

export const useTaskProgressStore = create((set) => ({
  // State - Map<taskId, {domainId, type, stage, message}>
  // Each concurrent task is tracked independently by its unique ID.
  progressByTaskId: new Map(),

  // Actions
  setProgress: (taskId, { domainId, type, stage, message }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.set(taskId, { domainId, type, stage, message });
      return { progressByTaskId: next };
    });
  },

  clearProgress: (taskId) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.delete(taskId);
      return { progressByTaskId: next };
    });
  },

  reset: () =>
    set({
      progressByTaskId: new Map(),
    }),
}));
