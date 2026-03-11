import { create } from "zustand";
import api from "../api";

/**
 * Returns a Map<taskType, {stage, message}> for a given domain,
 * derived from the flat progressByTaskId map (running tasks only).
 */
export function selectDomainProgress(progressByTaskId, domainId) {
  const result = new Map();
  for (const entry of progressByTaskId.values()) {
    if (entry.domainId === domainId && entry.status === "running") {
      result.set(entry.type, { stage: entry.stage, message: entry.message });
    }
  }
  return result;
}

export const useTaskProgressStore = create((set, get) => ({
  /**
   * Single source of truth for all task state.
   * Map<taskId, {domainId, type, status: 'pending'|'running'|'failed', stage?, message?, error?}>
   */
  progressByTaskId: new Map(),

  /**
   * Loading state for initial task fetch (prevents layout shift on page load)
   * Defaults to true so the pill shows "Loading tasks..." from the start
   */
  loadingTasks: true,

  // ── Running ──────────────────────────────────────────────────────────────
  // Upserts entry and transitions it to 'running' (also covers pending → running)
  setProgress: (taskId, { domainId, type, stage, message }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(taskId) ?? {};
      next.set(taskId, {
        ...existing,
        domainId,
        type,
        stage,
        message,
        status: "running",
      });
      return { progressByTaskId: next };
    });
  },

  // Remove a task entirely (cancelled or dismissed)
  clearProgress: (taskId) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.delete(taskId);
      return { progressByTaskId: next };
    });
  },

  // ── Completed ─────────────────────────────────────────────────────────────
  // Transition task to completed status (clears stage/message)
  setCompleted: ({ id, type, domainId }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "completed",
        stage: null,
        message: null,
        error: null,
      });
      return { progressByTaskId: next };
    });
  },

  // ── Load Tasks ───────────────────────────────────────────────────────────
  loadTasks: async (filters = {}) => {
    set({ loadingTasks: true });
    try {
      // Default to last 24 hours if no dateFrom specified
      const params = { ...filters };
      if (!params.dateFrom) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        params.dateFrom = yesterday.toISOString();
      }
      // Default to all task statuses (pending, running, failed, completed)
      if (!params.status) {
        params.status = "pending,running,failed,completed";
      }

      const res = await api.getTasks(params);
      const tasks = res.data?.tasks ?? [];
      set((state) => {
        const next = new Map(state.progressByTaskId);
        for (const task of tasks) {
          // Don't overwrite running tasks with stale data
          const existing = next.get(task.id);
          if (existing?.status === "running" && task.status !== "running") {
            continue;
          }
          next.set(task.id, {
            domainId: task.params?.domainId ?? task.domainId,
            type: task.type,
            status: task.status,
            error: task.error,
            stage: existing?.stage,
            message: existing?.message,
          });
        }
        return { progressByTaskId: next };
      });
    } catch {
      // silently ignore — not critical
    } finally {
      set({ loadingTasks: false });
    }
  },

  // ── Failed ────────────────────────────────────────────────────────────────
  // Upserts entry with status 'failed' (clears stage/message, sets error)
  setFailed: ({ id, type, domainId, error }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "failed",
        stage: null,
        message: null,
        error,
      });
      return { progressByTaskId: next };
    });
  },

  dismissFailed: (taskId) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.delete(taskId);
      return { progressByTaskId: next };
    });
  },

  clearAllFailed: () => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      for (const [id, entry] of next) {
        if (entry.status === "failed") next.delete(id);
      }
      return { progressByTaskId: next };
    });
  },

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset: () => set({ progressByTaskId: new Map() }),
}));
