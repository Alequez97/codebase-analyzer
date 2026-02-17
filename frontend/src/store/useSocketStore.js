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
        useAnalysisStore.setState((state) => {
          const newLoadingMap = new Map(state.domainAnalyzeLoadingById);
          newLoadingMap.set(domainId, true);
          return { domainAnalyzeLoadingById: newLoadingMap };
        });
      }
    });

    socket.on(SOCKET_EVENTS.DOMAIN_ANALYSIS_COMPLETED, async (data) => {
      const { domainId, taskType } = data;

      if (taskType === TASK_TYPES.ANALYZE_DOMAIN_DETAILED) {
        useAnalysisStore.setState((state) => {
          const newLoadingMap = new Map(state.domainAnalyzeLoadingById);
          newLoadingMap.set(domainId, false);
          return { domainAnalyzeLoadingById: newLoadingMap };
        });
      }

      // Refresh all domain sections in parallel
      const analysisStore = useAnalysisStore.getState();
      await Promise.all([
        analysisStore.fetchDomainDocumentation(domainId),
        analysisStore.fetchDomainRequirements(domainId),
        analysisStore.fetchDomainTesting(domainId),
      ]);

      // Initialize editors with new data
      useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_ANALYSIS_ERROR, (data) => {
      const { domainId, error, taskType } = data;
      const errorMessage = error || "Domain analysis failed";

      if (taskType === TASK_TYPES.ANALYZE_DOMAIN_DETAILED) {
        useAnalysisStore.setState((state) => {
          const newLoadingMap = new Map(state.domainAnalyzeLoadingById);
          const newDocErrorMap = new Map(state.domainDocumentationErrorById);
          const newReqErrorMap = new Map(state.domainRequirementsErrorById);
          const newTestErrorMap = new Map(state.domainTestingErrorById);

          newLoadingMap.set(domainId, false);
          newDocErrorMap.set(domainId, errorMessage);
          newReqErrorMap.set(domainId, errorMessage);
          newTestErrorMap.set(domainId, errorMessage);

          return {
            domainAnalyzeLoadingById: newLoadingMap,
            domainDocumentationErrorById: newDocErrorMap,
            domainRequirementsErrorById: newReqErrorMap,
            domainTestingErrorById: newTestErrorMap,
          };
        });
      }
    });

    // Section-specific events
    socket.on(SOCKET_EVENTS.DOMAIN_DOCUMENTATION_COMPLETED, async (data) => {
      const { domainId } = data;
      // Fetch only the documentation section
      await useAnalysisStore.getState().fetchDomainDocumentation(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_REQUIREMENTS_COMPLETED, async (data) => {
      const { domainId } = data;
      // Fetch only the requirements section
      await useAnalysisStore.getState().fetchDomainRequirements(domainId);
      useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
    });

    socket.on(SOCKET_EVENTS.DOMAIN_TESTING_COMPLETED, async (data) => {
      const { domainId } = data;
      // Fetch only the testing section
      await useAnalysisStore.getState().fetchDomainTesting(domainId);
    });

    // Task completion events
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, taskId } = data;

      if (type === "codebase-analysis") {
        // Clear pending task state
        useAnalysisStore.getState().clearPendingCodebaseTask();

        // Refresh analysis data
        await useAnalysisStore.getState().fetchAnalysis();
      }
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
