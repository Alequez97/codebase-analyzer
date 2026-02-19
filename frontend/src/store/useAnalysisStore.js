import { create } from "zustand";
import api from "../api";
import { sortDomainsByPriority } from "../utils/domain-utils";
import { TASK_TYPES } from "../constants/task-types";
import { useLogsStore } from "./useLogsStore";

export const useAnalysisStore = create((set, get) => ({
  // State
  analysis: null,
  // Domain section data storage (Map) - split by section for granular loading
  domainDocumentationById: new Map(),
  domainRequirementsById: new Map(),
  domainBugsSecurityById: new Map(),
  domainTestingById: new Map(),
  // Legacy: full domain analysis (deprecated, use section-specific instead)
  domainAnalysisById: new Map(),
  domainLoadingById: new Map(),
  domainAnalyzeLoadingById: new Map(),
  // Section-specific loading states (Map)
  domainDocumentationLoadingById: new Map(),
  domainRequirementsLoadingById: new Map(),
  domainBugsSecurityLoadingById: new Map(),
  domainTestingLoadingById: new Map(),
  // Section-specific error states (Map)
  domainDocumentationErrorById: new Map(),
  domainRequirementsErrorById: new Map(),
  domainBugsSecurityErrorById: new Map(),
  domainTestingErrorById: new Map(),
  // Task progress tracking (Map) - stores latest progress message by domain
  domainTaskProgressById: new Map(),
  analyzingCodebase: false,
  pendingCodebaseTask: null,
  loading: false,
  error: null,

  // Actions
  setAnalysis: (analysis) => set({ analysis }),

  setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

  setPendingCodebaseTask: (task) =>
    set({ pendingCodebaseTask: task, analyzingCodebase: !!task }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setDomainTaskProgress: (domainId, progress) =>
    set((state) => {
      const newMap = new Map(state.domainTaskProgressById);
      if (progress) {
        newMap.set(domainId, progress);
      } else {
        newMap.delete(domainId);
      }
      return { domainTaskProgressById: newMap };
    }),

  fetchAnalysis: async () => {
    // Check if we already have cached analysis - return it without fetching
    const currentAnalysis = get().analysis;
    if (currentAnalysis) {
      return currentAnalysis;
    }

    // No cached analysis - fetch it
    set({ loading: true, error: null });
    try {
      const analysisResponse = await api.getFullCodebaseAnalysis();
      const analysisData = analysisResponse.data;

      // Sort domains by priority
      if (analysisData?.domains) {
        analysisData.domains = sortDomainsByPriority(analysisData.domains);
      }

      set({
        analysis: analysisData,
        loading: false,
      });

      // Check for pending tasks after loading analysis
      await get().fetchPendingTasks();

      return analysisData;
    } catch (err) {
      // 404 is expected when no analysis exists yet - not an error
      if (err?.response?.status === 404) {
        set({
          analysis: null,
          loading: false,
        });

        // Check for pending tasks even when no analysis exists
        await get().fetchPendingTasks();

        return null;
      }

      const message = err?.response?.data?.message || "Failed to load analysis";
      set({ error: message, loading: false });
      return null;
    }
  },

  fetchPendingTasks: async () => {
    try {
      const response = await api.getPendingTasks();
      const tasks = response.data?.tasks || [];

      // Ensure tasks is an array
      if (!Array.isArray(tasks)) {
        console.error("Invalid tasks response:", tasks);
        return [];
      }

      // Find pending codebase-analysis task
      const codebaseTask = tasks.find(
        (task) => task.type === TASK_TYPES.CODEBASE_ANALYSIS,
      );

      if (codebaseTask) {
        set({
          pendingCodebaseTask: codebaseTask,
          analyzingCodebase: true,
        });
      }

      return tasks;
    } catch (err) {
      console.error("Failed to fetch pending tasks:", err);
      return [];
    }
  },

  analyzeCodebase: async () => {
    set({ analyzingCodebase: true, error: null });
    try {
      const response = await api.requestCodebaseAnalysis();
      const task = response.data;

      // Store the pending task
      set({
        pendingCodebaseTask: task,
        analyzingCodebase: true,
      });

      return { success: true, data: task };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to start analysis";
      set({ error: message, analyzingCodebase: false });
      return { success: false, error: message };
    }
  },

  saveCodebaseSummary: async (summary) => {
    if (typeof summary !== "string") {
      return { success: false, error: "Summary must be a string" };
    }

    try {
      await api.saveCodebaseSummary(summary);

      set((state) => {
        if (!state.analysis) {
          return state;
        }
        return {
          analysis: {
            ...state.analysis,
            summary,
          },
        };
      });

      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to save platform summary";
      return { success: false, error: message };
    }
  },

  clearPendingCodebaseTask: () => {
    set({
      pendingCodebaseTask: null,
      analyzingCodebase: false,
    });
  },

  fetchDomainAnalysis: async (domainId) => {
    if (!domainId) return null;

    set((state) => {
      const newLoadingMap = new Map(state.domainLoadingById);
      newLoadingMap.set(domainId, true);
      return { domainLoadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomain(domainId);
      const detail = response.data;

      set((state) => {
        const newAnalysisMap = new Map(state.domainAnalysisById);
        const newLoadingMap = new Map(state.domainLoadingById);
        newAnalysisMap.set(domainId, detail);
        newLoadingMap.set(domainId, false);
        return {
          domainAnalysisById: newAnalysisMap,
          domainLoadingById: newLoadingMap,
        };
      });

      return detail;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load domain analysis";

      set((state) => {
        const newLoadingMap = new Map(state.domainLoadingById);
        const newDocErrorMap = new Map(state.domainDocumentationErrorById);
        const newReqErrorMap = new Map(state.domainRequirementsErrorById);
        const newTestErrorMap = new Map(state.domainTestingErrorById);

        newLoadingMap.set(domainId, false);
        newDocErrorMap.set(domainId, message);
        newReqErrorMap.set(domainId, message);
        newTestErrorMap.set(domainId, message);

        return {
          domainLoadingById: newLoadingMap,
          domainDocumentationErrorById: newDocErrorMap,
          domainRequirementsErrorById: newReqErrorMap,
          domainTestingErrorById: newTestErrorMap,
        };
      });
      return null;
    }
  },

  analyzeDomainDocumentation: async (domain) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    // Clear logs for this domain section when starting new analysis
    useLogsStore.getState().clearLogs(domain.id, "documentation");

    set((state) => {
      const newLoadingMap = new Map(state.domainDocumentationLoadingById);
      newLoadingMap.set(domain.id, true);
      // Clear previous error when starting new analysis
      const newErrorMap = new Map(state.domainDocumentationErrorById);
      newErrorMap.delete(domain.id);
      return {
        domainDocumentationLoadingById: newLoadingMap,
        domainDocumentationErrorById: newErrorMap,
      };
    });

    try {
      await api.analyzeDomainDocumentation(domain.id, domain.files || []);
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to analyze documentation";
      set((state) => {
        const newLoadingMap = new Map(state.domainDocumentationLoadingById);
        const newErrorMap = new Map(state.domainDocumentationErrorById);
        newLoadingMap.set(domain.id, false);
        newErrorMap.set(domain.id, message);
        return {
          domainDocumentationLoadingById: newLoadingMap,
          domainDocumentationErrorById: newErrorMap,
        };
      });
      return { success: false, error: message };
    }
  },

  analyzeDomainRequirements: async (
    domain,
    userContext = "",
    includeDocumentation = false,
  ) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    // Clear logs for this domain section when starting new analysis
    useLogsStore.getState().clearLogs(domain.id, "requirements");

    set((state) => {
      const newLoadingMap = new Map(state.domainRequirementsLoadingById);
      newLoadingMap.set(domain.id, true);
      // Clear previous error when starting new analysis
      const newErrorMap = new Map(state.domainRequirementsErrorById);
      newErrorMap.delete(domain.id);
      return {
        domainRequirementsLoadingById: newLoadingMap,
        domainRequirementsErrorById: newErrorMap,
      };
    });

    try {
      await api.analyzeDomainRequirements(
        domain.id,
        domain.files || [],
        userContext,
        includeDocumentation,
      );
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to analyze requirements";
      set((state) => {
        const newLoadingMap = new Map(state.domainRequirementsLoadingById);
        const newErrorMap = new Map(state.domainRequirementsErrorById);
        newLoadingMap.set(domain.id, false);
        newErrorMap.set(domain.id, message);
        return {
          domainRequirementsLoadingById: newLoadingMap,
          domainRequirementsErrorById: newErrorMap,
        };
      });
      return { success: false, error: message };
    }
  },

  analyzeDomainTesting: async (domain) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    // Clear logs for this domain section when starting new analysis
    useLogsStore.getState().clearLogs(domain.id, "testing");

    set((state) => {
      const newLoadingMap = new Map(state.domainTestingLoadingById);
      newLoadingMap.set(domain.id, true);
      // Clear previous error when starting new analysis
      const newErrorMap = new Map(state.domainTestingErrorById);
      newErrorMap.delete(domain.id);
      return {
        domainTestingLoadingById: newLoadingMap,
        domainTestingErrorById: newErrorMap,
      };
    });

    try {
      await api.analyzeDomainTesting(domain.id, domain.files || []);
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to analyze testing";
      set((state) => {
        const newLoadingMap = new Map(state.domainTestingLoadingById);
        const newErrorMap = new Map(state.domainTestingErrorById);
        newLoadingMap.set(domain.id, false);
        newErrorMap.set(domain.id, message);
        return {
          domainTestingLoadingById: newLoadingMap,
          domainTestingErrorById: newErrorMap,
        };
      });
      return { success: false, error: message };
    }
  },

  analyzeDomainBugsSecurity: async (domain, includeRequirements = false) => {
    if (!domain?.id) return { success: false, error: "Invalid domain" };

    // Clear logs for this domain section when starting new analysis
    useLogsStore.getState().clearLogs(domain.id, "bugs-security");

    set((state) => {
      const newLoadingMap = new Map(state.domainBugsSecurityLoadingById);
      newLoadingMap.set(domain.id, true);
      // Clear previous error when starting new analysis
      const newErrorMap = new Map(state.domainBugsSecurityErrorById);
      newErrorMap.delete(domain.id);
      return {
        domainBugsSecurityLoadingById: newLoadingMap,
        domainBugsSecurityErrorById: newErrorMap,
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
        const newLoadingMap = new Map(state.domainBugsSecurityLoadingById);
        const newErrorMap = new Map(state.domainBugsSecurityErrorById);
        newLoadingMap.set(domain.id, false);
        newErrorMap.set(domain.id, message);
        return {
          domainBugsSecurityLoadingById: newLoadingMap,
          domainBugsSecurityErrorById: newErrorMap,
        };
      });
      return { success: false, error: message };
    }
  },

  // Section-specific fetch methods (replaces fetchDomainAnalysis)
  fetchDomainDocumentation: async (domainId) => {
    if (!domainId) return null;

    // Check cache first
    const cached = get().domainDocumentationById.get(domainId);
    if (cached) return cached;

    set((state) => {
      const newLoadingMap = new Map(state.domainDocumentationLoadingById);
      newLoadingMap.set(domainId, true);
      return { domainDocumentationLoadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomainDocumentation(domainId);
      const data = response.data;

      set((state) => {
        const newDataMap = new Map(state.domainDocumentationById);
        const newLoadingMap = new Map(state.domainDocumentationLoadingById);
        newDataMap.set(domainId, data);
        newLoadingMap.set(domainId, false);
        return {
          domainDocumentationById: newDataMap,
          domainDocumentationLoadingById: newLoadingMap,
        };
      });

      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load domain documentation";

      set((state) => {
        const newLoadingMap = new Map(state.domainDocumentationLoadingById);
        const newErrorMap = new Map(state.domainDocumentationErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, message);
        return {
          domainDocumentationLoadingById: newLoadingMap,
          domainDocumentationErrorById: newErrorMap,
        };
      });
      return null;
    }
  },

  fetchDomainRequirements: async (domainId) => {
    if (!domainId) return null;

    // Check cache first
    const cached = get().domainRequirementsById.get(domainId);
    if (cached) return cached;

    set((state) => {
      const newLoadingMap = new Map(state.domainRequirementsLoadingById);
      newLoadingMap.set(domainId, true);
      return { domainRequirementsLoadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomainRequirements(domainId);
      const data = response.data;

      set((state) => {
        const newDataMap = new Map(state.domainRequirementsById);
        const newLoadingMap = new Map(state.domainRequirementsLoadingById);
        newDataMap.set(domainId, data);
        newLoadingMap.set(domainId, false);
        return {
          domainRequirementsById: newDataMap,
          domainRequirementsLoadingById: newLoadingMap,
        };
      });

      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load domain requirements";

      set((state) => {
        const newLoadingMap = new Map(state.domainRequirementsLoadingById);
        const newErrorMap = new Map(state.domainRequirementsErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, message);
        return {
          domainRequirementsLoadingById: newLoadingMap,
          domainRequirementsErrorById: newErrorMap,
        };
      });
      return null;
    }
  },

  fetchDomainTesting: async (domainId) => {
    if (!domainId) return null;

    // Check cache first
    const cached = get().domainTestingById.get(domainId);
    if (cached) return cached;

    set((state) => {
      const newLoadingMap = new Map(state.domainTestingLoadingById);
      newLoadingMap.set(domainId, true);
      return { domainTestingLoadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomainTesting(domainId);
      const data = response.data;

      set((state) => {
        const newDataMap = new Map(state.domainTestingById);
        const newLoadingMap = new Map(state.domainTestingLoadingById);
        newDataMap.set(domainId, data);
        newLoadingMap.set(domainId, false);
        return {
          domainTestingById: newDataMap,
          domainTestingLoadingById: newLoadingMap,
        };
      });

      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load domain testing";

      set((state) => {
        const newLoadingMap = new Map(state.domainTestingLoadingById);
        const newErrorMap = new Map(state.domainTestingErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, message);
        return {
          domainTestingLoadingById: newLoadingMap,
          domainTestingErrorById: newErrorMap,
        };
      });
      return null;
    }
  },

  fetchDomainBugsSecurity: async (domainId) => {
    if (!domainId) return null;

    // Check cache first
    const cached = get().domainBugsSecurityById.get(domainId);
    if (cached) return cached;

    set((state) => {
      const newLoadingMap = new Map(state.domainBugsSecurityLoadingById);
      newLoadingMap.set(domainId, true);
      return { domainBugsSecurityLoadingById: newLoadingMap };
    });

    try {
      const response = await api.getDomainBugsSecurity(domainId);
      const data = response.data;

      set((state) => {
        const newDataMap = new Map(state.domainBugsSecurityById);
        const newLoadingMap = new Map(state.domainBugsSecurityLoadingById);
        newDataMap.set(domainId, data);
        newLoadingMap.set(domainId, false);
        return {
          domainBugsSecurityById: newDataMap,
          domainBugsSecurityLoadingById: newLoadingMap,
        };
      });

      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to load bugs & security";

      set((state) => {
        const newLoadingMap = new Map(state.domainBugsSecurityLoadingById);
        const newErrorMap = new Map(state.domainBugsSecurityErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, message);
        return {
          domainBugsSecurityLoadingById: newLoadingMap,
          domainBugsSecurityErrorById: newErrorMap,
        };
      });
      return null;
    }
  },

  updateBugsSecurityFindingAction: (domainId, findingId, action) => {
    set((state) => {
      const bugsSecurityData = state.domainBugsSecurityById.get(domainId);
      if (!bugsSecurityData || !bugsSecurityData.findings) {
        return state;
      }

      const updatedFindings = bugsSecurityData.findings.map((finding) =>
        finding.id === findingId ? { ...finding, action } : finding,
      );

      const newDataMap = new Map(state.domainBugsSecurityById);
      newDataMap.set(domainId, {
        ...bugsSecurityData,
        findings: updatedFindings,
      });

      return { domainBugsSecurityById: newDataMap };
    });
  },

  reset: () =>
    set({
      analysis: null,
      domainDocumentationById: new Map(),
      domainRequirementsById: new Map(),
      domainBugsSecurityById: new Map(),
      domainTestingById: new Map(),
      domainAnalysisById: new Map(),
      domainLoadingById: new Map(),
      domainAnalyzeLoadingById: new Map(),
      domainDocumentationLoadingById: new Map(),
      domainRequirementsLoadingById: new Map(),
      domainBugsSecurityLoadingById: new Map(),
      domainTestingLoadingById: new Map(),
      domainDocumentationErrorById: new Map(),
      domainRequirementsErrorById: new Map(),
      domainBugsSecurityErrorById: new Map(),
      domainTestingErrorById: new Map(),
      analyzingCodebase: false,
      loading: true,
      error: null,
    }),
}));
