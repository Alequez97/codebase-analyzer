import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../api";

export const useTestingEditorStore = create(
  persist(
    (set, get) => ({
      // State - using Map for better performance
      editedTestCasesById: new Map(), // Map<testId, testCases[]>
      editedMissingTestsByDomain: new Map(), // Map<domainId, { unit, integration, e2e }>
      pendingEditedTestsByDomain: new Map(), // Map<domainId, testId[]>
      editingTestId: null, // Which test is currently being edited
      editingDomainId: null, // Which domain is being edited

      // Actions
      setEditedTestCases: (testId, testCases) => {
        set((state) => {
          const newMap = new Map(state.editedTestCasesById);
          newMap.set(testId, testCases);
          return { editedTestCasesById: newMap };
        });
      },

      getEditedTestCases: (testId) => {
        return get().editedTestCasesById.get(testId);
      },

      clearEditedTestCases: (testId) => {
        set((state) => {
          const newMap = new Map(state.editedTestCasesById);
          newMap.delete(testId);
          return { editedTestCasesById: newMap };
        });
      },

      setEditedMissingTests: (domainId, missingTests) => {
        set((state) => {
          const newMap = new Map(state.editedMissingTestsByDomain);
          newMap.set(domainId, missingTests);
          return { editedMissingTestsByDomain: newMap };
        });
      },

      getEditedMissingTests: (domainId) => {
        return get().editedMissingTestsByDomain.get(domainId);
      },

      updateTestInMissingTests: (domainId, updatedTest) => {
        const missingTests = get().getEditedMissingTests(domainId);
        if (!missingTests) return;

        const updated = { ...missingTests };
        ["unit", "integration", "e2e"].forEach((type) => {
          if (updated[type]) {
            updated[type] = updated[type].map((t) =>
              t.id === updatedTest.id ? { ...t, ...updatedTest } : t,
            );
          }
        });

        get().setEditedMissingTests(domainId, updated);
      },

      markPendingEditedTest: (domainId, testId) => {
        if (!domainId || !testId) return;

        set((state) => {
          const newMap = new Map(state.pendingEditedTestsByDomain);
          const current = newMap.get(domainId) || [];

          if (!current.includes(testId)) {
            newMap.set(domainId, [...current, testId]);
          }

          return { pendingEditedTestsByDomain: newMap };
        });
      },

      clearPendingEditedTest: (domainId, testId) => {
        if (!domainId || !testId) return;

        set((state) => {
          const newMap = new Map(state.pendingEditedTestsByDomain);
          const current = newMap.get(domainId) || [];
          const updated = current.filter((id) => id !== testId);

          if (updated.length > 0) {
            newMap.set(domainId, updated);
          } else {
            newMap.delete(domainId);
          }

          return { pendingEditedTestsByDomain: newMap };
        });
      },

      hasPendingEditedTest: (domainId, testId) => {
        const current = get().pendingEditedTestsByDomain.get(domainId) || [];
        return current.includes(testId);
      },

      setEditingTest: (testId, domainId) => {
        set({ editingTestId: testId, editingDomainId: domainId });
      },

      clearEditingTest: () => {
        set({ editingTestId: null, editingDomainId: null });
      },

      unblockTestsByRefactoring: (domainId, refactoringId) => {
        const missingTests = get().editedMissingTestsByDomain.get(domainId);
        if (!missingTests) return;
        const updated = { ...missingTests };
        ["unit", "integration", "e2e"].forEach((type) => {
          if (updated[type]) {
            updated[type] = updated[type].map((t) =>
              t.blockedBy === refactoringId ? { ...t, blockedBy: null } : t,
            );
          }
        });
        get().setEditedMissingTests(domainId, updated);
      },

      unblockTest: async (domainId, testId) => {
        try {
          const result = await api.unblockTest(domainId, testId);
          if (!result.data?.success) {
            return {
              success: false,
              error: result.data?.error || "Failed to unblock test",
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error?.response?.data?.error || "Failed to unblock test",
          };
        }
        // Update local state
        get().updateTestInMissingTests(domainId, {
          id: testId,
          blockedBy: null,
        });
        return { success: true };
      },

      reset: () =>
        set({
          editedTestCasesById: new Map(),
          editedMissingTestsByDomain: new Map(),
          pendingEditedTestsByDomain: new Map(),
          editingTestId: null,
          editingDomainId: null,
        }),
    }),
    {
      name: "testing-editor-store",
      storage: createJSONStorage(() => sessionStorage, {
        replacer: (_key, value) => {
          if (value instanceof Map) {
            return { __type: "Map", value: Array.from(value.entries()) };
          }
          return value;
        },
        reviver: (_key, value) => {
          if (value && value.__type === "Map") {
            return new Map(value.value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        editedTestCasesById: state.editedTestCasesById,
        editedMissingTestsByDomain: state.editedMissingTestsByDomain,
        pendingEditedTestsByDomain: state.pendingEditedTestsByDomain,
        // Don't persist editing state (testId/domainId)
      }),
    },
  ),
);
