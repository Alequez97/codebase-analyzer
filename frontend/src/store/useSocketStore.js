import { create } from "zustand";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
import { toaster } from "../components/ui/toaster";
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
import { useImplementTestStore } from "./useImplementTestStore";
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
      const { type, domainId, taskId } = data;

      // Clear progress indicator for this task
      if (taskId) {
        useTaskProgressStore.getState().clearProgress(taskId);
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
        await useCodebaseStore.getState().fetchAnalysis();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        useDomainDocumentationStore.getState().setLoading(domainId, false);
        // Content is pushed directly via DOCUMENTATION_UPDATED socket event
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
      } else if (type === TASK_TYPES.IMPLEMENT_TEST && domainId) {
        useImplementTestStore
          .getState()
          .completeImplementByTaskId(domainId, data.taskId, data.params);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useImplementTestStore.getState().completeApplyRefactoring(domainId);
      } else if (type === TASK_TYPES.IMPLEMENT_FIX && domainId) {
        const findingId = data.params?.findingId;
        const store = useDomainBugsSecurityStore.getState();
        if (findingId) {
          store.clearImplementingFix(findingId);
          store.updateFindingAction(domainId, findingId, "apply");
        }
        toaster.create({
          title: "Fix implemented",
          description: "The AI has finished implementing the fix.",
          type: "success",
        });
      } else if (type === TASK_TYPES.EDIT_DOCUMENTATION) {
        // chatId is the stable session ID — look it up by domainId+section.
        // taskId is ephemeral and not used for chat state management.
        const chatId = useAgentChatStore
          .getState()
          .getCurrentChatId(domainId, "documentation");
        if (chatId) {
          useAgentChatStore.getState().setChatState(chatId, {
            isWorking: false,
            isThinking: false,
            isAwaitingResponse: false,
          });
        }
      }
    });

    // Task progress events
    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { taskId, domainId, type, stage, message } = data;
      if (domainId) {
        useTaskProgressStore.getState().setProgress(taskId, {
          domainId,
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
        } else if (type === TASK_TYPES.IMPLEMENT_FIX) {
          useDomainBugsSecurityStore
            .getState()
            .setImplementingFixProgress(taskId, { message, stage });
        } else if (type === TASK_TYPES.IMPLEMENT_TEST) {
          useImplementTestStore
            .getState()
            .setImplementTestProgress(taskId, { message, stage });
        } else if (type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
          const chatStore = useAgentChatStore.getState();
          if (chatStore.currentTaskId === taskId) {
            chatStore.setChatState(taskId, { message, stage });
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
      const { type, domainId, taskId, error } = data;

      // Clear progress indicator for this task
      if (taskId) {
        useTaskProgressStore.getState().clearProgress(taskId);
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
      } else if (type === TASK_TYPES.IMPLEMENT_TEST && domainId) {
        useImplementTestStore
          .getState()
          .failImplementByTaskId(domainId, data.taskId);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useImplementTestStore.getState().failApplyRefactoring(domainId);
      } else if (type === TASK_TYPES.IMPLEMENT_FIX && domainId) {
        const findingId = data.params?.findingId;
        if (findingId) {
          useDomainBugsSecurityStore.getState().clearImplementingFix(findingId);
        }
        toaster.create({
          title: "Fix failed",
          description: error || "The AI could not implement the fix.",
          type: "error",
        });
      } else if (type === TASK_TYPES.EDIT_DOCUMENTATION) {
        // Same stable-chatId lookup as in TASK_COMPLETED
        const chatId = useAgentChatStore
          .getState()
          .getCurrentChatId(domainId, "documentation");
        if (chatId) {
          useAgentChatStore.getState().setChatState(chatId, {
            isWorking: false,
            isThinking: false,
            isAwaitingResponse: false,
          });
        }
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

        if (type === TASK_TYPES.IMPLEMENT_TEST && taskId) {
          useImplementTestStore
            .getState()
            .appendImplementLogByTaskId(domainId, taskId, log);
        }
      }
    };

    socket.on(SOCKET_EVENTS.LOG_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REFACTORING_AND_TESTING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_IMPLEMENT_TEST, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_APPLY_REFACTORING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_IMPLEMENT_FIX, handleLogEvent);
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

    // Documentation analysis result received directly (no HTTP re-fetch needed)
    // isEdit: true → show diff in chat; false → update store silently (fresh analysis)
    socket.on(
      SOCKET_EVENTS.DOCUMENTATION_UPDATED,
      ({ domainId, content, isEdit, chatId }) => {
        if (!domainId) return;

        if (isEdit) {
          // AI chat edit — show diff view in the section chat
          const currentDocumentation = useDomainDocumentationStore
            .getState()
            .dataById.get(domainId);
          const oldContent = currentDocumentation?.content || "";

          const agentChatStore = useAgentChatStore.getState();
          agentChatStore.setPendingSuggestion(domainId, "documentation", {
            oldContent,
            newContent: content || "",
            chatId,
          });
          if (chatId) {
            agentChatStore.setChatState(chatId, {
              isWorking: false,
              isThinking: false,
              isAwaitingResponse: false,
            });
          }
        } else {
          // Fresh analysis — update store and editors directly
          useDomainDocumentationStore
            .getState()
            .updateData(domainId, { content, metadata: null });
          useDomainDocumentationStore.getState().setLoading(domainId, false);
          useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
        }
      },
    );

    // Generic AI chat message — routes to the correct section chat by chatId
    socket.on(
      SOCKET_EVENTS.CHAT_MESSAGE,
      ({ chatId, domainId, sectionType, content, thinking, timestamp }) => {
        const effectiveSectionType = sectionType || "documentation";
        const agentChatStore = useAgentChatStore.getState();

        // Only handle if chatId matches the active task for this section
        const activeChatId = agentChatStore.getCurrentChatId(
          domainId,
          effectiveSectionType,
        );
        if (activeChatId !== chatId) return;

        if (thinking) {
          agentChatStore.setChatState(chatId, {
            isThinking: true,
            isWorking: true,
          });
          return;
        }

        if (content && content.trim()) {
          agentChatStore.setChatState(chatId, { isThinking: false });
          agentChatStore.addMessage(chatId, {
            role: "assistant",
            content,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
          });
          // NOTE: assistant message persistence is handled by the backend
          // handler (edit-documentation.js onMessage).  Do NOT duplicate it here.
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
