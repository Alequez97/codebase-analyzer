import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";
import { getSocket, initSocket } from "../services/socket";
import { SOCKET_EVENTS, TASK_TYPES } from "../constants/socket-events";

function requirementsToEditableText(requirements = []) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return "";
  }

  return requirements
    .map((item, index) => {
      const priority = item?.priority || "P2";
      return `${index + 1}. [${priority}] ${item.description || ""}`.trim();
    })
    .join("\n");
}

function editableTextToRequirements(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\d+\.\s*/, "");
    const priorityMatch = cleaned.match(/^\[(P[0-3])\]\s*/i);
    const priority = priorityMatch?.[1]?.toUpperCase() || "P2";
    const description = cleaned.replace(/^\[(P[0-3])\]\s*/i, "").trim();

    return {
      id: `REQ-${String(index + 1).padStart(3, "0")}`,
      description,
      source: "Edited in dashboard",
      confidence: "MEDIUM",
      priority,
    };
  });
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      // State
      status: null,
      analysis: null,
      domainAnalysisById: {},
      domainLoadingById: {},
      domainErrorById: {},
      domainAnalyzeLoadingById: {},
      // New: separate loading states for each section
      domainDocumentationLoadingById: {},
      domainRequirementsLoadingById: {},
      domainTestingLoadingById: {},
      // Editable requirements
      editedRequirementsByDomainId: {},
      // Test application states
      applyingTestsByDomainId: {},
      analyzingCodebase: false,
      tools: [],
      selectedAgent: "aider",
      toolsLoading: false,
      toolsError: null,
      loading: true,
      error: null,
      socket: null,
      socketConnected: false,
      showLogs: false,

      // Actions
      setStatus: (status) => set({ status }),

      setAnalysis: (analysis) => set({ analysis }),

      setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

      setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      toggleLogs: () => set((state) => ({ showLogs: !state.showLogs })),

      // Initialize socket connection and listeners
      initSocket: () => {
        const socket = initSocket();
        set({ socket });

        // Connection status
        socket.on("connect", () => {
          set({ socketConnected: true });
        });

        socket.on("disconnect", () => {
          set({ socketConnected: false });
        });

        socket.on("connect_error", () => {
          set({ socketConnected: false });
        });

        // Listen for task completion
        socket.on(SOCKET_EVENTS.TASK_COMPLETED, ({ type, domainId, data }) => {
          if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
            set({ analyzingCodebase: false });
            // If data is included (mock mode), use it directly
            if (data) {
              set({ analysis: data });
            } else {
              get().fetchCodebaseAnalysis();
            }
          } else if (type === TASK_TYPES.ANALYZE) {
            if (domainId) {
              set((state) => ({
                domainAnalyzeLoadingById: {
                  ...state.domainAnalyzeLoadingById,
                  [domainId]: false,
                },
              }));
              // If data is included (mock mode), use it directly
              if (data) {
                set((state) => ({
                  domainAnalysisById: {
                    ...state.domainAnalysisById,
                    [domainId]: data,
                  },
                  editedRequirementsByDomainId: {
                    ...state.editedRequirementsByDomainId,
                    [domainId]: requirementsToEditableText(data?.requirements),
                  },
                }));
              } else {
                get().fetchDomainAnalysis(domainId);
              }
            } else {
              set({ domainAnalyzeLoadingById: {} });
            }
            get().fetchCodebaseAnalysis();
          } else if (type === "analyze-documentation") {
            if (domainId) {
              set((state) => ({
                domainDocumentationLoadingById: {
                  ...state.domainDocumentationLoadingById,
                  [domainId]: false,
                },
              }));

              if (data) {
                set((state) => ({
                  domainAnalysisById: {
                    ...state.domainAnalysisById,
                    [domainId]: {
                      ...(state.domainAnalysisById[domainId] || {}),
                      documentation: data.documentation,
                      domainName: data.domainName,
                    },
                  },
                }));
              } else {
                get().fetchDomainDocumentation(domainId);
              }
            }
          } else if (type === "analyze-requirements") {
            if (domainId) {
              set((state) => ({
                domainRequirementsLoadingById: {
                  ...state.domainRequirementsLoadingById,
                  [domainId]: false,
                },
              }));

              if (data) {
                set((state) => ({
                  domainAnalysisById: {
                    ...state.domainAnalysisById,
                    [domainId]: {
                      ...(state.domainAnalysisById[domainId] || {}),
                      requirements: data.requirements,
                      domainName: data.domainName,
                    },
                  },
                  editedRequirementsByDomainId: {
                    ...state.editedRequirementsByDomainId,
                    [domainId]: requirementsToEditableText(data.requirements),
                  },
                }));
              } else {
                get().fetchDomainRequirements(domainId);
              }
            }
          } else if (type === "analyze-testing") {
            if (domainId) {
              set((state) => ({
                domainTestingLoadingById: {
                  ...state.domainTestingLoadingById,
                  [domainId]: false,
                },
              }));

              if (data) {
                set((state) => ({
                  domainAnalysisById: {
                    ...state.domainAnalysisById,
                    [domainId]: {
                      ...(state.domainAnalysisById[domainId] || {}),
                      testing: data.testing,
                      domainName: data.domainName,
                    },
                  },
                }));
              } else {
                get().fetchDomainTesting(domainId);
              }
            }
          }
        });
      },

      // Async Actions
      fetchStatus: async () => {
        try {
          const response = await api.getStatus();
          set({ status: response.data, error: null, loading: false });
        } catch (err) {
          set({ error: "Failed to connect to backend server", loading: false });
        }
      },

      fetchCodebaseAnalysis: async () => {
        try {
          const response = await api.getFullCodebaseAnalysis();
          set({ analysis: response.data, error: null });
        } catch (err) {
          // Don't set error for 404 - just means analysis hasn't been run yet
          if (err?.response?.status !== 404) {
            console.error("Error fetching codebase analysis:", err);
          }
          set({ analysis: null });
        }
      },

      fetchTools: async () => {
        set({ toolsLoading: true, toolsError: null });

        try {
          const response = await api.getTools();
          const tools = response.data?.tools || [];
          const current = get().selectedAgent;
          const hasCurrent = tools.some((tool) => tool.id === current);
          const fallback = tools[0]?.id || "aider";

          set({
            tools,
            selectedAgent: hasCurrent ? current : fallback,
            toolsLoading: false,
            toolsError: null,
          });
        } catch (err) {
          const message =
            err?.response?.status === 404
              ? "Tools endpoint not available (Cannot GET /api/tools). Restart backend after latest changes."
              : "Failed to load tools.";

          set({
            tools: [],
            toolsLoading: false,
            toolsError: message,
          });
        }
      },

      startCodebaseAnalysis: async () => {
        set({ analyzingCodebase: true, error: null });

        try {
          await api.requestCodebaseAnalysis(true, get().selectedAgent);
          // Socket will handle the completion event
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to start codebase analysis";
          set({
            error: message,
            analyzingCodebase: false,
          });
        }
      },

      fetchDomainAnalysis: async (domainId) => {
        if (!domainId) {
          return null;
        }

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
            editedRequirementsByDomainId: {
              ...state.editedRequirementsByDomainId,
              [domainId]: requirementsToEditableText(detail?.requirements),
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
        if (!domain?.id) {
          return;
        }

        set((state) => ({
          domainAnalyzeLoadingById: {
            ...state.domainAnalyzeLoadingById,
            [domain.id]: true,
          },
          domainErrorById: {
            ...state.domainErrorById,
            [domain.id]: null,
          },
        }));

        try {
          await api.analyzeDomain(
            domain.id,
            domain.name,
            domain.files || [],
            true,
            get().selectedAgent,
          );
          // Socket will handle the completion event
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to start domain analysis";
          set((state) => ({
            domainAnalyzeLoadingById: {
              ...state.domainAnalyzeLoadingById,
              [domain.id]: false,
            },
            domainErrorById: {
              ...state.domainErrorById,
              [domain.id]: message,
            },
          }));
        }
      },

      fetchDomainDocumentation: async (domainId) => {
        if (!domainId) return null;

        try {
          const response = await api.getDomainDocumentation(domainId);
          const data = response.data;

          set((state) => ({
            domainAnalysisById: {
              ...state.domainAnalysisById,
              [domainId]: {
                ...(state.domainAnalysisById[domainId] || {}),
                documentation: data.documentation,
                domainName: data.domainName,
              },
            },
          }));

          return data;
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error fetching domain documentation:", err);
          }
          return null;
        }
      },

      fetchDomainRequirements: async (domainId) => {
        if (!domainId) return null;

        try {
          const response = await api.getDomainRequirements(domainId);
          const data = response.data;

          set((state) => ({
            domainAnalysisById: {
              ...state.domainAnalysisById,
              [domainId]: {
                ...(state.domainAnalysisById[domainId] || {}),
                requirements: data.requirements,
                domainName: data.domainName,
              },
            },
            editedRequirementsByDomainId: {
              ...state.editedRequirementsByDomainId,
              [domainId]: requirementsToEditableText(data.requirements),
            },
          }));

          return data;
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error fetching domain requirements:", err);
          }
          return null;
        }
      },

      fetchDomainTesting: async (domainId) => {
        if (!domainId) return null;

        try {
          const response = await api.getDomainTesting(domainId);
          const data = response.data;

          set((state) => ({
            domainAnalysisById: {
              ...state.domainAnalysisById,
              [domainId]: {
                ...(state.domainAnalysisById[domainId] || {}),
                testing: data.testing,
                domainName: data.domainName,
              },
            },
          }));

          return data;
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error fetching domain testing:", err);
          }
          return null;
        }
      },

      analyzeDomainDocumentation: async (domain) => {
        if (!domain?.id) return;

        set((state) => ({
          domainDocumentationLoadingById: {
            ...state.domainDocumentationLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainDocumentation(
            domain.id,
            domain.name,
            domain.files || [],
            true,
            get().selectedAgent,
          );
          // Socket will handle the completion event
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            "Failed to start documentation analysis";
          set((state) => ({
            domainDocumentationLoadingById: {
              ...state.domainDocumentationLoadingById,
              [domain.id]: false,
            },
            domainErrorById: {
              ...state.domainErrorById,
              [domain.id]: message,
            },
          }));
        }
      },

      analyzeDomainRequirements: async (domain) => {
        if (!domain?.id) return;

        set((state) => ({
          domainRequirementsLoadingById: {
            ...state.domainRequirementsLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainRequirements(
            domain.id,
            domain.name,
            domain.files || [],
            true,
            get().selectedAgent,
          );
          // Socket will handle the completion event
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            "Failed to start requirements analysis";
          set((state) => ({
            domainRequirementsLoadingById: {
              ...state.domainRequirementsLoadingById,
              [domain.id]: false,
            },
            domainErrorById: {
              ...state.domainErrorById,
              [domain.id]: message,
            },
          }));
        }
      },

      analyzeDomainTesting: async (domain) => {
        if (!domain?.id) return;

        set((state) => ({
          domainTestingLoadingById: {
            ...state.domainTestingLoadingById,
            [domain.id]: true,
          },
        }));

        try {
          await api.analyzeDomainTesting(
            domain.id,
            domain.name,
            domain.files || [],
            true,
            get().selectedAgent,
          );
          // Socket will handle the completion event
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to start testing analysis";
          set((state) => ({
            domainTestingLoadingById: {
              ...state.domainTestingLoadingById,
              [domain.id]: false,
            },
            domainErrorById: {
              ...state.domainErrorById,
              [domain.id]: message,
            },
          }));
        }
      },

      saveRequirements: async (domainId) => {
        const text = get().editedRequirementsByDomainId[domainId] || "";
        const parsedRequirements = editableTextToRequirements(text);
        const domain = get().domainAnalysisById[domainId] || {};

        try {
          await api.saveRequirements(
            domainId,
            domain.domainName || domainId,
            parsedRequirements,
          );

          set((state) => ({
            domainAnalysisById: {
              ...state.domainAnalysisById,
              [domainId]: {
                ...state.domainAnalysisById[domainId],
                requirements: parsedRequirements,
              },
            },
          }));

          return { success: true };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to save requirements";
          return { success: false, error: message };
        }
      },

      applyTest: async (domainId, testId) => {
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

          set((state) => ({
            applyingTestsByDomainId: {
              ...state.applyingTestsByDomainId,
              [domainId]: {
                ...(state.applyingTestsByDomainId[domainId] || {}),
                [testId]: false,
              },
            },
          }));

          return { success: true, message: response.data.message };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Failed to apply test";

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

      updateEditedRequirements: (domainId, text) => {
        set((state) => ({
          editedRequirementsByDomainId: {
            ...state.editedRequirementsByDomainId,
            [domainId]: text,
          },
        }));
      },

      resetEditedRequirements: (domainId) => {
        const existing = get().domainAnalysisById[domainId];
        set((state) => ({
          editedRequirementsByDomainId: {
            ...state.editedRequirementsByDomainId,
            [domainId]: requirementsToEditableText(existing?.requirements),
          },
        }));
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
          editedRequirementsByDomainId: {},
          applyingTestsByDomainId: {},
          analyzingCodebase: false,
          tools: [],
          selectedAgent: "aider",
          toolsLoading: false,
          toolsError: null,
          loading: true,
          error: null,
          socketConnected: false,
          showLogs: false,
        }),
    }),
    {
      name: "codebase-analyzer-storage",
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        analysis: state.analysis,
        domainAnalysisById: state.domainAnalysisById,
        editedRequirementsByDomainId: state.editedRequirementsByDomainId,
        selectedAgent: state.selectedAgent,
      }),
    },
  ),
);
