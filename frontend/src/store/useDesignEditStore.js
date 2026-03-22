import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  editDesign,
  getLatestEditTask,
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

export const useDesignEditStore = create(
  persist(
    (set, get) => ({
      // State
      prompt: "",
      editMessages: [],
      editResponse: "",
      editComplete: false,
      targetDesignId: null, // Established during edit, used for generation
      loadingEdit: false,
      editError: null,
      editTaskId: null, // Active task ID (for responding to AI questions)
      pendingQuestion: null, // { messageId, message, taskId, user_options, selectionType } | null
      isWaitingForUser: false,

      // Actions
      setPrompt: (prompt) => set({ prompt }),

      setEditComplete: (designId) =>
        set({
          editComplete: true,
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
        const { pendingQuestion, editTaskId } = get();
        if (!pendingQuestion) {
          return { success: false, error: "No pending question" };
        }

        const userMessage = createLocalMessage("user", response);
        set((state) => ({
          editMessages: [...state.editMessages, userMessage],
          pendingQuestion: null,
          isWaitingForUser: false,
        }));

        try {
          await respondToTask(editTaskId, response);
          return { success: true };
        } catch (error) {
          const errorMessage =
            error?.response?.data?.error || "Failed to send response";
          return { success: false, error: errorMessage };
        }
      },

      restoreEdit: ({ messages, taskId }) => {
        const assistantMessages = messages.filter(
          (msg) => msg.role === "assistant",
        );
        const editResponse = assistantMessages
          .map((msg) => msg.content)
          .join("\n\n")
          .trim();
        set({
          editMessages: messages,
          editResponse,
          editTaskId: taskId ?? null,
        });
      },

      appendEditMessage: ({ taskId, role, content, timestamp }) => {
        if (role !== "assistant" || !content?.trim()) {
          return;
        }

        set((state) => {
          const newMessages = mergeMessages(state.editMessages, [
            {
              id: `socket-${taskId}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              role,
              content,
              timestamp: timestamp ?? new Date().toISOString(),
            },
          ]);

          const editResponse = newMessages
            .filter((message) => message.role === "assistant")
            .map((message) => message.content)
            .join("\n\n")
            .trim();

          return {
            editMessages: newMessages,
            editResponse,
            loadingEdit: false,
          };
        });
      },

      startEdit: async (promptOverride, selectedModel) => {
        const prompt = (promptOverride || get().prompt).trim();
        if (!prompt) {
          return { success: false, error: "Prompt is required" };
        }

        const previousMessages = get().editMessages;
        const history = getHistoryMessages(previousMessages);
        const userMessage = createLocalMessage("user", prompt);

        set({
          editError: null,
          editResponse: "",
          editMessages: [...previousMessages, userMessage],
          loadingEdit: true,
        });

        try {
          const response = await editDesign({
            prompt,
            history,
            model: selectedModel,
          });
          const taskId = response?.data?.task?.id ?? null;
          set({
            prompt: "",
            editTaskId: taskId,
          });
          return {
            success: true,
            taskId,
            agent: response?.data?.task?.agent ?? null,
            model: response?.data?.task?.model ?? null,
          };
        } catch (error) {
          const editError =
            error?.response?.data?.error || "Failed to start edit";
          set({
            editError,
            loadingEdit: false,
            editMessages: previousMessages,
          });
          return { success: false, error: editError };
        }
      },

      clearEdit: async () => {
        const { editTaskId } = get();
        if (editTaskId) {
          try {
            await cancelTask(editTaskId);
          } catch (e) {
            console.error("Failed to cancel edit task", e);
          }
        }
        set({
          prompt: "",
          editMessages: [],
          editResponse: "",
          editComplete: false,
          targetDesignId: null,
          loadingEdit: false,
          editError: null,
          editTaskId: null,
          pendingQuestion: null,
          isWaitingForUser: false,
        });
      },

      loadLatestEdit: async () => {
        try {
          const response = await getLatestEditTask();
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

          get().restoreEdit({
            messages,
            taskId: isActiveTask ? task.id : null,
          });

          if (task.status === "completed") {
            get().setEditComplete(task.params?.designId ?? null);
          }

          return { success: true, hasTask: true };
        } catch (error) {
          return {
            success: false,
            error:
              error?.response?.data?.error || "Failed to load edit history",
          };
        }
      },
    }),
    {
      name: "design-edit-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        editMessages: state.editMessages,
        editResponse: state.editResponse,
        editComplete: state.editComplete,
        targetDesignId: state.targetDesignId,
        editTaskId: state.editTaskId,
      }),
    },
  ),
);
