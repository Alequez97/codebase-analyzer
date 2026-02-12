import { create } from "zustand";
import api from "../services/api";
import { getSocket, initSocket } from "../services/socket";
import { SOCKET_EVENTS, TASK_TYPES } from "../constants/socket-events";

export const useAppStore = create((set, get) => ({
  // State
  status: null,
  modules: [],
  codebaseAnalysis: null,
  analyzingCodebase: false,
  loading: true,
  error: null,
  socket: null,
  socketConnected: false,

  // Actions
  setStatus: (status) => set({ status }),

  setModules: (modules) => set({ modules }),

  setAnalyzingCodebase: (analyzingCodebase) => set({ analyzingCodebase }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

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
        get().fetchModules();
      } else if (type === TASK_TYPES.ANALYZE) {
        console.log(`Analysis completed for module: ${moduleId}`);
        get().fetchModules();
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

  fetchModules: async () => {
    try {
      const response = await api.getModules();
      set({
        modules: response.data.modules || [],
        codebaseAnalysis: response.data,
      });
    } catch (err) {
      console.log("No modules found yet");
      set({ modules: [], codebaseAnalysis: null });
    }
  },

  startCodebaseAnalysis: async () => {
    set({ analyzingCodebase: true });
    try {
      await api.requestCodebaseAnalysis(true);
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
      modules: [],
      codebaseAnalysis: null,
      analyzingCodebase: false,
      loading: true,
      error: null,
      socketConnected: false,
    }),
}));
