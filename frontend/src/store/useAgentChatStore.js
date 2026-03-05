import { create } from "zustand";
import { startCustomCodebaseTask } from "../api/codebase-chat";
import { chatWithAI } from "../api/domain-sections-chat";
import {
  cancelTask,
  appendTaskChatMessage,
  getTaskChatHistory,
  deleteTaskChatHistory,
} from "../api/tasks";

/**
 * Agent Chat Store - Manages the floating AI chat panel
 *
 * Handles both domain section edits and custom codebase tasks.
 * Chat conversations are persisted to the backend file system.
 */
export const useAgentChatStore = create((set, get) => ({
  // Panel state
  isOpen: false,

  // Selected task type: null | "documentation" | "requirements" | "diagrams" |
  //                     "bugs-security" | "refactoring-and-testing" | "custom"
  selectedTaskType: null,

  // Domain context (auto-populated from route params)
  domainId: null,

  // Messages in the current conversation
  messages: [],

  // AI working / thinking states
  isAiWorking: false,
  isAiThinking: false,
  isAwaitingResponse: false,

  // Active task tracking
  currentTaskId: null,

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Open the chat panel for a given domain
   * @param {string} domainId - Domain ID from route params
   */
  openChat: (domainId) => {
    set({
      isOpen: true,
      domainId,
      selectedTaskType: null,
      messages: [],
      isAiWorking: false,
      isAiThinking: false,
      isAwaitingResponse: false,
      currentTaskId: null,
    });
  },

  /**
   * Close the chat panel
   */
  closeChat: () => {
    set({ isOpen: false });
  },

  /**
   * Select a task type from the task selector
   * @param {string} taskType - "documentation" | "requirements" | ... | "custom"
   */
  selectTaskType: (taskType) => {
    const greeting = getGreetingForTaskType(taskType);
    set({
      selectedTaskType: taskType,
      messages: [
        {
          id: 1,
          role: "assistant",
          content: greeting,
          timestamp: new Date().toISOString(),
        },
      ],
      currentTaskId: null,
      isAiWorking: false,
      isAiThinking: false,
      isAwaitingResponse: false,
    });
  },

  /**
   * Go back to task selector
   */
  backToSelector: () => {
    set({
      selectedTaskType: null,
      messages: [],
      currentTaskId: null,
      isAiWorking: false,
      isAiThinking: false,
      isAwaitingResponse: false,
    });
  },

  /**
   * Send a message from the user
   * Routes to the correct API based on selectedTaskType
   * @param {string} userMessage - The user's message text
   * @param {Object} [sectionContext] - Current section content (for domain section edits)
   */
  sendMessage: async (userMessage, sectionContext = null) => {
    const { selectedTaskType, domainId, messages, currentTaskId } = get();

    if (!userMessage.trim() || get().isAiWorking) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: userMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isAiWorking: true,
      isAiThinking: true,
    }));

    // Persist user message if we have a task ID
    if (currentTaskId) {
      appendTaskChatMessage(currentTaskId, {
        role: "user",
        content: userMessage.trim(),
      }).catch(() => {});
    }

    try {
      if (selectedTaskType === "custom") {
        // Custom codebase task
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const result = await startCustomCodebaseTask({
          userInstruction: userMessage.trim(),
          domainId,
          history,
        });
        set({ currentTaskId: result.taskId });
      } else {
        // Domain section edit (existing flow)
        const history = messages
          .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0)
          .map((m) => ({ role: m.role, content: m.content }));

        const result = await chatWithAI({
          domainId,
          sectionType: selectedTaskType,
          message: userMessage.trim(),
          context: sectionContext,
          history,
        });
        set({ currentTaskId: result.taskId });
      }
    } catch (error) {
      set({ isAiWorking: false, isAiThinking: false });
      get().addMessage({
        role: "assistant",
        content: `❌ Failed to send request: ${error?.response?.data?.message || error.message}`,
        isError: true,
      });
    }
  },

  /**
   * Cancel the currently running task
   */
  cancelCurrentTask: async () => {
    const { currentTaskId } = get();
    if (!currentTaskId) return;

    try {
      await cancelTask(currentTaskId);
    } catch {
      // Best effort - socket event will update UI anyway
    }
  },

  /**
   * Add a message to the chat (called by socket event handlers)
   * @param {Object} message - { role, content, ...extra }
   */
  addMessage: (message) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...message,
        },
      ],
    }));
  },

  setAiThinking: (thinking) => set({ isAiThinking: thinking }),
  setAiWorking: (working) => set({ isAiWorking: working }),
  setAwaitingResponse: (awaiting) => set({ isAwaitingResponse: awaiting }),
  setCurrentTaskId: (taskId) => set({ currentTaskId: taskId }),

  /**
   * Load historical chat conversation from backend
   * @param {string} taskId
   */
  loadChatHistory: async (taskId) => {
    try {
      const history = await getTaskChatHistory(taskId);
      if (history?.messages?.length) {
        set({ messages: history.messages, currentTaskId: taskId });
      }
    } catch {
      // History not found is acceptable
    }
  },

  /**
   * Clear the current chat conversation
   */
  clearChat: async () => {
    const { currentTaskId } = get();
    if (currentTaskId) {
      deleteTaskChatHistory(currentTaskId).catch(() => {});
    }
    set({
      messages: [],
      currentTaskId: null,
      isAiWorking: false,
      isAiThinking: false,
      isAwaitingResponse: false,
    });
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function getGreetingForTaskType(taskType) {
  const greetings = {
    documentation:
      "Hello! I can help you improve the documentation for this domain. What would you like to change?",
    requirements:
      "Hi! I can help you refine the requirements for this domain. What would you like to adjust?",
    diagrams:
      "Hi! I can help you update the diagrams for this domain. What changes would you like?",
    "bugs-security":
      "Hello! I can help you analyze bugs and security issues for this domain. What would you like to improve?",
    "refactoring-and-testing":
      "Hi! I can help you with refactoring and testing for this domain. What would you like to work on?",
    custom:
      "Hello! I'm your AI assistant. I can make changes across your entire codebase—code, tests, documentation, and requirements—while keeping everything consistent. What would you like me to do?",
  };
  return greetings[taskType] || "Hello! How can I help you?";
}
