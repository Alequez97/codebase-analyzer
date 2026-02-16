import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

export const useAnalysisStore = create(
  persist(
    (set, get) => ({
      // State
      status: null,
      analysis: null,
      domainAnalysisById: {},
      domainLoadingById: {},
      domainErrorById: {},
      domainAnalyzeLoadingById: {},
      domainDocumentationLoadingById: {},
      domainRequirementsLoadingById: {},
      domainTestingLoadingById: {},
      analyzingCodebase: false,
      loading: true,
      error: null,

      // Actions
      setStatus: (status) => set({ status }),

      setAnalysis: (analysis) => set({ analysis }),

      setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      fetchAnalysis: async () => {
        set({ loading: true, error: null });
        try {
          // Fetch status first (always available)
          const statusResponse = await api.getStatus();

          // Try to fetch analysis (may not exist yet)
          try {
            const analysisResponse = await api.getFullCodebaseAnalysis();
            set({
              status: statusResponse.data,
              analysis: analysisResponse.data,
              loading: false,
            });
            return analysisResponse.data;
          } catch (analysisErr) {
            // 404 is expected when no analysis exists yet - not an error
            if (analysisErr?.response?.status === 404) {
              set({
                status: statusResponse.data,
                analysis: null,
                loading: false,
              });
              return null;
            }
            throw analysisErr; // Re-throw other errors
          }
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to load analysis";
          set({ error: message, loading: false });
          return null;
        }
      },

      analyzeCodebase: async () => {
        set({ analyzingCodebase: true, error: null });
        try {
          const response = await api.requestCodebaseAnalysis();
          return { success: true, data: response.data };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to start analysis";
          set({ error: message });
          return { success: false, error: message };
        } finally {
          set({ analyzingCodebase: false });
        }
      },

      fetchDomainAnalysis: async (domainId) => {
        if (!domainId) return null;

        set((state) => ({
          domainLoadingById: {
            ...state.domainLoadingById,
            [domainId]: true,
          },
          domainErrorById: {
            ...state.domainErrorById,
            [domainId]: null,
          },
        }));

        try {
          const response = await api.getDomain(domainId);
          const detail = response.data;

          set((state) => ({
            domainAnalysisById: {
              ...state.domainAnalysisById,
              [domainId]: detail,
            },
            domainLoadingById: {
              ...state.domainLoadingById,
              [domainId]: false,
            },
          }));

          return detail;
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to load domain analysis";
          set((state) => ({
            domainLoadingById: {
              ...state.domainLoadingById,
              [domainId]: false,
            },
            domainErrorById: {
              ...state.domainErrorById,
              [domainId]: message,
            },
          }));
          return null;
        }
      },

      analyzeDomain: async (domain) => {
        if (!domain?.id) return { success: false, error: "Invalid domain" };

        set((state) => ({
          domainAnalyzeLoadingById: {
            ...state.domainAnalyzeLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomain(domain.id);
          return { success: true };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to analyze domain";
          return { success: false, error: message };
        } finally {
          set((state) => ({
            domainAnalyzeLoadingById: {
              ...state.domainAnalyzeLoadingById,
              [domain.id]: false,
            },
          }));
        }
      },

      analyzeDomainDocumentation: async (domain) => {
        if (!domain?.id) return { success: false, error: "Invalid domain" };

        set((state) => ({
          domainDocumentationLoadingById: {
            ...state.domainDocumentationLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainDocumentation(domain.id);
          return { success: true };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to analyze documentation";
          return { success: false, error: message };
        } finally {
          set((state) => ({
            domainDocumentationLoadingById: {
              ...state.domainDocumentationLoadingById,
              [domain.id]: false,
            },
          }));
        }
      },

      analyzeDomainRequirements: async (domain) => {
        if (!domain?.id) return { success: false, error: "Invalid domain" };

        set((state) => ({
          domainRequirementsLoadingById: {
            ...state.domainRequirementsLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainRequirements(domain.id);
          return { success: true };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to analyze requirements";
          return { success: false, error: message };
        } finally {
          set((state) => ({
            domainRequirementsLoadingById: {
              ...state.domainRequirementsLoadingById,
              [domain.id]: false,
            },
          }));
        }
      },

      analyzeDomainTesting: async (domain) => {
        if (!domain?.id) return { success: false, error: "Invalid domain" };

        set((state) => ({
          domainTestingLoadingById: {
            ...state.domainTestingLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainTesting(domain.id);
          return { success: true };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to analyze testing";
          return { success: false, error: message };
        } finally {
          set((state) => ({
            domainTestingLoadingById: {
              ...state.domainTestingLoadingById,
              [domain.id]: false,
            },
          }));
        }
      },

      reset: () =>
        set({
          status: null,
          analysis: null,
          domainAnalysisById: {},
          domainLoadingById: {},
          domainErrorById: {},
          domainAnalyzeLoadingById: {},
          domainDocumentationLoadingById: {},
          domainRequirementsLoadingById: {},
          domainTestingLoadingById: {},
          analyzingCodebase: false,
          loading: true,
          error: null,
        }),
    }),
    {
      name: "analysis-store",
      partialize: (state) => ({
        analysis: state.analysis,
        domainAnalysisById: state.domainAnalysisById,
      }),
    },
  ),
);
