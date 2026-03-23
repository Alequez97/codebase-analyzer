import { create } from "zustand";
import {
  brainstormDesign,
  getLatestBrainstormTask,
  respondToTask,
  cancelTask,
} from "../api";

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

export const useDesignBrainstormStore = create(
  (set, get) => ({
      // State
      prompt: "",
      brainstormMessages: [],
      brainstormResponse: "",
      brainstormComplete: false,
      targetDesignId: null, // Established during brainstorm, used for generation
      loadingBrainstorm: false,
      brainstormError: null,
      brainstormTaskId: null, // Active task ID (for responding to AI questions)
      pendingQuestion: null, // { messageId, message, taskId, user_options, selectionType } | null
      isWaitingForUser: false,

      // Actions
      setPrompt: (prompt) => set({ prompt }),

      setBrainstormComplete: (designId) =>
        set({
          brainstormComplete: true,
          targetDesignId: designId ?? get().targetDesignId,
        }),

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
        const { pendingQuestion, brainstormTaskId } = get();
        if (!pendingQuestion) {
          return { success: false, error: "No pending question" };
        }

        const userMessage = createLocalMessage("user", response);
        set((state) => ({
          brainstormMessages: [...state.brainstormMessages, userMessage],
          pendingQuestion: null,
          isWaitingForUser: false,
        }));

        try {
          await respondToTask(brainstormTaskId, response);
          return { success: true };
        } catch (error) {
          const errorMessage =
            error?.response?.data?.error || "Failed to send response";
          return { success: false, error: errorMessage };
        }
      },

      restoreBrainstorm: ({ messages, taskId }) => {
        const assistantMessages = messages.filter(
          (msg) => msg.role === "assistant",
        );
        const brainstormResponse = assistantMessages
          .map((msg) => msg.content)
          .join("\n\n")
          .trim();
        set({
          brainstormMessages: messages,
          brainstormResponse,
          brainstormTaskId: taskId ?? null,
        });
      },

      appendBrainstormMessage: ({ taskId, role, content, timestamp }) => {
        if (role !== "assistant" || !content?.trim()) {
          return;
        }

        set((state) => {
          const newMessages = mergeMessages(state.brainstormMessages, [
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
            brainstormMessages: newMessages,
            brainstormResponse,
            loadingBrainstorm: false,
          };
        });
      },

      startBrainstorm: async (promptOverride, selectedModel) => {
        const prompt = (promptOverride || get().prompt).trim();
        if (!prompt) {
          return { success: false, error: "Prompt is required" };
        }

        // Start fresh - clear any previous conversation state
        const userMessage = createLocalMessage("user", prompt);

        set({
          brainstormError: null,
          brainstormResponse: "",
          brainstormMessages: [userMessage],
          brainstormComplete: false,
          brainstormTaskId: null,
          pendingQuestion: null,
          isWaitingForUser: false,
          loadingBrainstorm: true,
        });

        try {
          const response = await brainstormDesign({
            prompt,
            history: [], // Start fresh - no prior history for new session
            model: selectedModel,
          });
          const taskId = response?.data?.task?.id ?? null;
          set({
            prompt: "",
            brainstormTaskId: taskId,
          });
          return {
            success: true,
            taskId,
            agent: response?.data?.task?.agent ?? null,
            model: response?.data?.task?.model ?? null,
          };
        } catch (error) {
          const brainstormError =
            error?.response?.data?.error || "Failed to start brainstorm";
          set({
            brainstormError,
            loadingBrainstorm: false,
          });
          return { success: false, error: brainstormError };
        }
      },

      clearBrainstorm: async () => {
        const { brainstormTaskId } = get();
        if (brainstormTaskId) {
          try {
            await cancelTask(brainstormTaskId);
          } catch (e) {
            console.error("Failed to cancel brainstorm task", e);
          }
        }
        set({
          prompt: "",
          brainstormMessages: [],
          brainstormResponse: "",
          brainstormComplete: false,
          targetDesignId: null,
          loadingBrainstorm: false,
          brainstormError: null,
          brainstormTaskId: null,
          pendingQuestion: null,
          isWaitingForUser: false,
        });
      },

      loadLatestBrainstorm: async () => {
        try {
          const response = await getLatestBrainstormTask();
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

          get().restoreBrainstorm({
            messages,
            taskId: isActiveTask ? task.id : null,
          });

          if (task.status === "completed") {
            get().setBrainstormComplete(task.params?.designId ?? null);
          }

          return { success: true, hasTask: true };
        } catch (error) {
          return {
            success: false,
            error:
              error?.response?.data?.error ||
              "Failed to load brainstorm history",
          };
        }
      },
    }),
);
