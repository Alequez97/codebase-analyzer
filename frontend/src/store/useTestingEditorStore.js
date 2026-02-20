import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useTestingEditorStore = create(
  persist(
    (set, get) => ({
      // State - using Map for better performance
      editedTestCasesById: new Map(), // Map<testId, testCases[]>
      editedMissingTestsByDomain: new Map(), // Map<domainId, { unit, integration, e2e }>
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
              t.id === updatedTest.id ? updatedTest : t,
            );
          }
        });

        get().setEditedMissingTests(domainId, updated);
      },

      setEditingTest: (testId, domainId) => {
        set({ editingTestId: testId, editingDomainId: domainId });
      },

      clearEditingTest: () => {
        set({ editingTestId: null, editingDomainId: null });
      },

      reset: () =>
        set({
          editedTestCasesById: new Map(),
          editedMissingTestsByDomain: new Map(),
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
        // Don't persist editing state (testId/domainId)
      }),
    },
  ),
);
