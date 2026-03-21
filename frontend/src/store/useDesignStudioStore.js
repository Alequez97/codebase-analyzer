import { create } from "zustand";
import {
  generateDesign,
  getDesignManifest,
  getLatestGenerationTask,
  respondToTask,
} from "../api";

function getFirstPreviewUrl(manifest) {
  return manifest?.versions?.[0]?.url ?? null;
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

function getNextVersionNumber(manifest) {
  if (!manifest?.versions?.length) {
    return "v1";
  }

  // Find the highest version number
  const versionNumbers = manifest.versions
    .map((v) => {
      const match = v.designId.match(/^v(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  if (versionNumbers.length === 0) {
    return "v1";
  }

  const maxVersion = Math.max(...versionNumbers);
  return `v${maxVersion + 1}`;
}

function getLatestVersionId(manifest) {
  if (!manifest?.versions?.length) {
    return null;
  }

  // Get all v1, v2, v3 etc versions
  const versionEntries = manifest.versions
    .map((v) => {
      const match = v.designId.match(/^v(\d+)$/);
      return match
        ? { designId: v.designId, number: parseInt(match[1], 10) }
        : null;
    })
    .filter((entry) => entry !== null);

  if (versionEntries.length === 0) {
    return manifest.versions[0].designId;
  }

  // Sort by version number descending and return the highest
  versionEntries.sort((a, b) => b.number - a.number);
  return versionEntries[0].designId;
}

export const useDesignStudioStore = create((set, get) => ({
  manifest: { versions: [] },
  loadingManifest: true,
  manifestError: null,
  currentTaskId: null,
  currentTaskAgent: null,
  currentTaskModel: null,
  selectedModel: null,
  designMode: "new", // "new" or "improve"
  prompt: "",
  generationBrief: "",
  generationMessages: [], // Messages from generation flow only
  taskEvents: [],
  loadingTaskMessages: false,
  taskError: null,
  sidebarVisible: true,
  sidebarTab: "chat",
  pendingQuestion: null, // { messageId, message, taskId, user_options, selectionType } | null
  isWaitingForUser: false,

  setGenerationBrief: (generationBrief) => set({ generationBrief }),

  setPendingQuestion: ({
    messageId,
    message,
    taskId,
    user_options,
    selectionType,
  }) =>
    set({
      pendingQuestion: {
        messageId,
        message,
        taskId,
        user_options: user_options ?? null,
        selectionType: selectionType ?? "single",
      },
      isWaitingForUser: true,
    }),

  clearPendingQuestion: () =>
    set({ pendingQuestion: null, isWaitingForUser: false }),

  sendUserResponse: async (response) => {
    const { pendingQuestion, currentTaskId } = get();
    if (!pendingQuestion) {
      return { success: false, error: "No pending question" };
    }

    const userMessage = createLocalMessage("user", response);
    set((state) => ({
      generationMessages: [...state.generationMessages, userMessage],
      pendingQuestion: null,
      isWaitingForUser: false,
    }));

    try {
      await respondToTask(currentTaskId, response);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error || "Failed to send response";
      return { success: false, error: errorMessage };
    }
  },

  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setDesignMode: (mode) => set({ designMode: mode }),

  clearAll: () =>
    set({
      generationMessages: [],
      generationBrief: "",
      pendingQuestion: null,
      isWaitingForUser: false,
      taskError: null,
      currentTaskId: null,
      currentTaskAgent: null,
      currentTaskModel: null,
      prompt: "",
      taskEvents: [],
    }),

  getNextVersionId: () => {
    return getNextVersionNumber(get().manifest);
  },

  getLatestVersionId: () => {
    return getLatestVersionId(get().manifest);
  },

  recordTaskEvent: ({ taskId, stage, message, status }) => {
    set((state) => {
      if (state.currentTaskId && state.currentTaskId !== taskId) {
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
    const nextManifest = manifest ?? { versions: [] };
    set({
      manifest: nextManifest,
      loadingManifest: false,
      manifestError: null,
    });
  },

  appendTaskMessage: ({ taskId, role, content, timestamp }) => {
    const state = get();
    if (state.currentTaskId && state.currentTaskId !== taskId) {
      return;
    }

    set((state) => {
      const newMessages = mergeMessages(state.generationMessages, [
        {
          id: `socket-${taskId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          role,
          content,
          timestamp: timestamp ?? new Date().toISOString(),
        },
      ]);

      return {
        generationMessages: newMessages,
        loadingTaskMessages: false,
      };
    });
  },

  completeCurrentTask: (taskId) => {
    set((state) =>
      state.currentTaskId === taskId
        ? {
            currentTaskId: null,
            currentTaskAgent: null,
            currentTaskModel: null,
            loadingTaskMessages: false,
          }
        : state,
    );
  },

  failCurrentTask: (taskId, taskError) => {
    set((state) =>
      state.currentTaskId === taskId
        ? {
            currentTaskId: null,
            currentTaskAgent: null,
            currentTaskModel: null,
            loadingTaskMessages: false,
            taskError,
            pendingQuestion: null,
            isWaitingForUser: false,
          }
        : state,
    );
  },

  fetchManifest: async ({ silent = false } = {}) => {
    const hasManifestData = get().manifest.versions.length > 0;
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
      return get().applyManifestUpdate(response?.data ?? { versions: [] });
    } catch (error) {
      const manifestError =
        error?.response?.data?.error || "Failed to load design manifest";
      set({ manifestError, loadingManifest: false });
      return { manifest: null, firstPreviewUrl: null, error: manifestError };
    }
  },

  loadLatestGeneration: async () => {
    try {
      const response = await getLatestGenerationTask();
      const { task, chatHistory } = response?.data ?? {};

      if (!task || !chatHistory) {
        return { success: true, hasTask: false };
      }

      const messages = (chatHistory.messages || []).map((msg) => ({
        id:
          msg.id ||
          `restored-${msg.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }));

      const isActiveTask =
        task.status === "running" || task.status === "pending";

      set({
        generationMessages: messages,
        generationBrief: task.params?.brief || "",
        currentTaskId: isActiveTask ? task.id : null,
        currentTaskAgent: isActiveTask
          ? (task.agentConfig?.agent ?? null)
          : null,
        currentTaskModel: isActiveTask
          ? (task.agentConfig?.model ?? null)
          : null,
        loadingTaskMessages: false,
      });

      return {
        success: true,
        hasTask: true,
        taskId: task.id,
        isActive: isActiveTask,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error || "Failed to load generation history";
      set({ taskError: errorMessage, loadingTaskMessages: false });
      return { success: false, error: errorMessage };
    }
  },

  startGeneration: async ({ designId = null, brief = "" } = {}) => {
    const prompt = get().prompt.trim();
    const effectiveBrief = brief || get().generationBrief.trim();

    if (!prompt && !effectiveBrief) {
      return { success: false, error: "Prompt or approved brief is required" };
    }

    // Determine which design ID to use
    const { designMode } = get();
    let finalDesignId = designId; // Allow explicit override

    if (!finalDesignId && designMode === "new") {
      finalDesignId = getNextVersionNumber(get().manifest);
    } else if (!finalDesignId && designMode === "improve") {
      finalDesignId = getLatestVersionId(get().manifest);
    }

    const previousMessages = get().generationMessages;
    const history = getHistoryMessages(previousMessages);

    const effectivePrompt =
      prompt || effectiveBrief.slice(0, 200).replace(/\n/g, " ");
    const userMessage = createLocalMessage("user", effectivePrompt);
    const model = get().selectedModel;

    set({
      taskError: null,
      generationMessages: [...previousMessages, userMessage],
      taskEvents: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await generateDesign({
        prompt: effectivePrompt,
        brief: effectiveBrief,
        history,
        designId: finalDesignId,
        model,
      });

      const taskId = response?.data?.task?.id ?? null;

      set({
        currentTaskId: taskId,
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
        prompt: "",
      });

      // TODO: This can be updated from socket store on task queue event
      get().recordTaskEvent({
        taskId,
        stage: "queued",
        message: "Design generation queued. Opening the workspace.",
        status: "pending",
      });

      return { success: true, taskId };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error || "Failed to start design generation";
      set({ taskError: errorMessage, loadingTaskMessages: false });
      return { success: false, error: errorMessage };
    }
  },

  setPrompt: (prompt) => set({ prompt }),
}));
