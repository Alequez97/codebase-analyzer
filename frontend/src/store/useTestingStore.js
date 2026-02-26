import { create } from "zustand";
import api from "../api";

export const useTestingStore = create((set, _) => ({
  // State
  applyingTestsByDomainId: {},

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
      const message = response.data?.message || "Test applied successfully";

      set((state) => ({
        applyingTestsByDomainId: {
          ...state.applyingTestsByDomainId,
          [domainId]: {
            ...(state.applyingTestsByDomainId[domainId] || {}),
            [testId]: false,
          },
        },
      }));

      return { success: true, message };
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

  reset: () =>
    set({
      applyingTestsByDomainId: {},
    }),
}));
