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
import { useRefactoringAndTestingStore } from "./useRefactoringAndTestingStore";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "./useRefactoringAndTestingEditorStore";
import { useAgentChatStore } from "./useAgentChatStore";
import { useDesignStudioStore } from "./useDesignStudioStore";

/** Produces a Map<testId, "added"|"modified"|"removed"> by comparing two missingTests objects. */
function computeTestChanges(oldMissingTests, newMissingTests) {
  const changes = new Map();
  const types = ["unit", "integration", "e2e"];

  const oldById = new Map();
  types.forEach((type) =>
    (oldMissingTests?.[type] || []).forEach((t) => oldById.set(t.id, t)),
  );

  const newById = new Map();
  types.forEach((type) =>
    (newMissingTests?.[type] || []).forEach((t) => newById.set(t.id, t)),
  );

  for (const [id] of newById) {
    if (!oldById.has(id)) changes.set(id, "added");
  }

  for (const [id] of oldById) {
    if (!newById.has(id)) changes.set(id, "removed");
  }

  for (const [id, newTest] of newById) {
    if (
      oldById.has(id) &&
      JSON.stringify(oldById.get(id)) !== JSON.stringify(newTest)
    ) {
      changes.set(id, "modified");
    }
  }

  return changes;
}

const SOCKET_URL = window.location.origin;

