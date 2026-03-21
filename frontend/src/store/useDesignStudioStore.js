import { create } from "zustand";
import {
  brainstormDesign,
  generateDesign,
  getDesignManifest,
  getLatestDesignTask,
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
  currentTaskMode: null,
  currentTaskAgent: null,
  currentTaskModel: null,
  selectedModel: null,
  designMode: "new", // "new" or "improve"
  targetDesignId: null, // null for new, or specific version ID for improvement
  prompt: "",
  brainstormResponse: "",
  generationBrief: "",
  brainstormMessages: [], // Messages from brainstorm flow only
  generationMessages: [], // Messages from generation flow only
  taskEvents: [],
  loadingTaskMessages: false,
  taskError: null,
  sidebarVisible: true,
  sidebarTab: "chat",
  pendingQuestion: null, // { messageId, message, taskId } | null
  isWaitingForUser: false,
  brainstormComplete: false, // true once DESIGN_BRAINSTORM_COMPLETE is received

  // Computed getter: returns the right messages based on current mode
  getTaskMessages: () => {
    const state = get();
    return state.currentTaskMode === "brainstorm"
      ? state.brainstormMessages
      : state.generationMessages;
  },

  setBrainstormComplete: (designId) =>
    set({
      brainstormComplete: true,
      targetDesignId: designId ?? get().targetDesignId,
    }),
  setPrompt: (prompt) => set({ prompt }),
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
    const { pendingQuestion, currentTaskMode } = get();
    if (!pendingQuestion) {
      return { success: false, error: "No pending question" };
    }

    const userMessage = createLocalMessage("user", response);

    // Add to the appropriate message array based on mode
    if (currentTaskMode === "brainstorm") {
      set((state) => ({
        brainstormMessages: [...state.brainstormMessages, userMessage],
        pendingQuestion: null,
        isWaitingForUser: false,
      }));
    } else {
      set((state) => ({
        generationMessages: [...state.generationMessages, userMessage],
        pendingQuestion: null,
        isWaitingForUser: false,
      }));
    }

    try {
      await respondToTask(pendingQuestion.taskId, response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error?.response?.data?.error || error.message,
      };
    }
  },
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setDesignMode: (mode, targetId = null) =>
    set({ designMode: mode, targetDesignId: targetId }),
  clearBrainstorm: () =>
    set({
      brainstormMessages: [],
      generationMessages: [],
      brainstormResponse: "",
      generationBrief: "",
      pendingQuestion: null,
      isWaitingForUser: false,
      brainstormComplete: false,
      taskError: null,
      currentTaskId: null,
      currentTaskMode: null,
      currentTaskAgent: null,
      currentTaskModel: null,
      prompt: "",
    }),
  getNextVersionId: () => getNextVersionNumber(get().manifest),
  getLatestVersionId: () => getLatestVersionId(get().manifest),
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
    const nextManifest = manifest ?? { versions: [] };
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

      const isBrainstormMode = state.currentTaskMode === "brainstorm";
      const existingMessages = isBrainstormMode
        ? state.brainstormMessages
        : state.generationMessages;

      const newMessages = mergeMessages(existingMessages, [
        {
          id: `socket-${taskId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          role,
          content,
          timestamp: timestamp ?? new Date().toISOString(),
        },
      ]);

      const brainstormResponse = newMessages
        .filter((message) => message.role === "assistant")
        .map((message) => message.content)
        .join("\n\n")
        .trim();

      return {
        ...(isBrainstormMode
          ? { brainstormMessages: newMessages }
          : { generationMessages: newMessages }),
        brainstormResponse:
          isBrainstormMode && brainstormResponse
            ? brainstormResponse
            : state.brainstormResponse,
        generationBrief:
          isBrainstormMode && brainstormResponse
            ? brainstormResponse
            : state.generationBrief,
        loadingTaskMessages: false,
      };
    });
  },
  completeCurrentTask: (taskId) => {
    set((state) =>
      state.currentTaskId === taskId
        ? {
            currentTaskId: null,
            currentTaskMode: null,
            currentTaskAgent: null,
            currentTaskModel: null,
            loadingTaskMessages: false,
            taskError: null,
            pendingQuestion: null,
            isWaitingForUser: false,
          }
        : state,
    );
  },
  failCurrentTask: (taskId, taskError) => {
    set((state) =>
      state.currentTaskId === taskId
        ? {
            currentTaskId: null,
            currentTaskMode: null,
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

  loadLatestTaskAndHistory: async () => {
    try {
      const response = await getLatestDesignTask();
      const { task, chatHistory } = response?.data ?? {};

      if (!task || !chatHistory) {
        return { success: true, hasTask: false };
      }

      // Restore task state
      const taskMode =
        task.type === "design-brainstorm" ? "brainstorm" : "generate";

      // Restore messages from chat history
      const messages = (chatHistory.messages || []).map((msg) => ({
        id:
          msg.id ||
          `restored-${msg.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }));

      // Extract brainstorm response if it exists (assistant messages)
      const assistantMessages = messages.filter(
        (msg) => msg.role === "assistant",
      );
      const brainstormResponse = assistantMessages
        .map((msg) => msg.content)
        .join("\n\n")
        .trim();

      // Only set as current task if it's actually running or pending
      // If the task is completed/failed, just restore the conversation history
      const isActiveTask =
        task.status === "running" || task.status === "pending";
      // Brainstorm is "complete" (ready for generation) if a completed brainstorm task exists
      const isBrainstormDone =
        taskMode === "brainstorm" && task.status === "completed";

      set({
        currentTaskId: isActiveTask ? task.id : null,
        currentTaskMode: isActiveTask ? taskMode : null,
        currentTaskAgent: isActiveTask
          ? (task.agentConfig?.agent ?? null)
          : null,
        currentTaskModel: isActiveTask
          ? (task.agentConfig?.model ?? null)
          : null,
        // Store messages in the appropriate array based on task mode
        ...(taskMode === "brainstorm"
          ? { brainstormMessages: messages }
          : { generationMessages: messages }),
        brainstormResponse: taskMode === "brainstorm" ? brainstormResponse : "",
        generationBrief:
          taskMode === "brainstorm"
            ? brainstormResponse
            : task.params?.brief || "",
        brainstormComplete: isBrainstormDone,
        targetDesignId: isBrainstormDone
          ? (task.params?.designId ?? null)
          : get().targetDesignId,
        loadingTaskMessages: false,
      });

      return {
        success: true,
        hasTask: true,
        taskId: task.id,
        isActive: isActiveTask,
      };
    } catch (error) {
      console.error("Failed to load latest design task:", error);
      return { success: false, error: error.message };
    }
  },

  startBrainstorm: async () => {
    const prompt = get().prompt.trim();
    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    const previousMessages = get().brainstormMessages;
    const history = getHistoryMessages(previousMessages);
    const userMessage = createLocalMessage("user", prompt);
    const model = get().selectedModel;

    set({
      taskError: null,
      brainstormResponse: "",
      generationBrief: "",
      brainstormMessages: [...previousMessages, userMessage],
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
        prompt: "",
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
        brainstormMessages: previousMessages,
      });
      return { success: false, error: taskError };
    }
  },

  startGeneration: async ({ designId = null } = {}) => {
    const prompt = get().prompt.trim();
    const brief =
      get().generationBrief.trim() || get().brainstormResponse.trim();

    if (!prompt && !brief) {
      return { success: false, error: "Prompt or approved brief is required" };
    }

    // Determine which design ID to use
    const { designMode, targetDesignId, brainstormComplete } = get();
    let finalDesignId = designId; // Allow explicit override

    if (!finalDesignId) {
      if (brainstormComplete && targetDesignId) {
        // Use the same design ID that was established during brainstorm
        finalDesignId = targetDesignId;
      } else if (designMode === "improve" && targetDesignId) {
        finalDesignId = targetDesignId;
      } else if (designMode === "new") {
        finalDesignId = getNextVersionNumber(get().manifest);
      }
    }

    // When starting generation, we use generation messages only
    // Do NOT carry over brainstorm messages into the generation chat
    const previousMessages = get().generationMessages;
    const history = getHistoryMessages(previousMessages);

    // When coming from brainstorm, prompt is cleared — use brief as the effective prompt
    const effectivePrompt = prompt || brief.slice(0, 200).replace(/\n/g, " ");
    const userMessage = createLocalMessage("user", effectivePrompt);
    const model = get().selectedModel;

    set({
      taskError: null,
      // Start with fresh generation messages (don't include brainstorm)
      generationMessages: [...previousMessages, userMessage],
      taskEvents: [],
      loadingTaskMessages: true,
    });

    try {
      const response = await generateDesign({
        prompt: effectivePrompt,
        brief,
        history,
        designId: finalDesignId,
        model,
      });
      const taskId = response?.data?.task?.id ?? null;
      set({
        currentTaskId: taskId,
        currentTaskMode: "generate",
        currentTaskAgent: response?.data?.task?.agent ?? null,
        currentTaskModel: response?.data?.task?.model ?? null,
        prompt: "",
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
        generationMessages: previousMessages,
      });
      return { success: false, error: taskError };
    }
  },
}));
