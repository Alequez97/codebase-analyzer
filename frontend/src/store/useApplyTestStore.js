import { create } from "zustand";
import api from "../api";
import { useDomainTestingStore } from "./useDomainTestingStore";
import { useTestingEditorStore } from "./useTestingEditorStore";

export const useApplyTestStore = create((set, _) => ({
  // State
  applyingTestsByDomainId: {},
  applyTaskIdsByDomainId: {},
  applyTaskMetaByDomainId: {},
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
      const taskParams = response.data?.task?.params || null;
      const message = response.data?.message || "Test application task created";

      set((state) => ({
        applyTaskIdsByDomainId: {
          ...state.applyTaskIdsByDomainId,
          [domainId]: {
            ...(state.applyTaskIdsByDomainId[domainId] || {}),
            [testId]: taskId,
          },
        },
        ...(taskId
          ? {
              applyTaskMetaByDomainId: {
                ...state.applyTaskMetaByDomainId,
                [domainId]: {
                  ...(state.applyTaskMetaByDomainId[domainId] || {}),
                  [taskId]: taskParams,
                },
              },
            }
          : {}),
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

  applyTestEdits: async (domainId, testId) => {
    if (!domainId || !testId) {
      return { success: false, error: "Invalid parameters" };
    }

    try {
      const response = await api.applyTestEdits(domainId, testId);
      return {
        success: true,
        message: response?.data?.message || "Test edits task created",
      };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to apply test edits";
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

    const storeState = useApplyTestStore.getState();
    const taskMeta = storeState.applyTaskMetaByDomainId[domainId]?.[taskId];

    if (taskMeta?.testId) {
      useDomainTestingStore.getState().syncTestApplied(domainId, {
        testId: taskMeta.testId,
        taskId,
        testFile: taskMeta.testFile,
        testType: taskMeta.testType,
        testDescription: taskMeta.testDescription,
      });
      useTestingEditorStore
        .getState()
        .clearPendingEditedTest(domainId, taskMeta.testId);
      useTestingEditorStore.getState().updateTestInMissingTests(domainId, {
        id: taskMeta.testId,
        actionStatus: "completed",
      });
      return;
    }

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
      applyTaskMetaByDomainId: {},
      applyLogsByDomainId: {},
    }),
}));
