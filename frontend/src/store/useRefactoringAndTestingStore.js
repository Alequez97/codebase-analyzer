import { create } from "zustand";
import api from "../api";
import { useDomainRefactoringAndTestingStore as useDomainTestingStore } from "./useDomainRefactoringAndTestingStore";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "./useRefactoringAndTestingEditorStore";
import { REFACTORING_STATUS } from "../constants/refactoring-status";

export const useRefactoringAndTestingStore = create((set, get) => ({
  // State
  implementingTestsByDomainId: {},
  implementTaskIdsByDomainId: {},
  implementLogsByDomainId: {},
  // Maps testId → { taskId, message, stage } for real-time progress display
  implementProgressByTestId: new Map(),
  applyingRefactoringByDomainId: {},
  applyRefactoringTaskByDomainId: {},
  completedRefactoringByDomainId: {},
  // Maps domainId → { taskId, message, stage } for real-time refactoring progress
  applyRefactoringProgressByDomainId: new Map(),

  // Actions
  implementTest: async (domainId, testId) => {
    if (!domainId || !testId) {
      return { success: false, error: "Invalid parameters" };
    }

    set((state) => ({
      implementingTestsByDomainId: {
        ...state.implementingTestsByDomainId,
        [domainId]: {
          ...(state.implementingTestsByDomainId[domainId] || {}),
          [testId]: true,
        },
      },
    }));

    try {
      const response = await api.implementTest(domainId, testId);
      const taskId = response.data?.task?.id;
      const message = response.data?.message || "Test implementation started";

      set((state) => ({
        implementTaskIdsByDomainId: {
          ...state.implementTaskIdsByDomainId,
          [domainId]: {
            ...(state.implementTaskIdsByDomainId[domainId] || {}),
            [testId]: taskId,
          },
        },
        implementLogsByDomainId: {
          ...state.implementLogsByDomainId,
          [domainId]: {
            ...(state.implementLogsByDomainId[domainId] || {}),
            [testId]: "",
          },
        },
      }));

      return { success: true, message, taskId };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to implement test";

      set((state) => ({
        implementingTestsByDomainId: {
          ...state.implementingTestsByDomainId,
          [domainId]: {
            ...(state.implementingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      }));

      return { success: false, error: message };
    }
  },

  implementTestEdits: async (domainId, testId) => {
    if (!domainId || !testId) {
      return { success: false, error: "Invalid parameters" };
    }

    try {
      const response = await api.implementTestEdits(domainId, testId);
      return {
        success: true,
        message: response?.data?.message || "Test edits implementation started",
      };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to implement test edits";
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

  setApplyRefactoringProgress: (domainId, { taskId, message, stage }) => {
    if (!domainId) return;
    set((state) => {
      const next = new Map(state.applyRefactoringProgressByDomainId);
      next.set(domainId, { taskId, message, stage });
      return { applyRefactoringProgressByDomainId: next };
    });
  },

  completeApplyRefactoring: (domainId) => {
    if (!domainId) return;
    const refactoringId = get().applyingRefactoringByDomainId[domainId];
    set((state) => ({
      applyingRefactoringByDomainId: {
        ...state.applyingRefactoringByDomainId,
        [domainId]: null,
      },
      applyRefactoringTaskByDomainId: {
        ...state.applyRefactoringTaskByDomainId,
        [domainId]: null,
      },
      completedRefactoringByDomainId: {
        ...state.completedRefactoringByDomainId,
        [domainId]: refactoringId || null,
      },
      applyRefactoringProgressByDomainId: (() => {
        const next = new Map(state.applyRefactoringProgressByDomainId);
        next.delete(domainId);
        return next;
      })(),
    }));
    if (refactoringId) {
      useTestingEditorStore
        .getState()
        .unblockTestsByRefactoring(domainId, refactoringId);
      useDomainTestingStore
        .getState()
        .syncRefactoringStatus(
          domainId,
          refactoringId,
          REFACTORING_STATUS.READY_FOR_REVIEW,
        );
    }
  },

  markRefactoringCompleted: async (domainId, refactoringId) => {
    if (!domainId || !refactoringId) {
      return { success: false, error: "Invalid parameters" };
    }
    try {
      await api.markRefactoringCompleted(domainId, refactoringId);
      useTestingEditorStore
        .getState()
        .unblockTestsByRefactoring(domainId, refactoringId);
      set((state) => ({
        applyingRefactoringByDomainId: {
          ...state.applyingRefactoringByDomainId,
          [domainId]: null,
        },
        applyRefactoringTaskByDomainId: {
          ...state.applyRefactoringTaskByDomainId,
          [domainId]: null,
        },
        completedRefactoringByDomainId: {
          ...state.completedRefactoringByDomainId,
          [domainId]: null,
        },
      }));
      useDomainTestingStore
        .getState()
        .syncRefactoringStatus(
          domainId,
          refactoringId,
          REFACTORING_STATUS.COMPLETED,
        );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err?.response?.data?.message ||
          "Failed to mark refactoring as implemented",
      };
    }
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
      completedRefactoringByDomainId: {
        ...state.completedRefactoringByDomainId,
        [domainId]: null,
      },
      applyRefactoringProgressByDomainId: (() => {
        const next = new Map(state.applyRefactoringProgressByDomainId);
        next.delete(domainId);
        return next;
      })(),
    }));
  },

  appendImplementLogByTaskId: (domainId, taskId, logText) => {
    if (!domainId || !taskId || !logText) return;

    set((state) => {
      const taskIds = state.implementTaskIdsByDomainId[domainId] || {};
      const testId = Object.keys(taskIds).find((id) => taskIds[id] === taskId);
      if (!testId) return state;

      const domainLogs = state.implementLogsByDomainId[domainId] || {};
      return {
        implementLogsByDomainId: {
          ...state.implementLogsByDomainId,
          [domainId]: {
            ...domainLogs,
            [testId]: `${domainLogs[testId] || ""}${logText}`,
          },
        },
      };
    });
  },

  // Called by socket store on TASK_PROGRESS for IMPLEMENT_TEST
  setImplementTestProgress: (taskId, { message, stage }) => {
    if (!taskId) return;
    const allTaskIds = get().implementTaskIdsByDomainId;
    let foundTestId = null;
    for (const domainTasks of Object.values(allTaskIds)) {
      const testId = Object.keys(domainTasks || {}).find(
        (id) => domainTasks[id] === taskId,
      );
      if (testId) {
        foundTestId = testId;
        break;
      }
    }
    if (!foundTestId) return;
    set((state) => {
      const next = new Map(state.implementProgressByTestId);
      next.set(foundTestId, { taskId, message, stage });
      return { implementProgressByTestId: next };
    });
  },

  completeImplementByTaskId: (domainId, taskId, params) => {
    if (!domainId || !taskId || !params?.testId) return;

    set((state) => {
      const next = new Map(state.implementProgressByTestId);
      next.delete(params.testId);
      return {
        implementProgressByTestId: next,
        implementingTestsByDomainId: {
          ...state.implementingTestsByDomainId,
          [domainId]: {
            ...(state.implementingTestsByDomainId[domainId] || {}),
            [params.testId]: false,
          },
        },
      };
    });

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

  failImplementByTaskId: (domainId, taskId) => {
    if (!domainId || !taskId) return;

    set((state) => {
      const taskIds = state.implementTaskIdsByDomainId[domainId] || {};
      const testId = Object.keys(taskIds).find((id) => taskIds[id] === taskId);
      if (!testId) return state;

      const nextProgress = new Map(state.implementProgressByTestId);
      nextProgress.delete(testId);
      return {
        implementProgressByTestId: nextProgress,
        implementingTestsByDomainId: {
          ...state.implementingTestsByDomainId,
          [domainId]: {
            ...(state.implementingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      };
    });
  },

  reset: () =>
    set({
      implementingTestsByDomainId: {},
      implementTaskIdsByDomainId: {},
      implementLogsByDomainId: {},
      implementProgressByTestId: new Map(),
      applyingRefactoringByDomainId: {},
      applyRefactoringTaskByDomainId: {},
      completedRefactoringByDomainId: {},
      applyRefactoringProgressByDomainId: new Map(),
    }),
}));
