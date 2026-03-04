import { create } from "zustand";
import api from "../api";
import { useDomainTestingStore } from "./useDomainTestingStore";
import { useTestingEditorStore } from "./useTestingEditorStore";

export const useApplyTestStore = create((set, _) => ({
  // State
  applyingTestsByDomainId: {},
  applyTaskIdsByDomainId: {},
  applyLogsByDomainId: {},
  applyingRefactoringByDomainId: {},
  applyRefactoringTaskByDomainId: {},

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

  applyRefactoring: async (domainId, refactoringId) => {
    if (!domainId || !refactoringId) {
      return { success: false, error: "Invalid parameters" };
    }

    set((state) => ({
      applyingRefactoringByDomainId: {
        ...state.applyingRefactoringByDomainId,
        [domainId]: refactoringId,
      },
    }));

    try {
      const response = await api.applyRefactoring(domainId, refactoringId);
      const taskId = response.data?.task?.id;
      const message = response.data?.message || "Refactoring task created";

      set((state) => ({
        applyRefactoringTaskByDomainId: {
          ...state.applyRefactoringTaskByDomainId,
          [domainId]: taskId,
        },
      }));

      return { success: true, message, taskId };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to apply refactoring";

      set((state) => ({
        applyingRefactoringByDomainId: {
          ...state.applyingRefactoringByDomainId,
          [domainId]: null,
        },
      }));

      return { success: false, error: message };
    }
  },

  completeApplyRefactoring: (domainId) => {
    if (!domainId) return;
    set((state) => ({
      applyingRefactoringByDomainId: {
        ...state.applyingRefactoringByDomainId,
        [domainId]: null,
      },
      applyRefactoringTaskByDomainId: {
        ...state.applyRefactoringTaskByDomainId,
        [domainId]: null,
      },
    }));
    useDomainTestingStore.getState().fetch(domainId);
  },

  failApplyRefactoring: (domainId) => {
    if (!domainId) return;
    set((state) => ({
      applyingRefactoringByDomainId: {
        ...state.applyingRefactoringByDomainId,
        [domainId]: null,
      },
      applyRefactoringTaskByDomainId: {
        ...state.applyRefactoringTaskByDomainId,
        [domainId]: null,
      },
    }));
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

  completeApplyByTaskId: (domainId, taskId, params) => {
    if (!domainId || !taskId || !params?.testId) return;

    set((state) => ({
      applyingTestsByDomainId: {
        ...state.applyingTestsByDomainId,
        [domainId]: {
          ...(state.applyingTestsByDomainId[domainId] || {}),
          [params.testId]: false,
        },
      },
    }));

    useDomainTestingStore.getState().syncTestApplied(domainId, {
      testId: params.testId,
      taskId,
      testFile: params.testFile,
      testType: params.testType,
      testDescription: params.testDescription,
    });
    useTestingEditorStore
      .getState()
      .clearPendingEditedTest(domainId, params.testId);
    useTestingEditorStore.getState().updateTestInMissingTests(domainId, {
      id: params.testId,
      actionStatus: "completed",
    });
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
      applyingRefactoringByDomainId: {},
      applyRefactoringTaskByDomainId: {},
    }),
}));
