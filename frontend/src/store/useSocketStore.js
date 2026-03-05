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
import { useDomainRefactoringAndTestingStore as useDomainTestingStore } from "./useDomainRefactoringAndTestingStore";
import { useTaskProgressStore } from "./useTaskProgressStore";
import { useDomainEditorStore } from "./useDomainEditorStore";
import { useLogsStore } from "./useLogsStore";
import { useDomainSectionsChatStore } from "./useDomainSectionsChatStore";
import { useApplyTestStore } from "./useApplyTestStore";
import { useAgentChatStore } from "./useAgentChatStore";

const SOCKET_URL = window.location.origin;

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
    socket.on(SOCKET_EVENTS.ANALYSIS_STARTED, (_) => {
      useCodebaseStore.getState().setAnalyzingCodebase(true);
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_PROGRESS, (_) => {
      // Progress updates handled via TASK_PROGRESS event
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_COMPLETED, async (_) => {
      useCodebaseStore.getState().setAnalyzingCodebase(false);
      await useCodebaseStore.getState().fetchAnalysis();
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_ERROR, (data) => {
      useCodebaseStore.getState().setError(data.error || "Analysis failed");
      useCodebaseStore.getState().setAnalyzingCodebase(false);
    });

    // Task completion events - handle all task types by checking type property
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, domainId } = data;

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
      } else if (type === TASK_TYPES.REFACTORING_AND_TESTING && domainId) {
        useDomainTestingStore.getState().setLoading(domainId, false);
        await useDomainTestingStore.getState().fetch(domainId);
      } else if (type === TASK_TYPES.APPLY_TEST && domainId) {
        useApplyTestStore
          .getState()
          .completeApplyByTaskId(domainId, data.taskId, data.params);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useApplyTestStore.getState().completeApplyRefactoring(domainId);
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
        } else if (type === TASK_TYPES.REFACTORING_AND_TESTING) {
          const store = useDomainTestingStore.getState();
          if (!store.loadingById.get(domainId)) {
            store.setLoading(domainId, true);
          }
        }
      }
    });

    // Task failure events
    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, domainId, error } = data;

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
      } else if (type === TASK_TYPES.REFACTORING_AND_TESTING && domainId) {
        const store = useDomainTestingStore.getState();
        store.setLoading(domainId, false);
        store.setError(
          domainId,
          error || "Refactoring & testing analysis failed",
        );
      } else if (type === TASK_TYPES.APPLY_TEST && domainId) {
        useApplyTestStore.getState().failApplyByTaskId(domainId, data.taskId);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useApplyTestStore.getState().failApplyRefactoring(domainId);
      } else if (type === TASK_TYPES.EDIT_DOCUMENTATION) {
        const chatStore = useDomainSectionsChatStore.getState();
        chatStore.setAiThinking(false);
        chatStore.setAiResponding(false);
      } else if (type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
        const chatStore = useAgentChatStore.getState();
        chatStore.setAiThinking(false);
        chatStore.setAiWorking(false);
        chatStore.setAwaitingResponse(false);
      }
    });

    // Log events - stream logs to logs store
    const handleLogEvent = ({ type, log, domainId, taskId }) => {
      // Add to codebase analysis logs (visible in dashboard)
      useLogsStore.getState().appendCodebaseAnalysisLog(log);

      // If this is a domain-specific log, also append to domain logs
      if (domainId && type) {
        const sectionType = taskTypeToSection(type);
        if (sectionType) {
          useLogsStore.getState().appendLogs(domainId, sectionType, log);
        }

        if (type === TASK_TYPES.APPLY_TEST && taskId) {
          useApplyTestStore
            .getState()
            .appendApplyLogByTaskId(domainId, taskId, log);
        }
      }
    };

    socket.on(SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REFACTORING_AND_TESTING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_APPLY_TEST, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_APPLY_REFACTORING, handleLogEvent);
    // Edit task logs
    socket.on(SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REFACTORING_AND_TESTING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_CUSTOM_CODEBASE_TASK, handleLogEvent);

    // ── Custom codebase task events (floating agent chat) ───────────────────

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_THINKING, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(true);
        chatStore.setAiWorking(true);
      }
    });

    socket.on(
      SOCKET_EVENTS.CUSTOM_TASK_MESSAGE,
      ({ taskId, content, role }) => {
        const chatStore = useAgentChatStore.getState();
        if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
          chatStore.setAiThinking(false);
          chatStore.addMessage({ role: role || "assistant", content });
        }
      },
    );

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_PROGRESS, ({ taskId, message }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({
          role: "system",
          content: `⚙️ ${message}`,
          isProgress: true,
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.CUSTOM_TASK_FILE_UPDATED,
      ({ taskId, filePath }) => {
        const chatStore = useAgentChatStore.getState();
        if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
          chatStore.addMessage({
            role: "system",
            content: `📝 Updated: \`${filePath}\``,
            isProgress: true,
          });
        }
      },
    );

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_DOC_UPDATED, ({ taskId, filePath }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({
          role: "system",
          content: `📚 Documentation updated: \`${filePath}\``,
          isProgress: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_CONFLICT_DETECTED, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(false);
        // isAwaitingResponse will be set by CUSTOM_TASK_AWAITING_RESPONSE
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_AWAITING_RESPONSE, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(false);
        chatStore.setAiWorking(false);
        chatStore.setAwaitingResponse(true);
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_COMPLETED, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(false);
        chatStore.setAiWorking(false);
        chatStore.setAwaitingResponse(false);
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_CANCELLED, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(false);
        chatStore.setAiWorking(false);
        chatStore.setAwaitingResponse(false);
        chatStore.addMessage({
          role: "system",
          content:
            "⚠️ Task cancelled by user. Any partial changes can be reviewed with `git diff`.",
          isWarning: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_FAILED, ({ taskId, error }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(false);
        chatStore.setAiWorking(false);
        chatStore.setAwaitingResponse(false);
        chatStore.addMessage({
          role: "assistant",
          content: `❌ Task failed: ${error || "An unexpected error occurred."}`,
          isError: true,
        });
      }
    });

    // Also handle TASK_COMPLETED / TASK_FAILED for CUSTOM_CODEBASE_TASK type
    // → CUSTOM_CODEBASE_TASK handling is done inside TASK_COMPLETED and TASK_FAILED above.

    // Chat events - AI thinking indicator
    socket.on(
      SOCKET_EVENTS.EDIT_DOCUMENTATION_THINKING,
      ({ thinking, domainId, sectionType }) => {
        if (thinking) {
          const chatStore = useDomainSectionsChatStore.getState();
          chatStore.setAiResponding(true);
          chatStore.setAiThinking(true);

          // Also update floating agent chat if open for this section
          const agentChatStore = useAgentChatStore.getState();
          const effectiveSectionType = sectionType || "documentation";
          if (
            agentChatStore.isOpen &&
            agentChatStore.selectedTaskType === effectiveSectionType
          ) {
            agentChatStore.setAiThinking(true);
            agentChatStore.setAiWorking(true);
          }
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

        // Also update floating agent chat if it's open for this section
        const agentChatStore = useAgentChatStore.getState();
        if (
          agentChatStore.isOpen &&
          agentChatStore.selectedTaskType === effectiveSectionType
        ) {
          agentChatStore.setAiThinking(false);
          if (content && content.trim()) {
            agentChatStore.addMessage({ role: "assistant", content });
          }
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

        // Also update floating agent chat if it's open for this section
        const agentChatStore = useAgentChatStore.getState();
        if (
          agentChatStore.isOpen &&
          agentChatStore.selectedTaskType === effectiveSectionType
        ) {
          agentChatStore.setAiWorking(false);
          agentChatStore.setAiThinking(false);
        }
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
