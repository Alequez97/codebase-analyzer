import { create } from "zustand";
import api from "../services/api";
import { getSocket, initSocket } from "../services/socket";
import { SOCKET_EVENTS, TASK_TYPES } from "../constants/socket-events";

export const useAppStore = create((set, get) => ({
  // State
  status: null,
  analysis: null,
  analyzingCodebase: false,
  tools: [],
  selectedAgent: "aider",
  toolsLoading: false,
  toolsError: null,
  loading: true,
  error: null,
  socket: null,
  socketConnected: false,
  showLogs: false,

  // Actions
  setStatus: (status) => set({ status }),

  setAnalysis: (analysis) => set({ analysis }),

  setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  toggleLogs: () => set((state) => ({ showLogs: !state.showLogs })),

  // Initialize socket connection and listeners
  initSocket: () => {
    const socket = initSocket();
    set({ socket });

    // Connection status
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      set({ socketConnected: true });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      set({ socketConnected: false });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      set({ socketConnected: false });
    });

    // Listen for task completion
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, ({ type, taskId, moduleId }) => {
      console.log(`Task completed: ${type} (${taskId})`);

      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        set({ analyzingCodebase: false });
        get().fetchCodebaseAnalysis();
      } else if (type === TASK_TYPES.ANALYZE) {
        console.log(`Analysis completed for module: ${moduleId}`);
        get().fetchCodebaseAnalysis();
      }
    });
  },

  // Async Actions
  fetchStatus: async () => {
    try {
      const response = await api.getStatus();
      set({ status: response.data, error: null, loading: false });
    } catch (err) {
      set({ error: "Failed to connect to backend server", loading: false });
    }
  },

  fetchCodebaseAnalysis: async () => {
    try {
      const response = await api.getFullCodebaseAnalysis();
      set({ analysis: response.data });
    } catch (err) {
      console.log("No codebase analysis found yet");
      set({ analysis: null });
    }
  },

  fetchTools: async () => {
    set({ toolsLoading: true, toolsError: null });

    try {
      const response = await api.getTools();
      const tools = response.data?.tools || [];
      const current = get().selectedAgent;
      const hasCurrent = tools.some((tool) => tool.id === current);
      const fallback = tools[0]?.id || "aider";

      set({
        tools,
        selectedAgent: hasCurrent ? current : fallback,
        toolsLoading: false,
        toolsError: null,
      });
    } catch (err) {
      const message =
        err?.response?.status === 404
          ? "Tools endpoint not available (Cannot GET /api/tools). Restart backend after latest changes."
          : "Failed to load tools.";

      console.error("Failed to load tools:", err);
      set({
        tools: [],
        toolsLoading: false,
        toolsError: message,
      });
    }
  },

  startCodebaseAnalysis: async () => {
    set({ analyzingCodebase: true });
    try {
      await api.requestCodebaseAnalysis(true, get().selectedAgent);
      // Socket will handle the completion event - no more polling!
    } catch (err) {
      set({
        error: "Failed to start codebase analysis",
        analyzingCodebase: false,
      });
    }
  },

  reset: () =>
    set({
      status: null,
      analysis: null,
      analyzingCodebase: false,
      tools: [],
      selectedAgent: "aider",
      toolsLoading: false,
      toolsError: null,
      loading: true,
      error: null,
      socketConnected: false,
      showLogs: false,
    }),
}));