export const useSocketStore = create((set, get) => ({
  socket: null,
  socketConnected: false,

  initSocket: () => {
    if (get().socket) {
      return;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    set({ socket });

    socket.on("connect", () => {
      set({ socketConnected: true });
      useTaskProgressStore
        .getState()
        .loadTasks()
        .then(() => {
          useCodebaseStore.getState().syncCodebaseTaskFromProgress();
        });
    });

    socket.on("disconnect", () => {
      set({ socketConnected: false });
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_STARTED, (_) => {
      useCodebaseStore.getState().setAnalyzingCodebase(true);
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_PROGRESS, (_) => {});

    socket.on(SOCKET_EVENTS.ANALYSIS_COMPLETED, async (_) => {
      useCodebaseStore.getState().setAnalyzingCodebase(false);
      await useCodebaseStore.getState().fetchAnalysis();
    });

    socket.on(SOCKET_EVENTS.ANALYSIS_ERROR, (data) => {
      useCodebaseStore.getState().setError(data.error || "Analysis failed");
      useCodebaseStore.getState().setAnalyzingCodebase(false);
    });

    socket.on(SOCKET_EVENTS.TASK_QUEUED, (data) => {
      const { taskId, type, domainId, delegatedByTaskId, agent, model } = data;
      if (taskId) {
        useTaskProgressStore.getState().setPending(taskId, {
          domainId,
          type,
          delegatedByTaskId,
          agent,
          model,
        });
      }
    });

    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, domainId, taskId } = data;

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCompleted({ id: taskId, type, domainId });
      }

      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
        await useCodebaseStore.getState().fetchAnalysis();
      } else if (type === TASK_TYPES.EDIT_CODEBASE_ANALYSIS) {
        await useCodebaseStore.getState().fetchAnalysis();
        toaster.create({
          title: "Codebase analysis updated",
          description: "The structure has been updated successfully.",
          type: "success",
        });
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        useDomainDocumentationStore.getState().setLoading(domainId, false);
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
        useRefactoringAndTestingStore
          .getState()
          .completeImplementByTaskId(domainId, data.taskId, data.params);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useRefactoringAndTestingStore
          .getState()
          .completeApplyRefactoring(domainId);
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
      } else if (
        type === TASK_TYPES.DESIGN_BRAINSTORM ||
        type === TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE ||
        type === TASK_TYPES.DESIGN_GENERATE_PAGE
      ) {
        useDesignStudioStore.getState().completeCurrentTask(taskId);
      }
    });

    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { taskId, domainId, type, stage, message } = data;

      useTaskProgressStore.getState().setProgress(taskId, {
        domainId: domainId ?? null,
        type,
        stage,
        message,
      });

      if (domainId) {
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
          useRefactoringAndTestingStore
            .getState()
            .setImplementTestProgress(taskId, { message, stage });
        } else if (type === TASK_TYPES.APPLY_REFACTORING) {
          useRefactoringAndTestingStore
            .getState()
            .setApplyRefactoringProgress(domainId, { taskId, message, stage });
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

    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, domainId, taskId, error } = data;

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setFailed({ id: taskId, type, domainId, error });
      }

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
        useRefactoringAndTestingStore
          .getState()
          .failImplementByTaskId(domainId, data.taskId);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useRefactoringAndTestingStore.getState().failApplyRefactoring(domainId);
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
      } else if (type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
        const chatStore = useAgentChatStore.getState();
        const chatId = chatStore.currentTaskId || taskId;
        if (chatId) {
          chatStore.setChatState(chatId, {
            isThinking: false,
            isWorking: false,
            isAwaitingResponse: false,
          });
          chatStore.addMessage({
            role: "assistant",
            content: `âŒ Task failed: ${error || "An unexpected error occurred."}`,
            isError: true,
          });
        }
      } else if (
        type === TASK_TYPES.DESIGN_BRAINSTORM ||
        type === TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE ||
        type === TASK_TYPES.DESIGN_GENERATE_PAGE
      ) {
        useDesignStudioStore
          .getState()
          .failCurrentTask(taskId, error || "Design task failed");
      }
    });

    socket.on(SOCKET_EVENTS.TASK_CANCELED, (data) => {
      const { type, domainId, taskId } = data;

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCanceled({ id: taskId, type, domainId });
      }

      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
      } else if (type === TASK_TYPES.DOCUMENTATION && domainId) {
        useDomainDocumentationStore.getState().setLoading(domainId, false);
      } else if (type === TASK_TYPES.DIAGRAMS && domainId) {
        useDomainDiagramsStore.getState().setLoading(domainId, false);
      } else if (type === TASK_TYPES.REQUIREMENTS && domainId) {
        useDomainRequirementsStore.getState().setLoading(domainId, false);
      } else if (type === TASK_TYPES.BUGS_SECURITY && domainId) {
        useDomainBugsSecurityStore.getState().setLoading(domainId, false);
      } else if (type === TASK_TYPES.REFACTORING_AND_TESTING && domainId) {
        useDomainTestingStore.getState().setLoading(domainId, false);
      } else if (type === TASK_TYPES.IMPLEMENT_TEST && domainId) {
        useRefactoringAndTestingStore
          .getState()
          .failImplementByTaskId(domainId, data.taskId);
      } else if (type === TASK_TYPES.APPLY_REFACTORING && domainId) {
        useRefactoringAndTestingStore.getState().failApplyRefactoring(domainId);
      } else if (type === TASK_TYPES.IMPLEMENT_FIX && domainId) {
        const findingId = data.params?.findingId;
        if (findingId) {
          useDomainBugsSecurityStore.getState().clearImplementingFix(findingId);
        }
      }
    });

    const handleLogEvent = ({ type, log, domainId, taskId }) => {
      useLogsStore.getState().appendCodebaseAnalysisLog(log);

      if (domainId && type) {
        const sectionType = taskTypeToSection(type);
        if (sectionType) {
          useLogsStore.getState().appendLogs(domainId, sectionType, log);
        }

        if (type === TASK_TYPES.IMPLEMENT_TEST && taskId) {
          useRefactoringAndTestingStore
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
    socket.on(SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REFACTORING_AND_TESTING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_CUSTOM_CODEBASE_TASK, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REVIEW_CHANGES, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_DESIGN_TASK, handleLogEvent);

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_THINKING, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.setAiThinking(true);
        chatStore.setAiWorking(true);
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_MESSAGE, ({ taskId, content, role }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({ role: role || "assistant", content });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_PROGRESS, ({ taskId, message }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({
          role: "system",
          content: `âš™ï¸ ${message}`,
          isProgress: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_FILE_UPDATED, ({ taskId, filePath }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({
          role: "system",
          content: `ðŸ“ Updated: \`${filePath}\``,
          isProgress: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_DOC_UPDATED, ({ taskId, filePath }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
        chatStore.addMessage({
          role: "system",
          content: `ðŸ“š Documentation updated: \`${filePath}\``,
          isProgress: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CUSTOM_TASK_CONFLICT_DETECTED, ({ taskId }) => {
      const chatStore = useAgentChatStore.getState();
      if (chatStore.currentTaskId === taskId || !chatStore.currentTaskId) {
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
            "âš ï¸ Task cancelled by user. Any partial changes can be reviewed with `git diff`.",
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
          content: `âŒ Task failed: ${error || "An unexpected error occurred."}`,
          isError: true,
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.DESIGN_CHAT_MESSAGE,
      ({ taskId, role, content, timestamp }) => {
        useDesignStudioStore
          .getState()
          .appendTaskMessage({ taskId, role, content, timestamp });
      },
    );

    socket.on(SOCKET_EVENTS.DESIGN_MANIFEST_UPDATED, ({ manifest }) => {
      useDesignStudioStore.getState().applyManifestUpdate(manifest);
    });

    socket.on(
      SOCKET_EVENTS.DOCUMENTATION_UPDATED,
      ({ domainId, content, isEdit, chatId }) => {
        if (!domainId) return;

        if (isEdit) {
          const currentDocumentation = useDomainDocumentationStore
            .getState()
            .dataById.get(domainId);
          const oldContent = currentDocumentation?.content || "";
          const newContent = content || "";

          const agentChatStore = useAgentChatStore.getState();
          if (newContent !== oldContent) {
            agentChatStore.setPendingSuggestion(domainId, "documentation", {
              oldContent,
              newContent,
              chatId,
            });
          }
          if (chatId) {
            agentChatStore.setChatState(chatId, {
              isWorking: false,
              isThinking: false,
              isAwaitingResponse: false,
            });
          }
        } else {
          useDomainDocumentationStore
            .getState()
            .updateData(domainId, { content, metadata: null });
          useDomainDocumentationStore.getState().setLoading(domainId, false);
          useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.REFACTORING_AND_TESTING_UPDATED,
      ({ domainId, content, isEdit, chatId }) => {
        if (!domainId || !content) return;

        if (isEdit) {
          const testingStore = useDomainTestingStore.getState();
          const currentData = testingStore.dataById.get(domainId);
          const changes = computeTestChanges(
            currentData?.missingTests,
            content?.missingTests,
          );

          testingStore.updateData(domainId, content);
          useTestingEditorStore
            .getState()
            .setEditedMissingTests(domainId, content?.missingTests);

          if (changes.size > 0) {
            testingStore.setRecentlyChangedTests(changes);
            setTimeout(() => testingStore.clearRecentlyChangedTests(), 4000);
          }

          if (chatId) {
            useAgentChatStore.getState().setChatState(chatId, {
              isWorking: false,
              isThinking: false,
              isAwaitingResponse: false,
            });
          }
        } else {
          useDomainTestingStore.getState().updateData(domainId, content);
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.CHAT_MESSAGE,
      ({ chatId, domainId, sectionType, content, thinking, timestamp }) => {
        const effectiveSectionType = sectionType || "documentation";
        const agentChatStore = useAgentChatStore.getState();

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
