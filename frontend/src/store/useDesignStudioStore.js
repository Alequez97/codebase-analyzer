import { create } from "zustand";
import {
  brainstormDesign,
  generateDesign,
  getDesignManifest,
  getTaskChatHistory,
} from "../api";

function getFirstPreviewUrl(manifest) {
  return manifest?.prototypes?.[0]?.url ?? manifest?.components?.[0]?.url ?? null;
}

export const useDesignStudioStore = create((set, get) => ({
  manifest: { prototypes: [], components: [] },
  loadingManifest: true,
  manifestError: null,
  currentTaskId: null,
  currentTaskMode: null,
  currentTaskAgent: null,
  currentTaskModel: null,
  prompt: "",
  brainstormResponse: "",
  generationBrief: "",
  taskMessages: [],
  loadingTaskMessages: false,
  taskError: null,

  setPrompt: (prompt) => set({ prompt }),
  setGenerationBrief: (generationBrief) => set({ generationBrief }),
  clearTaskState: () =>
    set({
      currentTaskId: null,
      currentTaskMode: null,
      currentTaskAgent: null,
      currentTaskModel: null,
      taskMessages: [],
      loadingTaskMessages: false,
      taskError: null,
    }),

  fetchManifest: async ({ silent = false } = {}) => {
    const hasManifestData =
      get().manifest.prototypes.length > 0 || get().manifest.components.length > 0;
    set({
      loadingManifest: silent ? get().loadingManifest : hasManifestData ? false : true,
      manifestError: null,
    });
    try {
      const response = await getDesignManifest();
      const manifest = response?.data ?? { prototypes: [], components: [] };
      set({ manifest, loadingManifest: false });
      return {
        manifest,
        firstPreviewUrl: getFirstPreviewUrl(manifest),
      };
    } catch (error) {
      const manifestError =
        error?.response?.data?.error || "Failed to load design manifest";
      set({ manifestError, loadingManifest: false });
      return { manifest: null, firstPreviewUrl: null, error: manifestError };
    }
  },

  startBrainstorm: async () => {
    const prompt = get().prompt.trim();
    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    set({
      taskError: null,
      brainstormResponse: "",
      generationBrief: "",
      taskMessages: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await brainstormDesign({ prompt });
      const taskId = response?.data?.task?.id ?? null;
      set({
        currentTaskId: taskId,
        currentTaskMode: "brainstorm",
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
      });
      return { success: true, taskId };
    } catch (error) {
      const taskError =
        error?.response?.data?.error || "Failed to start brainstorm";
      set({ taskError, loadingTaskMessages: false });
      return { success: false, error: taskError };
    }
  },

  startGeneration: async () => {
    const prompt = get().prompt.trim();
    const brief = get().generationBrief.trim() || get().brainstormResponse.trim();

    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    set({
      taskError: null,
      taskMessages: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await generateDesign({ prompt, brief });
      const taskId = response?.data?.task?.id ?? null;
      set({
        currentTaskId: taskId,
        currentTaskMode: "generate",
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
      });
      return { success: true, taskId };
    } catch (error) {
      const taskError =
        error?.response?.data?.error || "Failed to start design generation";
      set({ taskError, loadingTaskMessages: false });
      return { success: false, error: taskError };
    }
  },

  fetchTaskMessages: async (taskId) => {
    if (!taskId) {
      return;
    }

    try {
      const response = await getTaskChatHistory(taskId);
      const messages = response?.data?.messages ?? [];
      const assistantMessages = messages.filter(
        (message) => message.role === "assistant",
      );
      const brainstormResponse = assistantMessages
        .map((message) => message.content)
        .join("\n\n")
        .trim();

      set((state) => ({
        taskMessages: messages,
        brainstormResponse:
          state.currentTaskMode === "brainstorm" && brainstormResponse
            ? brainstormResponse
            : state.brainstormResponse,
        generationBrief:
          state.currentTaskMode === "brainstorm" && brainstormResponse
            ? brainstormResponse
            : state.generationBrief,
        loadingTaskMessages: false,
      }));
    } catch (error) {
      set({
        loadingTaskMessages: false,
        taskError:
          error?.response?.data?.error || "Failed to load task conversation",
      });
    }
  },
}));
