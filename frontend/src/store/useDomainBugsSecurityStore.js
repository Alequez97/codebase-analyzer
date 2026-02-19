import { create } from "zustand";
import api from "../api";
import { toaster } from "../components/ui/toaster";
import { useLogsStore } from "./useLogsStore";
import { SECTION_TYPES } from "../constants/section-types";

export const useDomainBugsSecurityStore = create((set, get) => ({
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
      const response = await api.getDomainBugsSecurity(domainId);
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
        err?.response?.data?.message || "Failed to load bugs & security";

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

    useLogsStore.getState().clearLogs(domain.id, SECTION_TYPES.BUGS_SECURITY);

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
      await api.analyzeDomainBugsSecurity(
        domain.id,
        domain.files || [],
        includeRequirements,
      );
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to analyze bugs & security";
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

  updateFindingAction: (domainId, findingId, action) => {
    set((state) => {
      const bugsSecurityData = state.dataById.get(domainId);
      if (!bugsSecurityData || !bugsSecurityData.findings) {
        return state;
      }

      const updatedFindings = bugsSecurityData.findings.map((finding) =>
        finding.id === findingId ? { ...finding, action } : finding,
      );

      const newDataMap = new Map(state.dataById);
      newDataMap.set(domainId, {
        ...bugsSecurityData,
        findings: updatedFindings,
      });

      return { dataById: newDataMap };
    });
  },

  applyFix: async (domainId, findingId) => {
    if (!domainId || !findingId) {
      toaster.create({
        title: "Invalid request",
        description: "Domain ID and Finding ID are required",
        type: "error",
      });
      return { success: false, error: "Invalid request" };
    }

    try {
      await api.applyFindingFix(domainId, findingId, true);

      toaster.create({
        title: "Fix application started",
        description: "Aider is applying the fix. Check logs for progress.",
        type: "success",
      });

      return { success: true };
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to apply fix";

      toaster.create({
        title: "Failed to apply fix",
        description: message,
        type: "error",
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
