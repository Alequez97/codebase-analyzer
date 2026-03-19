import { create } from "zustand";
import { brainstormDesign, generateDesign, getDesignManifest } from "../api";

function getFirstPreviewUrl(manifest) {
  return (
    manifest?.prototypes?.[0]?.url ?? manifest?.components?.[0]?.url ?? null
  );
}

function createLocalMessage(role, content) {
  return {
    id: `local-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function getHistoryMessages(messages) {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content?.trim(),
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function mergeMessages(existingMessages, incomingMessages) {
  const seen = new Set(
    existingMessages.map((message) => `${message.role}:${message.content}`),
  );
  const merged = [...existingMessages];

  for (const message of incomingMessages) {
    const key = `${message.role}:${message.content}`;
    if (seen.has(key) || !message.content?.trim()) {
      continue;
    }
    seen.add(key);
    merged.push(message);
  }

  return merged;
}

export const useDesignStudioStore = create((set, get) => ({
  manifest: { prototypes: [], components: [] },
  loadingManifest: true,
  manifestError: null,
  currentTaskId: null,
  currentTaskMode: null,
  currentTaskAgent: null,
  currentTaskModel: null,
  selectedModel: null,
  prompt: "",
  brainstormResponse: "",
  generationBrief: "",
  taskMessages: [],
  taskEvents: [],
  loadingTaskMessages: false,
  taskError: null,

  setPrompt: (prompt) => set({ prompt }),
  setGenerationBrief: (generationBrief) => set({ generationBrief }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  clearTaskState: () =>
    set({
      currentTaskId: null,
      currentTaskMode: null,
      currentTaskAgent: null,
      currentTaskModel: null,
      taskError: null,
    }),
  recordTaskEvent: ({ taskId, stage, message, status = "running" }) => {
    if (!taskId || !message?.trim()) {
      return;
    }

    set((state) => {
      const previousEvent = state.taskEvents[state.taskEvents.length - 1];
      if (
        previousEvent?.taskId === taskId &&
        previousEvent?.stage === stage &&
        previousEvent?.message === message &&
        previousEvent?.status === status
      ) {
        return state;
      }

      return {
        taskEvents: [
          ...state.taskEvents,
          {
            id: `${taskId}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            taskId,
            stage: stage ?? null,
            message,
            status,
            timestamp: new Date().toISOString(),
          },
        ].slice(-24),
      };
    });
  },
  applyManifestUpdate: (manifest) => {
    const nextManifest = manifest ?? { prototypes: [], components: [] };
    set({
      manifest: nextManifest,
      loadingManifest: false,
      manifestError: null,
    });
    return {
      manifest: nextManifest,
      firstPreviewUrl: getFirstPreviewUrl(nextManifest),
    };
  },
  appendTaskMessage: ({ taskId, role, content, timestamp }) => {
    if (role !== "assistant" || !content?.trim()) {
      return;
    }

    set((state) => {
      if (state.currentTaskId && state.currentTaskId !== taskId) {
        return state;
      }

      const taskMessages = mergeMessages(state.taskMessages, [
        {
          id: `socket-${taskId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          role,
          content,
          timestamp: timestamp ?? new Date().toISOString(),
        },
      ]);
      const brainstormResponse = taskMessages
        .filter((message) => message.role === "assistant")
        .map((message) => message.content)
        .join("\n\n")
        .trim();

      return {
        taskMessages,
        brainstormResponse:
          state.currentTaskMode === "brainstorm" && brainstormResponse
            ? brainstormResponse
            : state.brainstormResponse,
        generationBrief:
          state.currentTaskMode === "brainstorm" && brainstormResponse
            ? brainstormResponse
            : state.generationBrief,
        loadingTaskMessages: false,
      };
    });
  },
  completeCurrentTask: (taskId) => {
    set((state) =>
      state.currentTaskId === taskId
        ? { loadingTaskMessages: false, taskError: null }
        : state,
    );
  },
  failCurrentTask: (taskId, taskError) => {
    set((state) =>
      state.currentTaskId === taskId
        ? { loadingTaskMessages: false, taskError }
        : state,
    );
  },

  fetchManifest: async ({ silent = false } = {}) => {
    const hasManifestData =
      get().manifest.prototypes.length > 0 ||
      get().manifest.components.length > 0;
    set({
      loadingManifest: silent
        ? get().loadingManifest
        : hasManifestData
          ? false
          : true,
      manifestError: null,
    });
    try {
      const response = await getDesignManifest();
      return get().applyManifestUpdate(
        response?.data ?? { prototypes: [], components: [] },
      );
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

    const previousMessages = get().taskMessages;
    const history = getHistoryMessages(previousMessages);
    const userMessage = createLocalMessage("user", prompt);
    const model = get().selectedModel;

    set({
      taskError: null,
      brainstormResponse: "",
      generationBrief: "",
      taskMessages: [...previousMessages, userMessage],
      taskEvents: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await brainstormDesign({ prompt, history, model });
      const taskId = response?.data?.task?.id ?? null;
      set({
        currentTaskId: taskId,
        currentTaskMode: "brainstorm",
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
      });
      get().recordTaskEvent({
        taskId,
        stage: "queued",
        message: "Brainstorm queued. Preparing the first pass.",
        status: "pending",
      });
      return { success: true, taskId };
    } catch (error) {
      const taskError =
        error?.response?.data?.error || "Failed to start brainstorm";
      set({
        taskError,
        loadingTaskMessages: false,
        taskMessages: previousMessages,
      });
      return { success: false, error: taskError };
    }
  },

  startGeneration: async ({ designId = null } = {}) => {
    const prompt = get().prompt.trim();
    const brief =
      get().generationBrief.trim() || get().brainstormResponse.trim();

    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    const previousMessages = get().taskMessages;
    const history = getHistoryMessages(previousMessages);
    const userMessage = createLocalMessage("user", prompt);
    const model = get().selectedModel;

    set({
      taskError: null,
      taskMessages: [...previousMessages, userMessage],
      taskEvents: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await generateDesign({
        prompt,
        brief,
        history,
        designId,
        model,
      });
      const taskId = response?.data?.task?.id ?? null;
      set({
        currentTaskId: taskId,
        currentTaskMode: "generate",
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
      });
      get().recordTaskEvent({
        taskId,
        stage: "queued",
        message: "Design generation queued. Opening the workspace.",
        status: "pending",
      });
      return { success: true, taskId };
    } catch (error) {
      const taskError =
        error?.response?.data?.error || "Failed to start design generation";
      set({
        taskError,
        loadingTaskMessages: false,
        taskMessages: previousMessages,
      });
      return { success: false, error: taskError };
    }
  },
}));
