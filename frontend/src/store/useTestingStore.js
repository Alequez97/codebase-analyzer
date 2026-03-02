import { create } from "zustand";
import api from "../api";
import { useDomainTestingStore } from "./useDomainTestingStore";

export const useTestingStore = create((set, _) => ({
  // State
  applyingTestsByDomainId: {},
  applyTaskIdsByDomainId: {},
  applyLogsByDomainId: {},

  // Actions
  applyTest: async (domainId, testId) => {
    if (!domainId || !testId) {
      return { success: false, error: "Invalid parameters" };
    }

    set((state) => ({
      applyingTestsByDomainId: {
        ...state.applyingTestsByDomainId,
        [domainId]: {
          ...(state.applyingTestsByDomainId[domainId] || {}),
          [testId]: true,
        },
      },
    }));

    try {
      const response = await api.applyTest(domainId, testId);
      const taskId = response.data?.task?.id;
      const message = response.data?.message || "Test application task created";

      set((state) => ({
        applyTaskIdsByDomainId: {
          ...state.applyTaskIdsByDomainId,
          [domainId]: {
            ...(state.applyTaskIdsByDomainId[domainId] || {}),
            [testId]: taskId,
          },
        },
        applyLogsByDomainId: {
          ...state.applyLogsByDomainId,
          [domainId]: {
            ...(state.applyLogsByDomainId[domainId] || {}),
            [testId]: "",
          },
        },
      }));

      return { success: true, message, taskId };
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to apply test";

      set((state) => ({
        applyingTestsByDomainId: {
          ...state.applyingTestsByDomainId,
          [domainId]: {
            ...(state.applyingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      }));

      return { success: false, error: message };
    }
  },

  appendApplyLogByTaskId: (domainId, taskId, logText) => {
    if (!domainId || !taskId || !logText) return;

    set((state) => {
      const taskIds = state.applyTaskIdsByDomainId[domainId] || {};
      const testId = Object.keys(taskIds).find((id) => taskIds[id] === taskId);
      if (!testId) return state;

      const domainLogs = state.applyLogsByDomainId[domainId] || {};
      return {
        applyLogsByDomainId: {
          ...state.applyLogsByDomainId,
          [domainId]: {
            ...domainLogs,
            [testId]: `${domainLogs[testId] || ""}${logText}`,
          },
        },
      };
    });
  },

  completeApplyByTaskId: async (domainId, taskId) => {
    if (!domainId || !taskId) return;

    set((state) => {
      const taskIds = state.applyTaskIdsByDomainId[domainId] || {};
      const testId = Object.keys(taskIds).find((id) => taskIds[id] === taskId);
      if (!testId) return state;

      return {
        applyingTestsByDomainId: {
          ...state.applyingTestsByDomainId,
          [domainId]: {
            ...(state.applyingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      };
    });

    await useDomainTestingStore.getState().fetch(domainId, true);
  },

  failApplyByTaskId: (domainId, taskId) => {
    if (!domainId || !taskId) return;

    set((state) => {
      const taskIds = state.applyTaskIdsByDomainId[domainId] || {};
      const testId = Object.keys(taskIds).find((id) => taskIds[id] === taskId);
      if (!testId) return state;

      return {
        applyingTestsByDomainId: {
          ...state.applyingTestsByDomainId,
          [domainId]: {
            ...(state.applyingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      };
    });
  },

  reset: () =>
    set({
      applyingTestsByDomainId: {},
      applyTaskIdsByDomainId: {},
      applyLogsByDomainId: {},
    }),
}));
