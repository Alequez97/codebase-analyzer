import { create } from "zustand";
import {
  chatWithAI,
  getDomainSectionChatHistory,
  appendDomainSectionChatMessage,
  clearDomainSectionChatHistory,
} from "../api/domain-sections-chat.js";

/**
 * Domain Sections Chat Store - Manages AI chat conversations for domain sections editing
 *
 * Chat history is persisted to the backend as:
 *   .code-analysis/tasks/chat-history/domain-{domainId}-{sectionType}.json
 * Conversations survive page reloads and are restored on openChat().
 *
 * Thinking/responding state is tracked per chatId (taskId), not globally.
 * This means multiple section chats can be independently active at the same time.
 */
export const useDomainSectionsChatStore = create((set, get) => ({
  // State: Map of domain_section → messages array
  // Key format: `${domainId}_${sectionType}` (e.g., "user-auth_documentation")
  chatHistoryByDomainSection: new Map(),

  // Pending suggestions (to show diff in main content area)
  pendingSuggestionByDomainSection: new Map(),

  // Currently active chat (domainId + sectionType)
  activeDomainId: null,
  activeSectionType: null,

  // Tracks the active taskId per domain_section key
  // Used to match incoming CHAT_MESSAGE / DOCUMENTATION_UPDATED events to the right chat
  currentChatIdByDomainSection: new Map(),

  // Per-chatId transient state: Map<chatId, { isThinking: bool, isResponding: bool }>
  // Keyed by taskId so multiple section chats are tracked independently.
  chatStateById: new Map(),

  // Actions

  /**
   * Set state for a specific chat (identified by taskId)
   * @param {string} chatId - The task ID
   * @param {{ isThinking?: boolean, isResponding?: boolean }} patch
   */
  setChatState: (chatId, patch) => {
    const map = new Map(get().chatStateById);
    const existing = map.get(chatId) || {
      isThinking: false,
      isResponding: false,
    };
    map.set(chatId, { ...existing, ...patch });
    set({ chatStateById: map });
  },

  /**
   * Remove state entry for a chat (called on task completed/failed)
   * @param {string} chatId
   */
  clearChatState: (chatId) => {
    if (!chatId) return;
    const map = new Map(get().chatStateById);
    map.delete(chatId);
    set({ chatStateById: map });
  },

  /**
   * Helper: is the AI thinking for a specific domain section?
   * Resolves the active chatId for the section then checks chatStateById.
   */
  isThinkingForSection: (domainId, sectionType) => {
    const chatId = get().getCurrentChatId(domainId, sectionType);
    if (!chatId) return false;
    return get().chatStateById.get(chatId)?.isThinking ?? false;
  },

  /**
   * Helper: is the AI responding for a specific domain section?
   */
  isRespondingForSection: (domainId, sectionType) => {
    const chatId = get().getCurrentChatId(domainId, sectionType);
    if (!chatId) return false;
    return get().chatStateById.get(chatId)?.isResponding ?? false;
  },

  /**
   * Set the current chat ID (taskId) for a domain section
   */
  setCurrentChatId: (domainId, sectionType, chatId) => {
    const key = `${domainId}_${sectionType}`;
    const map = new Map(get().currentChatIdByDomainSection);
    map.set(key, chatId);
    set({ currentChatIdByDomainSection: map });
  },

  /**
   * Get the current chat ID for a domain section
   */
  getCurrentChatId: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    return get().currentChatIdByDomainSection.get(key) || null;
  },

  /**
   * Open chat for a specific domain section
   * Loads persisted history from backend; initializes with greeting if none exists
   */
  openChat: async (domainId, sectionType, initialGreeting) => {
    set({ activeDomainId: domainId, activeSectionType: sectionType });

    const key = `${domainId}_${sectionType}`;
    const alreadyLoaded = get().chatHistoryByDomainSection.has(key);
    if (alreadyLoaded) return;

    try {
      const response = await getDomainSectionChatHistory(domainId, sectionType);
      const persisted = response?.data?.messages || [];

      const newHistory = new Map(get().chatHistoryByDomainSection);
      if (persisted.length > 0) {
        newHistory.set(
          key,
          persisted.map((m) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          })),
        );
      } else {
        newHistory.set(key, [
          {
            id: Date.now(),
            role: "assistant",
            content: initialGreeting,
            timestamp: new Date(),
          },
        ]);
      }
      set({ chatHistoryByDomainSection: newHistory });
    } catch {
      // Fallback to greeting if backend unavailable
      const newHistory = new Map(get().chatHistoryByDomainSection);
      newHistory.set(key, [
        {
          id: Date.now(),
          role: "assistant",
          content: initialGreeting,
          timestamp: new Date(),
        },
      ]);
      set({ chatHistoryByDomainSection: newHistory });
    }
  },

  /**
   * Close the currently active chat
   */
  closeChat: () => {
    set({
      activeDomainId: null,
      activeSectionType: null,
    });
  },

  /**
   * Add a message to the chat history and persist it to the backend
   */
  addMessage: (domainId, sectionType, message) => {
    const key = `${domainId}_${sectionType}`;
    const history = new Map(get().chatHistoryByDomainSection);
    const messages = history.get(key) || [];

    const newMessage = {
      ...message,
      id: message.id || Date.now(),
      timestamp: message.timestamp || new Date(),
    };

    history.set(key, [...messages, newMessage]);
    set({ chatHistoryByDomainSection: history });

    // Persist to backend (fire and forget)
    appendDomainSectionChatMessage(domainId, sectionType, {
      role: newMessage.role,
      content: newMessage.content,
    }).catch(() => {});
  },

  /**
   * Send user message and get AI response from backend
   */
  sendMessage: async (domainId, sectionType, userMessage, currentContent) => {
    // Add user message
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    get().addMessage(domainId, sectionType, userMsg);

    try {
      // Get conversation history (excluding system/initial greeting)
      const messages = get().getMessages(domainId, sectionType);
      const history = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call backend API to initiate task, store taskId as chatId
      // AI responses will come via socket events
      const result = await chatWithAI({
        domainId,
        sectionType,
        message: userMessage,
        context: currentContent,
        history,
      });

      const chatId = result?.data?.taskId;
      if (chatId) {
        get().setCurrentChatId(domainId, sectionType, chatId);
        // Mark this chat as thinking/responding now that the backend has accepted the task.
        // State will be cleared when TASK_COMPLETED / TASK_FAILED / DOCUMENTATION_UPDATED arrives.
        get().setChatState(chatId, { isThinking: true, isResponding: true });
      }

      // Socket events will handle adding AI messages and updating state
    } catch (error) {
      console.error("Error sending chat message:", error);

      // Add error message
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.response?.data?.message || error.message}`,
        timestamp: new Date(),
        isError: true,
      };
      get().addMessage(domainId, sectionType, errorMsg);

      throw error;
    }
  },

  /**
   * Clear chat history for a specific domain section (local + backend)
   */
  clearChatHistory: async (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    const history = new Map(get().chatHistoryByDomainSection);
    history.delete(key);
    set({ chatHistoryByDomainSection: history });
    clearDomainSectionChatHistory(domainId, sectionType).catch(() => {});
  },

  /**
   * Clear all chat history for a domain
   */
  clearDomainChats: (domainId) => {
    const history = new Map(get().chatHistoryByDomainSection);
    const keysToDelete = [];

    for (const key of history.keys()) {
      if (key.startsWith(`${domainId}_`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => history.delete(key));
    set({ chatHistoryByDomainSection: history });
  },

  /**
   * Get pending suggestion for a specific domain section
   */
  getPendingSuggestion: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    return get().pendingSuggestionByDomainSection.get(key) || null;
  },

  /**
   * Set pending suggestion (for AI-suggested content)
   */
  setPendingSuggestion: (domainId, sectionType, suggestion) => {
    const key = `${domainId}_${sectionType}`;
    const suggestions = new Map(get().pendingSuggestionByDomainSection);
    suggestions.set(key, suggestion);
    set({ pendingSuggestionByDomainSection: suggestions });
  },

  /**
   * Clear pending suggestion (called when applying or dismissing)
   */
  clearPendingSuggestion: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    const suggestions = new Map(get().pendingSuggestionByDomainSection);
    suggestions.delete(key);
    set({ pendingSuggestionByDomainSection: suggestions });
  },

  /**
   * Get messages for a specific domain section
   */
  getMessages: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    return get().chatHistoryByDomainSection.get(key) || [];
  },

  /**
   * Check if chat is active for a specific section
   */
  isChatActive: (domainId, sectionType) => {
    const state = get();
    return (
      state.activeDomainId === domainId &&
      state.activeSectionType === sectionType
    );
  },

  /**
   * Check if chat history exists for a section
   */
  hasChatHistory: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    return get().chatHistoryByDomainSection.has(key);
  },
}));
