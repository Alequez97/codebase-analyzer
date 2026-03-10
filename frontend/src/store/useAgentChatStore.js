import { create } from "zustand";
import { SECTION_TYPES } from "../constants/section-types";
import { TASK_TYPES } from "../constants/task-types";
import { startCustomCodebaseTask } from "../api/codebase-chat";
import {
  chatWithAI,
  getDomainSectionChatHistory,
  clearDomainSectionChatHistory,
  listDomainSectionChatSessions,
} from "../api/domain-sections-chat";
import {
  cancelTask,
  appendTaskChatMessage,
  getTaskChatHistory,
  deleteTaskChatHistory,
} from "../api/tasks";

/**
 * Agent Chat Store - Manages the floating AI chat panel
 *
 * Single store for all chat state. Replaces useDomainSectionsChatStore.
 *
 * - Messages are stored per chatId (taskId)
 * - Per-chatId transient state: isThinking, isWorking, isAwaitingResponse
 * - Pending suggestions (diff view) keyed by domainId_sectionType
 * - Active chatId per domain_section for socket event routing
 */
export const useAgentChatStore = create((set, get) => ({
  // ── Panel state ──────────────────────────────────────────────────────────

  isOpen: false,

  // Selected task type: null | "documentation" | "requirements" | "diagrams" |
  //                     "bugs-security" | "refactoring-and-testing" | TASK_TYPES.CUSTOM_CODEBASE_TASK
  selectedTaskType: null,

  // Agent parameter overrides. All fields null = use server defaults.
  // model: null means use the default model from server config for this task type.
  agentsOverrides: {
    model: null,
    maxTokens: null,
    reasoningEffort: null,
    temperature: null,
  },

  // Domain context (auto-populated from route params)
  domainId: null,

  // Pre-filled input message — consumed once by ChatPanel after the task type is selected.
  // Set via openChatForTest to seed the input with e.g. "Update TEST-001".
  pendingInputPrefill: null,

  // Currently active taskId for the running AI turn (ephemeral — changes each message).
  // Used only for task cancellation. Do NOT use for message keying or socket routing.
  // The stable session identifier is stored in currentChatIdByKey.
  currentTaskId: null,

  // ── Per-chatId storage ───────────────────────────────────────────────────

  // Messages keyed by chatId (taskId or local placeholder)
  messagesByChatId: new Map(),

  // Per-chatId transient state: Map<chatId, { isThinking, isWorking, isAwaitingResponse }>
  chatStateById: new Map(),

  // ── Routing ──────────────────────────────────────────────────────────────

  // Active stable chatId per "domainId_sectionType".
  // This is a session UUID generated when the session starts — it never changes
  // for the lifetime of a conversation, even as taskIds rotate per message.
  // Used for: message keying, socket event routing, history file naming.
  currentChatIdByKey: new Map(),

  // ── Pending suggestions (diff view) ─────────────────────────────────────

  // Map<"domainId_sectionType", { oldContent, newContent, chatId }>
  pendingSuggestionByKey: new Map(),

  // ── Sessions list ─────────────────────────────────────────────────────────

  // Map<"domainId_sectionType", Array<{ chatId, createdAt, lastMessageAt, messageCount, preview }>>
  sessionsByKey: new Map(),
  isLoadingSessions: false,
  showSessionsList: false,

  // ── Helpers ──────────────────────────────────────────────────────────────

  _sectionKey: (domainId, sectionType) => `${domainId}_${sectionType}`,

  // ── Panel actions ─────────────────────────────────────────────────────────

  openChat: (domainId) => {
    set({
      isOpen: true,
      domainId,
      selectedTaskType: null,
      currentTaskId: null,
    });
  },

  /**
   * Open the chat panel pre-focused on the Testing section and pre-fill the
   * input with "Update <testId>".
   *
   * Called when the user clicks a test ID badge in the test table.
   */
  openChatForTest: async (domainId, testId) => {
    set({
      isOpen: true,
      domainId,
      selectedTaskType: null,
      currentTaskId: null,
      pendingInputPrefill: `Update ${testId}`,
    });
    await get().selectTaskType(SECTION_TYPES.REFACTORING_AND_TESTING);
  },

  clearPendingInputPrefill: () => set({ pendingInputPrefill: null }),

  setAgentsOverrides: (overrides) => set({ agentsOverrides: overrides }),

  closeChat: () => set({ isOpen: false }),

  /**
   * Select a task type. For section types, loads persisted history from backend.
   */
  selectTaskType: async (taskType) => {
    const { domainId } = get();
    const sessionKey =
      taskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK
        ? get()._sectionKey(domainId, taskType)
        : null;
    const existingChatId = sessionKey
      ? get().currentChatIdByKey.get(sessionKey) || null
      : null;
    const alreadyHasMessages =
      existingChatId && get().messagesByChatId.has(existingChatId);

    set({ selectedTaskType: taskType, currentTaskId: null });

    if (alreadyHasMessages) return;

    if (taskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK && domainId) {
      try {
        const response = await getDomainSectionChatHistory(
          domainId,
          taskType,
          existingChatId || null,
        );
        const data = response?.data || {};
        const persisted = data.messages || [];
        if (persisted.length > 0) {
          // Prefer the real chatId stored in the file over any existing key
          const chatId =
            data.currentChatId || existingChatId || crypto.randomUUID();
          const messages = persisted.map((m, i) => ({
            id: m.id || i,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          get()._setMessages(chatId, messages);
          if (sessionKey) get()._setChatIdForKey(sessionKey, chatId);
          // currentTaskId stays null — no task is running
          return;
        }
      } catch {
        // Fallback to greeting
      }
    }

    // No persisted history — start a fresh session with a stable UUID
    const chatId = existingChatId || crypto.randomUUID();
    get()._setMessages(chatId, [
      {
        id: 1,
        role: "assistant",
        content: getGreetingForTaskType(taskType),
        timestamp: new Date(),
      },
    ]);
    if (sessionKey) get()._setChatIdForKey(sessionKey, chatId);
    // For custom tasks, store the chatId as currentTaskId so the greeting
    // message is retrievable via activeChatId in ChatPanel
    if (taskType === TASK_TYPES.CUSTOM_CODEBASE_TASK)
      set({ currentTaskId: chatId });
  },

  backToSelector: () =>
    set({
      selectedTaskType: null,
      currentTaskId: null,
      showSessionsList: false,
    }),

  // ── Sessions list ─────────────────────────────────────────────────────────

  openSessionsList: async () => {
    const { selectedTaskType, domainId } = get();
    if (
      !selectedTaskType ||
      selectedTaskType === TASK_TYPES.CUSTOM_CODEBASE_TASK ||
      !domainId
    )
      return;
    set({ showSessionsList: true, isLoadingSessions: true });
    try {
      const response = await listDomainSectionChatSessions(
        domainId,
        selectedTaskType,
      );
      const sessions = response?.data?.sessions || [];
      const key = get()._sectionKey(domainId, selectedTaskType);
      const map = new Map(get().sessionsByKey);
      map.set(key, sessions);
      set({ sessionsByKey: map, isLoadingSessions: false });
    } catch {
      set({ isLoadingSessions: false });
    }
  },

  closeSessionsList: () => set({ showSessionsList: false }),

  /**
   * Navigate directly to the history list for a given section type
   * (called from the TaskSelector view without first selecting a task)
   */
  openSectionHistory: async (taskType) => {
    const { domainId } = get();
    if (!taskType || taskType === TASK_TYPES.CUSTOM_CODEBASE_TASK || !domainId)
      return;
    set({
      selectedTaskType: taskType,
      showSessionsList: true,
      isLoadingSessions: true,
      currentTaskId: null,
    });
    try {
      const response = await listDomainSectionChatSessions(domainId, taskType);
      const sessions = response?.data?.sessions || [];
      const key = get()._sectionKey(domainId, taskType);
      const map = new Map(get().sessionsByKey);
      map.set(key, sessions);
      set({ sessionsByKey: map, isLoadingSessions: false });
    } catch {
      set({ isLoadingSessions: false });
    }
  },

  loadHistoricalSession: async (chatId) => {
    const { selectedTaskType, domainId } = get();
    if (!selectedTaskType || !domainId || !chatId) return;
    set({ showSessionsList: false });

    // If already loaded, just switch to it
    const alreadyLoaded = get().messagesByChatId.has(chatId);
    if (!alreadyLoaded) {
      try {
        const response = await getDomainSectionChatHistory(
          domainId,
          selectedTaskType,
          chatId,
        );
        const data = response?.data || {};
        const persisted = data.messages || [];
        if (persisted.length > 0) {
          const messages = persisted.map((m, i) => ({
            id: m.id || i,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          get()._setMessages(chatId, messages);
        }
      } catch {
        // fallback — just switch
      }
    }

    const sessionKey = get()._sectionKey(domainId, selectedTaskType);
    get()._setChatIdForKey(sessionKey, chatId);
    set({ currentTaskId: null });
  },

  // ── Messaging ─────────────────────────────────────────────────────────────

  sendMessage: async (userMessage, sectionContext = null) => {
    const { selectedTaskType, domainId } = get();

    if (!userMessage.trim()) return;

    // For section chats, use the stable chatId from the session map.
    // For custom tasks, fall back to currentTaskId (different system).
    const sectionKey =
      selectedTaskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK
        ? get()._sectionKey(domainId, selectedTaskType)
        : null;
    const chatId = sectionKey
      ? get().currentChatIdByKey.get(sectionKey) || null
      : get().currentTaskId;

    if (get().chatStateById.get(chatId)?.isWorking) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: userMessage.trim(),
      timestamp: new Date(),
    };

    get()._appendMessage(chatId, userMsg);
    get().setChatState(chatId, { isWorking: true, isThinking: true });

    try {
      if (selectedTaskType === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
        const messages = get()._getMessages(chatId);
        const history = messages
          .filter((m) => m.id !== userMsg.id)
          .map((m) => ({ role: m.role, content: m.content }));

        const result = await startCustomCodebaseTask({
          userInstruction: userMessage.trim(),
          domainId,
          history,
          agentsOverrides: get().agentsOverrides,
        });
        const taskId = result.data?.taskId;
        if (taskId) {
          get()._migrateChatId(chatId, taskId);
          set({ currentTaskId: taskId });
          get().setChatState(taskId, { isWorking: true, isThinking: true });
          appendTaskChatMessage(taskId, {
            role: "user",
            content: userMessage.trim(),
          }).catch(() => {});
        }
      } else {
        const result = await chatWithAI({
          domainId,
          sectionType: selectedTaskType,
          message: userMessage.trim(),
          chatId, // stable session UUID
          context: sectionContext,
          agentsOverrides: get().agentsOverrides,
        });

        const taskId = result.data?.taskId;
        if (taskId) {
          // taskId is ephemeral (one per AI turn) — store it only for cancellation.
          // The chatId (stable) is already registered in currentChatIdByKey.
          set({ currentTaskId: taskId });
          get().setChatState(chatId, { isWorking: true, isThinking: true });
          // User message persistence: handled by the backend route before task starts.
        }
      }
    } catch (error) {
      get().setChatState(chatId, { isWorking: false, isThinking: false });
      get()._appendMessage(chatId, {
        id: Date.now(),
        role: "assistant",
        content: `❌ Failed to send request: ${error?.response?.data?.message || error.message}`,
        isError: true,
        timestamp: new Date(),
      });
    }
  },

  cancelCurrentTask: async () => {
    const { currentTaskId } = get();
    if (!currentTaskId) return;
    try {
      await cancelTask(currentTaskId);
    } catch {
      // Best-effort — socket event will update UI
    }
  },

  /**
   * Retry the last user message. Called when a task fails and the user wants to retry.
   * Removes the error message and resends the last user message.
   */
  retryLastMessage: async () => {
    const { selectedTaskType, domainId } = get();
    const sectionKey =
      selectedTaskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK
        ? get()._sectionKey(domainId, selectedTaskType)
        : null;
    const chatId = sectionKey
      ? get().currentChatIdByKey.get(sectionKey) || null
      : get().currentTaskId;

    if (!chatId) return;

    const messages = get()._getMessages(chatId);
    if (messages.length < 2) return; // Need at least a user message and error

    // Find the last user message
    let lastUserMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessage = messages[i].content;
        break;
      }
    }

    if (!lastUserMessage) return;

    // Remove error message(s) from the end
    const newMessages = messages.filter(
      (msg, idx) =>
        !(
          idx >= messages.length - 5 &&
          msg.role === "assistant" &&
          msg.isError
        ),
    );
    get()._setMessages(chatId, newMessages);

    // Re-send the last user message
    await get().sendMessage(lastUserMessage);
  },

  // ── Per-chat state ────────────────────────────────────────────────────────

  setChatState: (chatId, patch) => {
    if (!chatId) return;
    const map = new Map(get().chatStateById);
    const existing = map.get(chatId) || {
      isThinking: false,
      isWorking: false,
      isAwaitingResponse: false,
    };
    map.set(chatId, { ...existing, ...patch });
    set({ chatStateById: map });
  },

  clearChatState: (chatId) => {
    if (!chatId) return;
    const map = new Map(get().chatStateById);
    map.delete(chatId);
    set({ chatStateById: map });
  },

  isThinking: (chatId) => {
    const id = chatId ?? get().currentTaskId;
    return get().chatStateById.get(id)?.isThinking ?? false;
  },

  isWorking: (chatId) => {
    const id = chatId ?? get().currentTaskId;
    return get().chatStateById.get(id)?.isWorking ?? false;
  },

  isAwaitingResponse: (chatId) => {
    const id = chatId ?? get().currentTaskId;
    return get().chatStateById.get(id)?.isAwaitingResponse ?? false;
  },

  // ── Routing helpers ───────────────────────────────────────────────────────

  setCurrentChatId: (domainId, sectionType, chatId) => {
    get()._setChatIdForKey(get()._sectionKey(domainId, sectionType), chatId);
  },

  getCurrentChatId: (domainId, sectionType) => {
    return (
      get().currentChatIdByKey.get(get()._sectionKey(domainId, sectionType)) ||
      null
    );
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  addMessage: (chatId, message) => {
    get()._appendMessage(chatId, {
      id: Date.now(),
      timestamp: new Date(),
      ...message,
    });
  },

  getMessages: (chatId) => {
    const id = chatId ?? get().currentTaskId;
    return get()._getMessages(id);
  },

  // ── Pending suggestions ───────────────────────────────────────────────────

  getPendingSuggestion: (domainId, sectionType) => {
    return (
      get().pendingSuggestionByKey.get(
        get()._sectionKey(domainId, sectionType),
      ) || null
    );
  },

  setPendingSuggestion: (domainId, sectionType, suggestion) => {
    const map = new Map(get().pendingSuggestionByKey);
    map.set(get()._sectionKey(domainId, sectionType), suggestion);
    set({ pendingSuggestionByKey: map });
  },

  clearPendingSuggestion: (domainId, sectionType) => {
    const map = new Map(get().pendingSuggestionByKey);
    map.delete(get()._sectionKey(domainId, sectionType));
    set({ pendingSuggestionByKey: map });
  },

  // ── History management ────────────────────────────────────────────────────

  loadChatHistory: async (taskId) => {
    try {
      const history = await getTaskChatHistory(taskId);
      if (history?.messages?.length) {
        get()._setMessages(taskId, history.messages);
        set({ currentTaskId: taskId });
      }
    } catch {
      // History not found is acceptable
    }
  },

  clearChat: async () => {
    const { currentTaskId, selectedTaskType, domainId } = get();
    const sectionKey =
      selectedTaskType &&
      selectedTaskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK &&
      domainId
        ? get()._sectionKey(domainId, selectedTaskType)
        : null;
    const chatId = sectionKey
      ? get().currentChatIdByKey.get(sectionKey) || null
      : currentTaskId;

    if (currentTaskId) {
      deleteTaskChatHistory(currentTaskId).catch(() => {});
    }
    if (sectionKey && chatId) {
      // Delete the specific session file only
      clearDomainSectionChatHistory(domainId, selectedTaskType, chatId).catch(
        () => {},
      );
    }

    const greeting = selectedTaskType
      ? getGreetingForTaskType(selectedTaskType)
      : null;

    // Generate a fresh stable chatId for the new session
    // Custom tasks always get a new UUID; section chats need a domainId
    const newChatId =
      selectedTaskType === TASK_TYPES.CUSTOM_CODEBASE_TASK ||
      (selectedTaskType && domainId)
        ? crypto.randomUUID()
        : null;

    if (newChatId && greeting) {
      get()._setMessages(newChatId, [
        { id: 1, role: "assistant", content: greeting, timestamp: new Date() },
      ]);
      if (sectionKey) {
        get()._setChatIdForKey(sectionKey, newChatId);
      }
    }

    get().clearChatState(chatId);
    set({
      currentTaskId:
        selectedTaskType === TASK_TYPES.CUSTOM_CODEBASE_TASK ? newChatId : null,
      showSessionsList: false,
    });
  },

  // ── Legacy shims (keep socket store working without changes) ──────────────

  setAiThinking: (thinking) => {
    const { currentTaskId } = get();
    if (currentTaskId)
      get().setChatState(currentTaskId, { isThinking: thinking });
  },
  setAiWorking: (working) => {
    const { currentTaskId } = get();
    if (currentTaskId)
      get().setChatState(currentTaskId, { isWorking: working });
  },
  setAwaitingResponse: (awaiting) => {
    const { currentTaskId } = get();
    if (currentTaskId)
      get().setChatState(currentTaskId, { isAwaitingResponse: awaiting });
  },
  setCurrentTaskId: (taskId) => set({ currentTaskId: taskId }),

  // ── Private internals ─────────────────────────────────────────────────────

  _getMessages: (chatId) => {
    if (!chatId) return [];
    return get().messagesByChatId.get(chatId) || [];
  },

  _setMessages: (chatId, messages) => {
    if (!chatId) return;
    const map = new Map(get().messagesByChatId);
    map.set(chatId, messages);
    set({ messagesByChatId: map });
  },

  _appendMessage: (chatId, message) => {
    if (!chatId) return;
    const map = new Map(get().messagesByChatId);
    map.set(chatId, [...(map.get(chatId) || []), message]);
    set({ messagesByChatId: map });
  },

  _setChatIdForKey: (key, chatId) => {
    const map = new Map(get().currentChatIdByKey);
    map.set(key, chatId);
    set({ currentChatIdByKey: map });
  },

  /**
   * Migrate messages and state from a local placeholder key to a real backend taskId.
   */
  _migrateChatId: (oldId, newId) => {
    if (!oldId || !newId || oldId === newId) return;
    const msgMap = new Map(get().messagesByChatId);
    const stateMap = new Map(get().chatStateById);
    const keyMap = new Map(get().currentChatIdByKey);

    msgMap.set(newId, msgMap.get(oldId) || []);
    msgMap.delete(oldId);
    const state = stateMap.get(oldId);
    if (state) {
      stateMap.set(newId, state);
      stateMap.delete(oldId);
    }
    for (const [k, v] of keyMap.entries()) {
      if (v === oldId) keyMap.set(k, newId);
    }

    set({
      messagesByChatId: msgMap,
      chatStateById: stateMap,
      currentChatIdByKey: keyMap,
    });
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function getGreetingForTaskType(taskType) {
  const greetings = {
    [SECTION_TYPES.DOCUMENTATION]:
      "Hello! I can help you improve the documentation for this domain. What would you like to change?",
    [SECTION_TYPES.REQUIREMENTS]:
      "Hi! I can help you refine the requirements for this domain. What would you like to adjust?",
    [SECTION_TYPES.DIAGRAMS]:
      "Hi! I can help you update the diagrams for this domain. What changes would you like?",
    [SECTION_TYPES.BUGS_SECURITY]:
      "Hello! I can help you analyze bugs and security issues for this domain. What would you like to improve?",
    [SECTION_TYPES.REFACTORING_AND_TESTING]:
      "Hi! I can help you with refactoring and testing for this domain. What would you like to work on?",
    [TASK_TYPES.CUSTOM_CODEBASE_TASK]:
      "Hello! I'm your AI assistant. I can make changes across your entire codebase—code, tests, documentation, and requirements—while keeping everything consistent. What would you like me to do?",
  };
  return greetings[taskType] || "Hello! How can I help you?";
}
