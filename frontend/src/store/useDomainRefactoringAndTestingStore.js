import { create } from "zustand";
import api from "../api";
import { useLogsStore } from "./useLogsStore";
import { SECTION_TYPES } from "../constants/section-types";
import { REFACTORING_STATUS } from "../constants/refactoring-status";

export const useDomainRefactoringAndTestingStore = create((set, get) => ({
  // State - using Map for better performance
  dataById: new Map(),
  loadingById: new Map(),
  errorById: new Map(),

  // Tracks tests that were just changed by an AI chat edit so the UI can
  // flash-highlight the affected rows.  Map<testId, "added" | "modified" | "removed">
  // Populated on REFACTORING_AND_TESTING_UPDATED (isEdit:true) and auto-cleared
  // after a short timeout in useSocketStore.
  recentlyChangedTests: new Map(),

  setRecentlyChangedTests: (changes) => {
    set({ recentlyChangedTests: new Map(changes) });
  },

  clearRecentlyChangedTests: () => {
    set({ recentlyChangedTests: new Map() });
  },

  // Actions
  fetch: async (domainId, force = false) => {
    if (!domainId) return null;

    const cached = get().dataById.get(domainId);
    if (!force && cached) return cached;

    set((state) => {
      const newLoadingMap = new Map(state.loadingById);
      newLoadingMap.set(domainId, true);
      return { loadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomainTesting(domainId);
      const data = response.data;

      set((state) => {
        const newDataMap = new Map(state.dataById);
        const newLoadingMap = new Map(state.loadingById);
        newDataMap.set(domainId, data);
        newLoadingMap.set(domainId, false);
        return {
          dataById: newDataMap,
          loadingById: newLoadingMap,
        };
      });

      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load domain testing";

      set((state) => {
        const newLoadingMap = new Map(state.loadingById);
        const newErrorMap = new Map(state.errorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, message);
        return {
          loadingById: newLoadingMap,
          errorById: newErrorMap,
        };
      });
      return null;
    }
  },

  analyze: async (domain, includeRequirements = false) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    useLogsStore
      .getState()
      .clearLogs(domain.id, SECTION_TYPES.REFACTORING_AND_TESTING);

    set((state) => {
      const newLoadingMap = new Map(state.loadingById);
      newLoadingMap.set(domain.id, true);
      const newErrorMap = new Map(state.errorById);
      newErrorMap.delete(domain.id);
      return {
        loadingById: newLoadingMap,
        errorById: newErrorMap,
      };
    });

    try {
      await api.analyzeDomainTesting(
        domain.id,
        domain.files || [],
        includeRequirements,
      );
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to analyze testing";
      set((state) => {
        const newLoadingMap = new Map(state.loadingById);
        const newErrorMap = new Map(state.errorById);
        newLoadingMap.set(domain.id, false);
        newErrorMap.set(domain.id, message);
        return {
          loadingById: newLoadingMap,
          errorById: newErrorMap,
        };
      });
      return { success: false, error: message };
    }
  },

  updateData: (domainId, data) => {
    set((state) => {
      const newDataMap = new Map(state.dataById);
      newDataMap.set(domainId, data);
      return { dataById: newDataMap };
    });
  },

  syncRefactoringStatus: (domainId, refactoringId, status) => {
    if (!domainId || !refactoringId || !status) return;

    const timestampField =
      status === REFACTORING_STATUS.COMPLETED ? "completedAt" : "appliedAt";

    set((state) => {
      const currentData = state.dataById.get(domainId);
      if (!currentData) return state;

      const refactorings = Array.isArray(currentData.refactoringRecommendations)
        ? currentData.refactoringRecommendations.map((r) =>
            r.id === refactoringId
              ? { ...r, status, [timestampField]: new Date().toISOString() }
              : r,
          )
        : [];

      let missingTests = currentData.missingTests;

      if (status === REFACTORING_STATUS.COMPLETED) {
        const completedRefactoring = refactorings.find(
          (r) => r.id === refactoringId,
        );
        const unblockedTestIds = Array.isArray(completedRefactoring?.unblocks)
          ? completedRefactoring.unblocks
          : [];

        if (unblockedTestIds.length > 0) {
          const unblockInList = (list = []) =>
            list.map((t) => {
              if (!unblockedTestIds.includes(t.id)) return t;
              const { blockedBy: _blockedBy, ...rest } = t;
              return rest;
            });

          missingTests = {
            unit: unblockInList(currentData.missingTests?.unit),
            integration: unblockInList(currentData.missingTests?.integration),
            e2e: unblockInList(currentData.missingTests?.e2e),
          };
        }
      }

      const newDataMap = new Map(state.dataById);
      newDataMap.set(domainId, {
        ...currentData,
        refactoringRecommendations: refactorings,
        missingTests,
      });

      return { dataById: newDataMap };
    });
  },

  syncTestApplied: (domainId, testUpdate) => {
    if (!domainId || !testUpdate?.testId) return;

    set((state) => {
      const currentData = state.dataById.get(domainId);
      if (!currentData) return state;

      const timestamp = new Date().toISOString();
      const actionEntry = {
        id: `ACTION-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        testId: testUpdate.testId,
        action: "apply",
        status: "completed",
        taskId: testUpdate.taskId || null,
        testFile: testUpdate.testFile || "",
        timestamp,
      };

      const updateTestStatus = (tests = []) =>
        tests.map((test) => {
          if (test.id !== testUpdate.testId) return test;

          const history = Array.isArray(test.actionHistory)
            ? [actionEntry, ...test.actionHistory]
            : [actionEntry];

          return {
            ...test,
            actionStatus: "completed",
            actionHistory: history,
            suggestedTestFile: testUpdate.testFile || test.suggestedTestFile,
          };
        });

      const updatedMissingTests = {
        unit: updateTestStatus(currentData.missingTests?.unit || []),
        integration: updateTestStatus(
          currentData.missingTests?.integration || [],
        ),
        e2e: updateTestStatus(currentData.missingTests?.e2e || []),
      };

      const currentExistingTests = Array.isArray(currentData.existingTests)
        ? [...currentData.existingTests]
        : [];

      if (testUpdate.testFile) {
        const existingIndex = currentExistingTests.findIndex(
          (item) => item.file === testUpdate.testFile,
        );
        const nextExistingTest = {
          file: testUpdate.testFile,
          description:
            testUpdate.testDescription || "Generated by Implement Test",
          testType: testUpdate.testType || "unit",
        };

        if (existingIndex >= 0) {
          currentExistingTests[existingIndex] = {
            ...currentExistingTests[existingIndex],
            ...nextExistingTest,
          };
        } else {
          currentExistingTests.push(nextExistingTest);
        }
      }

      const newDataMap = new Map(state.dataById);
      newDataMap.set(domainId, {
        ...currentData,
        missingTests: updatedMissingTests,
        existingTests: currentExistingTests,
      });

      return { dataById: newDataMap };
    });
  },

  setLoading: (domainId, loading) => {
    set((state) => {
      const newLoadingMap = new Map(state.loadingById);
      newLoadingMap.set(domainId, loading);
      return { loadingById: newLoadingMap };
    });
  },

  setError: (domainId, error) => {
    set((state) => {
      const newErrorMap = new Map(state.errorById);
      newErrorMap.set(domainId, error);
      return { errorById: newErrorMap };
    });
  },

  clearError: (domainId) => {
    set((state) => {
      const newErrorMap = new Map(state.errorById);
      newErrorMap.delete(domainId);
      return { errorById: newErrorMap };
    });
  },

  reset: () =>
    set({
      dataById: new Map(),
      loadingById: new Map(),
      errorById: new Map(),
    }),
}));
