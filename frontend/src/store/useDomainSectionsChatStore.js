import { create } from "zustand";
import { chatWithAI } from "../api/domain-sections-chat.js";
import { appendTaskChatMessage } from "../api/tasks";

/**
 * Domain Sections Chat Store - Manages AI chat conversations for domain sections editing
 *
 * Stores chat history for each domain section (ephemeral - lost on navigation)
 * Handles backend communication for AI responses
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

  // Loading state for AI responses
  isAiResponding: false,

  // Thinking state (AI is processing but hasn't responded yet)
  isAiThinking: false,

  // Actions

  /**
   * Set AI thinking state
   */
  setAiThinking: (thinking) => {
    set({ isAiThinking: thinking });
  },

  /**
   * Set AI responding state
   */
  setAiResponding: (responding) => {
    set({ isAiResponding: responding });
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
   * If chat history exists, it will be restored
   * If not, initialize with greeting message
   */
  openChat: (domainId, sectionType, initialGreeting) => {
    const key = `${domainId}_${sectionType}`;
    const history = get().chatHistoryByDomainSection;

    // Initialize if no history exists
    if (!history.has(key)) {
      const newHistory = new Map(history);
      newHistory.set(key, [
        {
          id: Date.now(),
          role: "assistant",
          content: initialGreeting,
          timestamp: new Date(),
        },
      ]);
      set({
        chatHistoryByDomainSection: newHistory,
        activeDomainId: domainId,
        activeSectionType: sectionType,
      });
    } else {
      // Use existing history
      set({
        activeDomainId: domainId,
        activeSectionType: sectionType,
      });
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
   * Add a message to the chat history
   */
  addMessage: (domainId, sectionType, message) => {
    const key = `${domainId}_${sectionType}`;
    const history = new Map(get().chatHistoryByDomainSection);
    const messages = history.get(key) || [];

    history.set(key, [
      ...messages,
      {
        ...message,
        id: message.id || Date.now(),
        timestamp: message.timestamp || new Date(),
      },
    ]);

    set({ chatHistoryByDomainSection: history });
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

    // Set loading state (thinking until backend processes)
    set({ isAiResponding: true, isAiThinking: true });

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
        // Persist user message against this task
        appendTaskChatMessage(chatId, {
          role: "user",
          content: userMessage,
        }).catch(() => {});
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

      // Reset state on error
      set({ isAiResponding: false, isAiThinking: false });

      throw error;
    }
  },

  /**
   * Clear chat history for a specific domain section
   */
  clearChatHistory: (domainId, sectionType) => {
    const key = `${domainId}_${sectionType}`;
    const history = new Map(get().chatHistoryByDomainSection);
    history.delete(key);
    set({ chatHistoryByDomainSection: history });
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
