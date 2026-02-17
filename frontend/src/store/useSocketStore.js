import { create } from "zustand";
import { initSocket } from "../services/socket";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
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

    // Task completion events - handle all task types by checking type property
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, taskId, domainId } = data;

      // Clear progress indicator for this domain
      if (domainId) {
        useAnalysisStore.getState().setDomainTaskProgress(domainId, null);
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        // Clear pending task state
        useAnalysisStore.getState().clearPendingCodebaseTask();

        // Refresh analysis data
        await useAnalysisStore.getState().fetchAnalysis();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        // Clear loading state
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainDocumentationLoadingById);
        newLoadingMap.set(domainId, false);
        useAnalysisStore.setState({
          domainDocumentationLoadingById: newLoadingMap,
        });

        // Fetch updated documentation section
        await useAnalysisStore.getState().fetchDomainDocumentation(domainId);
        useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        // Clear loading state
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainRequirementsLoadingById);
        newLoadingMap.set(domainId, false);
        useAnalysisStore.setState({
          domainRequirementsLoadingById: newLoadingMap,
        });

        // Fetch updated requirements section
        await useAnalysisStore.getState().fetchDomainRequirements(domainId);
        useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
      } else if (type === TASK_TYPES.TESTING && domainId) {
        // Clear loading state
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainTestingLoadingById);
        newLoadingMap.set(domainId, false);
        useAnalysisStore.setState({ domainTestingLoadingById: newLoadingMap });

        // Fetch updated testing section
        await useAnalysisStore.getState().fetchDomainTesting(domainId);
      }
    });

    // Task progress events
    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { domainId, type, stage, message } = data;
      if (domainId) {
        useAnalysisStore.getState().setDomainTaskProgress(domainId, {
          type,
          stage,
          message,
        });

        // Ensure loading state remains true during progress for documentation
        if (type === "analyze-documentation") {
          const state = useAnalysisStore.getState();
          const loadingMap = new Map(state.domainDocumentationLoadingById);
          if (!loadingMap.get(domainId)) {
            loadingMap.set(domainId, true);
            useAnalysisStore.setState({
              domainDocumentationLoadingById: loadingMap,
            });
          }
        }
      }
    });

    // Task failure events
    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, taskId, domainId, error } = data;

      // Clear progress indicator for this domain
      if (domainId) {
        useAnalysisStore.getState().setDomainTaskProgress(domainId, null);
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        // Clear pending task state
        useAnalysisStore.getState().clearPendingCodebaseTask();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        // Clear loading state and set error
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainDocumentationLoadingById);
        const newErrorMap = new Map(state.domainDocumentationErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, error || "Documentation analysis failed");
        useAnalysisStore.setState({
          domainDocumentationLoadingById: newLoadingMap,
          domainDocumentationErrorById: newErrorMap,
        });
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        // Clear loading state and set error
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainRequirementsLoadingById);
        const newErrorMap = new Map(state.domainRequirementsErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, error || "Requirements analysis failed");
        useAnalysisStore.setState({
          domainRequirementsLoadingById: newLoadingMap,
          domainRequirementsErrorById: newErrorMap,
        });
      } else if (type === TASK_TYPES.TESTING && domainId) {
        // Clear loading state and set error
        const state = useAnalysisStore.getState();
        const newLoadingMap = new Map(state.domainTestingLoadingById);
        const newErrorMap = new Map(state.domainTestingErrorById);
        newLoadingMap.set(domainId, false);
        newErrorMap.set(domainId, error || "Testing analysis failed");
        useAnalysisStore.setState({
          domainTestingLoadingById: newLoadingMap,
          domainTestingErrorById: newErrorMap,
        });
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
