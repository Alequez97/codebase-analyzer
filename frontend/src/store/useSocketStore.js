import { create } from "zustand";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
import { taskTypeToSection } from "../utils/task-utils";
import { useCodebaseStore } from "./useCodebaseStore";
import { useDomainDocumentationStore } from "./useDomainDocumentationStore";
import { useDomainDiagramsStore } from "./useDomainDiagramsStore";
import { useDomainRequirementsStore } from "./useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "./useDomainBugsSecurityStore";
import { useDomainTestingStore } from "./useDomainTestingStore";
import { useTaskProgressStore } from "./useTaskProgressStore";
import { useDomainEditorStore } from "./useDomainEditorStore";
import { useLogsStore } from "./useLogsStore";
import { useDomainSectionsChatStore } from "./useDomainSectionsChatStore";

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
      } else if (type === TASK_TYPES.DIAGRAMS && domainId) {
        useDomainDiagramsStore.getState().setLoading(domainId, false);
        await useDomainDiagramsStore.getState().fetch(domainId);
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
      } else if (type === TASK_TYPES.EDIT_DOCUMENTATION) {
        const chatStore = useDomainSectionsChatStore.getState();
        chatStore.setAiThinking(false);
        chatStore.setAiResponding(false);
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
        } else if (type === TASK_TYPES.DIAGRAMS) {
          const store = useDomainDiagramsStore.getState();
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
        store.setError(domainId, error || "Documentation analysis failed");
      } else if (type === TASK_TYPES.DIAGRAMS && domainId) {
        const store = useDomainDiagramsStore.getState();
        store.setLoading(domainId, false);
        store.setError(domainId, error || "Diagrams analysis failed");
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        const store = useDomainRequirementsStore.getState();
        store.setLoading(domainId, false);
        store.setError(domainId, error || "Requirements analysis failed");
      } else if (type === TASK_TYPES.BUGS_SECURITY && domainId) {
        const store = useDomainBugsSecurityStore.getState();
        store.setLoading(domainId, false);
        store.setError(domainId, error || "Bugs & security analysis failed");
      } else if (type === TASK_TYPES.TESTING && domainId) {
        const store = useDomainTestingStore.getState();
        store.setLoading(domainId, false);
        store.setError(domainId, error || "Testing analysis failed");
      } else if (type === TASK_TYPES.EDIT_DOCUMENTATION) {
        const chatStore = useDomainSectionsChatStore.getState();
        chatStore.setAiThinking(false);
        chatStore.setAiResponding(false);
      }
    });

    // Log events - stream logs to logs store
    const handleLogEvent = ({ taskId, type, stream, log, domainId }) => {
      // Add to codebase analysis logs (visible in dashboard)
      useLogsStore.getState().appendCodebaseAnalysisLog(log);

      // If this is a domain-specific log, also append to domain logs
      if (domainId && type) {
        const sectionType = taskTypeToSection(type);
        if (sectionType) {
          useLogsStore.getState().appendLogs(domainId, sectionType, log);
        }
      }
    };

    socket.on(SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_TESTING, handleLogEvent);
    // Edit task logs
    socket.on(SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_TESTING, handleLogEvent);

    // Chat events - AI thinking indicator
    socket.on(
      SOCKET_EVENTS.EDIT_DOCUMENTATION_THINKING,
      ({ domainId, sectionType, thinking }) => {
        if (thinking) {
          const chatStore = useDomainSectionsChatStore.getState();
          chatStore.setAiResponding(true);
          chatStore.setAiThinking(true);
        }
      },
    );

    // Chat events - AI responses (description and content)
    socket.on(
      SOCKET_EVENTS.EDIT_DOCUMENTATION_DESCRIPTION,
      ({ domainId, sectionType, content, timestamp }) => {
        // Stop thinking, add description message
        const chatStore = useDomainSectionsChatStore.getState();
        const effectiveSectionType = sectionType || "documentation";
        chatStore.setAiThinking(false);
        chatStore.setAiResponding(true); // Still responding (waiting for content)
        if (content && content.trim()) {
          chatStore.addMessage(domainId, effectiveSectionType, {
            id: Date.now(),
            role: "assistant",
            content,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
          });
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.EDIT_DOCUMENTATION_CONTENT,
      ({ domainId, sectionType, content, timestamp }) => {
        const effectiveSectionType = sectionType || "documentation";
        const currentDocumentation = useDomainDocumentationStore
          .getState()
          .dataById.get(domainId);
        const oldContent = currentDocumentation?.content || "";

        // Set as pending suggestion for diff view (shape expected by section components)
        const chatStore = useDomainSectionsChatStore.getState();
        chatStore.setPendingSuggestion(domainId, effectiveSectionType, {
          oldContent,
          newContent: content || "",
          timestamp,
        });

        // All done - stop responding
        chatStore.setAiThinking(false);
        chatStore.setAiResponding(false);
      },
    );
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
