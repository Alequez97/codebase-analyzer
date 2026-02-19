import { create } from "zustand";
import api from "../api";
import { useLogsStore } from "./useLogsStore";

export const useDomainTestingStore = create((set, get) => ({
  // State - using Map for better performance
  dataById: new Map(),
  loadingById: new Map(),
  errorById: new Map(),

  // Actions
  fetch: async (domainId) => {
    if (!domainId) return null;

    const cached = get().dataById.get(domainId);
    if (cached) return cached;

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

  analyze: async (domain) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    useLogsStore.getState().clearLogs(domain.id, "testing");

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
      await api.analyzeDomainTesting(domain.id, domain.files || []);
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

  setLoading: (domainId, loading) => {
    set((state) => {
      const newLoadingMap = new Map(state.loadingById);
      newLoadingMap.set(domainId, loading);
      return { loadingById: newLoadingMap };
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
