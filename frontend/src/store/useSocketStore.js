import { create } from "zustand";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
import { useAnalysisStore } from "./useAnalysisStore";
import { useDomainEditorStore } from "./useDomainEditorStore";
import { useLogsStore } from "./useLogsStore";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";

export const useSocketStore = create((set, get) => ({
  // State
  socket: null,
  socketConnected: false,

  // Actions
  initSocket: () => {
    // Create socket connection if it doesn't exist
    if (get().socket) {
      return; // Already initialized
    }

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

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

    // Log events - stream logs to logs store
    const handleLogEvent = ({ taskId, type, stream, log, domainId }) => {
      // Add to codebase analysis logs (visible in dashboard)
      useLogsStore.getState().appendCodebaseAnalysisLog(log);

      // If this is a domain-specific log, also append to domain logs
      if (domainId && type) {
        let sectionType = null;
        if (type === TASK_TYPES.DOCUMENTATION) {
          sectionType = "documentation";
        } else if (type === TASK_TYPES.REQUIREMENTS) {
          sectionType = "requirements";
        } else if (type === TASK_TYPES.TESTING) {
          sectionType = "testing";
        }

        if (sectionType) {
          useLogsStore.getState().appendLogs(domainId, sectionType, log);
        }
      }
    };

    socket.on(SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_TESTING, handleLogEvent);
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
