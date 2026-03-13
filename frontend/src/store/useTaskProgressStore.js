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

  /**
   * Time filter for task list (in hours)
   * 24 = last 24 hours (default), 1 = last hour, 168 = 7 days, 720 = 30 days, 'all' = all time
   */
  timeFilter: "24",

  // ── Pending ───────────────────────────────────────────────────────────────
  // Inserts a new task entry in 'pending' status (from TASK_QUEUED socket event).
  // Does NOT overwrite an entry that is already running (e.g. race with TASK_PROGRESS).
  setPending: (taskId, { domainId, type, delegatedByTaskId }) => {
    set((state) => {
      const existing = state.progressByTaskId.get(taskId);
      if (existing?.status === "running") return state; // already running, skip
      const next = new Map(state.progressByTaskId);
      next.set(taskId, {
        domainId,
        type,
        status: "pending",
        delegatedByTaskId: delegatedByTaskId ?? null,
        stage: null,
        message: null,
        error: null,
      });
      return { progressByTaskId: next };
    });
  },

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
        delegatedByTaskId: existing.delegatedByTaskId ?? null,
      });
      return { progressByTaskId: next };
    });
  },

  // ── Load Tasks ───────────────────────────────────────────────────────────
  loadTasks: async (filters = {}) => {
    set({ loadingTasks: true });
    try {
      const { timeFilter } = get();
      const params = { ...filters };

      // Apply time filter if not 'all' and no explicit dateFrom provided
      if (!params.dateFrom && timeFilter !== "all") {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - Number(timeFilter));
        params.dateFrom = hoursAgo.toISOString();
      }

      // Default to all task statuses (pending, running, failed, completed, canceled)
      if (!params.status) {
        params.status = "pending,running,failed,completed,canceled";
      }

      const res = await api.getTasks(params);
      const tasks = res.data?.tasks ?? [];
      const LIVE_STATUSES = new Set(["running", "pending"]);
      set((state) => {
        // Start from only live (socket-driven) tasks — drop all historical
        // entries so narrowing the time filter removes stale data.
        const next = new Map();
        for (const [id, entry] of state.progressByTaskId) {
          if (LIVE_STATUSES.has(entry.status)) {
            next.set(id, entry);
          }
        }
        for (const task of tasks) {
          // Don't overwrite a running socket entry with stale server data
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
            delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
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

  // ── Canceled ──────────────────────────────────────────────────────────────
  // Upserts entry with status 'canceled' (clears stage/message/error)
  setCanceled: ({ id, type, domainId }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "canceled",
        stage: null,
        message: null,
        error: null,
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

  // ── Time Filter ───────────────────────────────────────────────────────────
  setTimeFilter: async (timeFilter) => {
    set({ timeFilter });
    await get().loadTasks();
  },

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset: () => set({ progressByTaskId: new Map() }),
}));
