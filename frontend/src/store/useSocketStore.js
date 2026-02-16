import { create } from "zustand";
import { initSocket } from "../services/socket";
import { SOCKET_EVENTS, TASK_TYPES } from "../constants/socket-events";
import { useAnalysisStore } from "./useAnalysisStore";
import { useDomainEditorStore } from "./useDomainEditorStore";

export const useSocketStore = create((set, get) => ({
  // State
  socket: null,
  socketConnected: false,

  // Actions
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

    // Analysis events
    socket.on(SOCKET_EVENTS.ANALYSIS_STARTED, (data) => {
      useAnalysisStore.getState().setStatus("analyzing");
      useAnalysisStore.getState().setAnalyzingCodebase(true);
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_PROGRESS, (data) => {
      useAnalysisStore.getState().setStatus(data.message || "analyzing");
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_COMPLETED, async (data) => {
      useAnalysisStore.getState().setStatus("completed");
      useAnalysisStore.getState().setAnalyzingCodebase(false);
      await useAnalysisStore.getState().fetchAnalysis();
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_ERROR, (data) => {
      useAnalysisStore.getState().setStatus("error");
      useAnalysisStore.getState().setError(data.error || "Analysis failed");
      useAnalysisStore.getState().setAnalyzingCodebase(false);
    });

    // Domain analysis events
    socket.on(SOCKET_EVENTS.DOMAIN_ANALYSIS_STARTED, (data) => {
      const { domainId, taskType } = data;
      if (taskType === TASK_TYPES.ANALYZE_DOMAIN_DETAILED) {
        useAnalysisStore.setState((state) => ({
          domainAnalyzeLoadingById: {
            ...state.domainAnalyzeLoadingById,
            [domainId]: true,
          },
        }));
      }
    });

    socket.on(SOCKET_EVENTS.DOMAIN_ANALYSIS_COMPLETED, async (data) => {
      const { domainId, taskType } = data;

      if (taskType === TASK_TYPES.ANALYZE_DOMAIN_DETAILED) {
        useAnalysisStore.setState((state) => ({
          domainAnalyzeLoadingById: {
            ...state.domainAnalyzeLoadingById,
            [domainId]: false,
          },
        }));
      }

      // Refresh domain data
      await useAnalysisStore.getState().fetchDomainAnalysis(domainId);

      // Initialize editors with new data
      useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_ANALYSIS_ERROR, (data) => {
      const { domainId, error, taskType } = data;

      if (taskType === TASK_TYPES.ANALYZE_DOMAIN_DETAILED) {
        useAnalysisStore.setState((state) => ({
          domainAnalyzeLoadingById: {
            ...state.domainAnalyzeLoadingById,
            [domainId]: false,
          },
          domainErrorById: {
            ...state.domainErrorById,
            [domainId]: error || "Domain analysis failed",
          },
        }));
      }
    });

    // Section-specific events
    socket.on(SOCKET_EVENTS.DOMAIN_DOCUMENTATION_COMPLETED, async (data) => {
      const { domainId } = data;
      useAnalysisStore.setState((state) => ({
        domainDocumentationLoadingById: {
          ...state.domainDocumentationLoadingById,
          [domainId]: false,
        },
      }));
      await useAnalysisStore.getState().fetchDomainAnalysis(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_REQUIREMENTS_COMPLETED, async (data) => {
      const { domainId } = data;
      useAnalysisStore.setState((state) => ({
        domainRequirementsLoadingById: {
          ...state.domainRequirementsLoadingById,
          [domainId]: false,
        },
      }));
      await useAnalysisStore.getState().fetchDomainAnalysis(domainId);
      useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_TESTING_COMPLETED, async (data) => {
      const { domainId } = data;
      useAnalysisStore.setState((state) => ({
        domainTestingLoadingById: {
          ...state.domainTestingLoadingById,
          [domainId]: false,
        },
      }));
      await useAnalysisStore.getState().fetchDomainAnalysis(domainId);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketConnected: false });
    }
  },

  reset: () => {
    get().disconnectSocket();
    set({ socket: null, socketConnected: false });
  },
}));
