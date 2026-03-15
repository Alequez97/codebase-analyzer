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
import {
  useMarketResearchStore,
  logLineToKind,
} from "./useMarketResearchStore";
import { useProfileStore } from "./useProfileStore";
import { getMarketResearchReport } from "../api/market-research";

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

  for (const [id] of newById) if (!oldById.has(id)) changes.set(id, "added");

  for (const [id] of oldById) if (!newById.has(id)) changes.set(id, "removed");

  for (const [id, newTest] of newById)
    if (
      oldById.has(id) &&
      JSON.stringify(oldById.get(id)) !== JSON.stringify(newTest)
    )
      changes.set(id, "modified");

  return changes;
}

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
      // Load recent tasks (last 24h) from backend on initial/reconnect
      useTaskProgressStore
        .getState()
        .loadTasks()
        .then(() => {
          // Sync codebase task state after tasks are loaded
          useCodebaseStore.getState().syncCodebaseTaskFromProgress();

          // Restore competitor stubs from loaded tasks after a page reload.
          // Live MARKET_RESEARCH_COMPETITOR_FOUND events won't re-fire for
          // tasks that were already queued/running before the reload.
          const mrStore = useMarketResearchStore.getState();
          const storeSessionId = mrStore.sessionId;
          if (storeSessionId) {
            const { progressByTaskId } = useTaskProgressStore.getState();
            const competitorEntries = [];
            const hasRunningInitial = [...progressByTaskId.values()].some(
              (e) =>
                e.type === TASK_TYPES.MARKET_RESEARCH_INITIAL &&
                (e.status === "running" || e.status === "pending"),
            );

            for (const [taskId, entry] of progressByTaskId) {
              if (
                entry.type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR &&
                entry.competitorId &&
                (entry.status === "running" || entry.status === "pending")
              ) {
                competitorEntries.push({ taskId, entry });
              }
            }

            if (competitorEntries.length > 0 || hasRunningInitial) {
              // Analysis is still in progress — restore UI state
              if (!mrStore.isAnalyzing) {
                useMarketResearchStore.setState({
                  isAnalyzing: true,
                  step: "analysis",
                });
              }
              for (const { taskId, entry } of competitorEntries) {
                mrStore._addCompetitorStub({
                  taskId,
                  competitorId: entry.competitorId,
                  competitorName: entry.competitorName,
                  competitorUrl: entry.competitorUrl ?? "",
                });
              }
            }
          }
        });
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

    // Task queued event — fires for every task regardless of who triggered it
    socket.on(SOCKET_EVENTS.TASK_QUEUED, (data) => {
      const {
        taskId,
        type,
        domainId,
        delegatedByTaskId,
        competitorName,
        competitorId,
        competitorUrl,
      } = data;
      if (taskId) {
        useTaskProgressStore.getState().setPending(taskId, {
          domainId,
          type,
          delegatedByTaskId,
          competitorName,
          competitorId,
          competitorUrl,
        });
      }
    });

    // Task completion events - handle all task types by checking type property
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, async (data) => {
      const { type, domainId, taskId } = data;

      // Transition task to completed status (shows in Completed section)
      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCompleted({ id: taskId, type, domainId });
      }

      // Handle different task types
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        useCodebaseStore.getState().clearPendingCodebaseTask();
        await useCodebaseStore.getState().fetchAnalysis();
      } else if (type === TASK_TYPES.EDIT_CODEBASE_ANALYSIS) {
        // Refetch codebase analysis to reflect structural changes
        await useCodebaseStore.getState().fetchAnalysis();
        toaster.create({
          title: "Codebase analysis updated",
          description: "The structure has been updated successfully.",
          type: "success",
        });
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
      } else if (type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR) {
        const mrStore = useMarketResearchStore.getState();
        const competitorId = mrStore.competitorTaskMap[taskId];
        if (competitorId) {
          mrStore._updateCompetitorStatus(competitorId, "done");
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_INITIAL) {
        const sessionId = data?.params?.sessionId;
        const idea = data?.params?.idea;
        const storeSessionId = useMarketResearchStore.getState().sessionId;

        // Record the completed analysis in the profile history
        if (sessionId && idea) {
          useProfileStore.getState().addAnalysis({
            id: sessionId,
            idea,
            completedAt: Date.now(),
            competitorCount:
              useMarketResearchStore.getState().competitors.length,
          });
        }

        if (sessionId && sessionId === storeSessionId) {
          // If MARKET_RESEARCH_REPORT_READY already applied the report, skip the fetch.
          if (useMarketResearchStore.getState().isAnalysisComplete) return;
          getMarketResearchReport(sessionId)
            .then((response) => {
              const report = response?.data?.report;
              if (report) {
                useMarketResearchStore.getState()._applyReport(report);
              } else {
                useMarketResearchStore.getState()._markAnalysisComplete();
              }
            })
            .catch(() => {
              useMarketResearchStore.getState()._markAnalysisComplete();
            });
        }
      }
    });

    // Task progress events
    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { taskId, domainId, type, stage, message } = data;

      // Always transition the task entry to 'running' — even for tasks without a domainId
      // (e.g. review-changes, custom-codebase-task) so the UI shows the correct status.
      useTaskProgressStore.getState().setProgress(taskId, {
        domainId: domainId ?? null,
        type,
        stage,
        message,
      });

      if (type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR) {
        const mrStore = useMarketResearchStore.getState();
        const competitorId = mrStore.competitorTaskMap[taskId];
        if (competitorId) {
          mrStore._updateCompetitorStatus(competitorId, "analyzing");
          if (message) {
            mrStore._addActivityEvent({
              id: `progress-${taskId}-${Date.now()}`,
              kind: "search",
              message,
              agent: "Competitor",
              agentColor: "#d97706",
              timestamp: Date.now(),
            });
          }
        }
      }

      if (domainId) {
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

    // Task failure events
    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, domainId, taskId, error } = data;

      // Mark task as failed in the progress map (keeps it visible until dismissed)
      if (taskId) {
        useTaskProgressStore
          .getState()
          .setFailed({ id: taskId, type, domainId, error });
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
      } else if (type === TASK_TYPES.MARKET_RESEARCH_INITIAL) {
        const sessionId = data?.params?.sessionId;
        const storeSessionId = useMarketResearchStore.getState().sessionId;
        if (sessionId && sessionId === storeSessionId) {
          useMarketResearchStore.getState()._markAnalysisComplete();
        }
      } else if (type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
        // Handle custom codebase task failures
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
            content: `❌ Task failed: ${error || "An unexpected error occurred."}`,
            isError: true,
          });
        }
      }
    });

    // Task cancellation events
    socket.on(SOCKET_EVENTS.TASK_CANCELED, (data) => {
      const { type, domainId, taskId } = data;

      // Mark task as canceled in the progress map
      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCanceled({ id: taskId, type, domainId });
      }

      // Handle different task types
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
    // Edit task logs
    socket.on(SOCKET_EVENTS.LOG_EDIT_DOCUMENTATION, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_DIAGRAMS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REQUIREMENTS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_BUGS_SECURITY, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_REFACTORING_AND_TESTING, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_EDIT_CODEBASE_ANALYSIS, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_CUSTOM_CODEBASE_TASK, handleLogEvent);
    socket.on(SOCKET_EVENTS.LOG_REVIEW_CHANGES, handleLogEvent);

    // Competitor found — add skeleton card immediately
    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_FOUND, (data) => {
      const { sessionId, taskId, competitorId, competitorName, competitorUrl } =
        data;
      const storeSessionId = useMarketResearchStore.getState().sessionId;
      if (sessionId && sessionId === storeSessionId) {
        useMarketResearchStore.getState()._addCompetitorStub({
          taskId,
          competitorId,
          competitorName,
          competitorUrl,
        });
      }
    });

    // Final merged report is ready — apply it immediately.
    // This fires inside onComplete (before TASK_COMPLETED) so the UI
    // reflects the complete data as soon as it's available.
    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, (data) => {
      const { sessionId } = data ?? {};
      const mrStore = useMarketResearchStore.getState();
      if (!sessionId || sessionId !== mrStore.sessionId) return;
      // Guard: don't fetch if _applyReport was already called
      if (mrStore.isAnalysisComplete) return;
      getMarketResearchReport(sessionId)
        .then((response) => {
          const report = response?.data?.report;
          if (report) {
            useMarketResearchStore.getState()._applyReport(report);
          } else {
            useMarketResearchStore.getState()._markAnalysisComplete();
          }
        })
        .catch(() => {
          useMarketResearchStore.getState()._markAnalysisComplete();
        });
    });

    // Market research log lines → activity feed in market research store
    const handleMarketResearchLog = (data, agentLabel, agentColor) => {
      const { log, kind } = data ?? {};
      if (!log || typeof log !== "string") return;
      const trimmed = log.trim();
      if (!trimmed) return;
      useMarketResearchStore.getState()._addActivityEvent({
        id: `log-${Date.now()}-${Math.random()}`,
        kind: kind ?? logLineToKind(trimmed),
        message: trimmed,
        agent: agentLabel,
        agentColor,
        timestamp: Date.now(),
      });
    };
    socket.on(SOCKET_EVENTS.LOG_MARKET_RESEARCH_INITIAL, (data) =>
      handleMarketResearchLog(data, "Initial", "#6366f1"),
    );
    socket.on(SOCKET_EVENTS.LOG_MARKET_RESEARCH_COMPETITOR, (data) =>
      handleMarketResearchLog(data, "Competitor", "#d97706"),
    );

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
          // Don't clear isThinking - let it stay visible until task completes
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
        // Don't clear isThinking - keep progress visible
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
          // AI chat edit — show diff view only when content actually changed
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
          // Fresh analysis — update store and editors directly
          useDomainDocumentationStore
            .getState()
            .updateData(domainId, { content, metadata: null });
          useDomainDocumentationStore.getState().setLoading(domainId, false);
          useDomainEditorStore.getState().initializeEditorsForDomain(domainId);
        }
      },
    );

    // Refactoring & testing section updated (analysis or AI chat edit)
    socket.on(
      SOCKET_EVENTS.REFACTORING_AND_TESTING_UPDATED,
      ({ domainId, content, isEdit, chatId }) => {
        if (!domainId || !content) return;

        if (isEdit) {
          // AI chat edit — apply immediately, highlight changed rows
          const testingStore = useDomainTestingStore.getState();
          const currentData = testingStore.dataById.get(domainId);
          const changes = computeTestChanges(
            currentData?.missingTests,
            content?.missingTests,
          );

          // Write new data directly into both stores
          testingStore.updateData(domainId, content);
          useTestingEditorStore
            .getState()
            .setEditedMissingTests(domainId, content?.missingTests);

          // Flash highlights for changed rows, auto-clear after 4 s
          if (changes.size > 0) {
            testingStore.setRecentlyChangedTests(changes);
            setTimeout(() => testingStore.clearRecentlyChangedTests(), 4000);
          }

          // Mark chat turn as complete
          if (chatId) {
            useAgentChatStore.getState().setChatState(chatId, {
              isWorking: false,
              isThinking: false,
              isAwaitingResponse: false,
            });
          }
        } else {
          // Fresh analysis result — update store directly (no highlight needed)
          useDomainTestingStore.getState().updateData(domainId, content);
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
