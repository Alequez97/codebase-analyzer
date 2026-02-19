import { create } from "zustand";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
import { SECTION_TYPES } from "../constants/section-types";
import { useCodebaseStore } from "./useCodebaseStore";
import { useDomainDocumentationStore } from "./useDomainDocumentationStore";
import { useDomainRequirementsStore } from "./useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "./useDomainBugsSecurityStore";
import { useDomainTestingStore } from "./useDomainTestingStore";
import { useTaskProgressStore } from "./useTaskProgressStore";
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
      useCodebaseStore.getState().setAnalyzingCodebase(true);
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_PROGRESS, (data) => {
      // Progress updates handled via TASK_PROGRESS event
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_COMPLETED, async (data) => {
      useCodebaseStore.getState().setAnalyzingCodebase(false);
      await useCodebaseStore.getState().fetchAnalysis();
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_ERROR, (data) => {
      useCodebaseStore.getState().setError(data.error || "Analysis failed");
      useCodebaseStore.getState().setAnalyzingCodebase(false);
    });

    // Task completion events - handle all task types by checking type property
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, taskId, domainId } = data;

      // Clear progress indicator for this domain
      if (domainId) {
        useTaskProgressStore.getState().clearProgress(domainId);
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
        await useCodebaseStore.getState().fetchAnalysis();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        useDomainDocumentationStore.getState().setLoading(domainId, false);
        await useDomainDocumentationStore.getState().fetch(domainId);
        useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        useDomainRequirementsStore.getState().setLoading(domainId, false);
        await useDomainRequirementsStore.getState().fetch(domainId);
        useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
      } else if (type === TASK_TYPES.BUGS_SECURITY && domainId) {
        useDomainBugsSecurityStore.getState().setLoading(domainId, false);
        await useDomainBugsSecurityStore.getState().fetch(domainId);
      } else if (type === TASK_TYPES.TESTING && domainId) {
        useDomainTestingStore.getState().setLoading(domainId, false);
        await useDomainTestingStore.getState().fetch(domainId);
      }
    });

    // Task progress events
    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { domainId, type, stage, message } = data;
      if (domainId) {
        useTaskProgressStore.getState().setProgress(domainId, {
          type,
          stage,
          message,
        });

        // Ensure loading state remains true during progress
        if (type === TASK_TYPES.DOCUMENTATION) {
          const store = useDomainDocumentationStore.getState();
          if (!store.loadingById.get(domainId)) {
            store.setLoading(domainId, true);
          }
        } else if (type === TASK_TYPES.REQUIREMENTS) {
          const store = useDomainRequirementsStore.getState();
          if (!store.loadingById.get(domainId)) {
            store.setLoading(domainId, true);
          }
        } else if (type === TASK_TYPES.BUGS_SECURITY) {
          const store = useDomainBugsSecurityStore.getState();
          if (!store.loadingById.get(domainId)) {
            store.setLoading(domainId, true);
          }
        } else if (type === TASK_TYPES.TESTING) {
          const store = useDomainTestingStore.getState();
          if (!store.loadingById.get(domainId)) {
            store.setLoading(domainId, true);
          }
        }
      }
    });

    // Task failure events
    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, taskId, domainId, error } = data;

      // Clear progress indicator for this domain
      if (domainId) {
        useTaskProgressStore.getState().clearProgress(domainId);
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        const store = useDomainDocumentationStore.getState();
        store.setLoading(domainId, false);
        store.errorById.set(domainId, error || "Documentation analysis failed");
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        const store = useDomainRequirementsStore.getState();
        store.setLoading(domainId, false);
        store.errorById.set(domainId, error || "Requirements analysis failed");
      } else if (type === TASK_TYPES.BUGS_SECURITY && domainId) {
        const store = useDomainBugsSecurityStore.getState();
        store.setLoading(domainId, false);
        store.errorById.set(
          domainId,
          error || "Bugs & security analysis failed",
        );
      } else if (type === TASK_TYPES.TESTING && domainId) {
        const store = useDomainTestingStore.getState();
        store.setLoading(domainId, false);
        store.errorById.set(domainId, error || "Testing analysis failed");
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
          sectionType = SECTION_TYPES.DOCUMENTATION;
        } else if (type === TASK_TYPES.REQUIREMENTS) {
          sectionType = SECTION_TYPES.REQUIREMENTS;
        } else if (type === TASK_TYPES.BUGS_SECURITY) {
          sectionType = SECTION_TYPES.BUGS_SECURITY;
        } else if (type === TASK_TYPES.TESTING) {
          sectionType = SECTION_TYPES.TESTING;
        }

        if (sectionType) {
          useLogsStore.getState().appendLogs(domainId, sectionType, log);
        }
      }
    };

    socket.on(SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_BUGS_SECURITY, handleLogEvent);
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
