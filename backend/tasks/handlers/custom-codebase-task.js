import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import {
  emitSocketEvent,
  emitTaskProgress,
} from "../../utils/socket-emitter.js";
import { appendChatMessage } from "../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  appendProgressNote,
  markProgressComplete,
} from "../../utils/task-progress.js";

/**
 * Handler for custom-codebase-task (floating agent chat)
 * Streams all AI messages back to the client via socket events
 */
export function customCodebaseTaskHandler(task, taskLogger, agent) {
  let messageCount = 0;
  const taskId = task.id;
  const domainId = task.params?.domainId || null;

  return {
    initialMessage: task.params.userInstruction,

    onProgress: (progress) => {
      if (
        progress.stage === PROGRESS_STAGES.PROCESSING &&
        progress.iteration === 1
      ) {
        // Ensure progress directory exists — the model creates the file itself
        ensureProgressDirectory(taskId).catch((err) =>
          taskLogger.warn(
            `Failed to prepare progress directory: ${err.message}`,
            {
              component: "CustomCodebaseTask",
            },
          ),
        );

        taskLogger.info("🤔 AI is thinking...", {
          component: "CustomCodebaseTask",
        });

        emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_THINKING, {
          taskId,
          domainId,
          thinking: true,
          timestamp: new Date().toISOString(),
        });

        emitTaskProgress(task, PROGRESS_STAGES.PROCESSING, "Thinking…");
        return;
      }

      if (
        progress.compacting ||
        progress.stage === PROGRESS_STAGES.COMPACTING
      ) {
        const msg =
          progress.tokensAfterCompaction != null
            ? `Compaction complete. Tokens after: ~${progress.tokensAfterCompaction}`
            : "Compacting chat history…";
        taskLogger.info(`🗜️  ${msg}`, { component: "CustomCodebaseTask" });
        emitTaskProgress(task, PROGRESS_STAGES.COMPACTING, msg);
        return;
      }

      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`, {
          component: "CustomCodebaseTask",
        });
        emitTaskProgress(task, PROGRESS_STAGES.ANALYZING, progress.message);
        return;
      }

      if (progress.iteration && progress.iteration > 1) {
        const msg =
          progress.message || `Processing (iteration ${progress.iteration})`;
        emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_PROGRESS, {
          taskId,
          domainId,
          iteration: progress.iteration,
          message: msg,
          timestamp: new Date().toISOString(),
        });
        emitTaskProgress(task, PROGRESS_STAGES.PROCESSING, msg);
      }
    },

    onMessage: async (role, content) => {
      if (role === "assistant") {
        messageCount++;

        taskLogger.info(`📨 AI message #${messageCount}`, {
          component: "CustomCodebaseTask",
          contentLength: content.length,
        });

        // Stream message to client
        emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_MESSAGE, {
          taskId,
          domainId,
          role: "assistant",
          content,
          messageNumber: messageCount,
          timestamp: new Date().toISOString(),
        });

        // Persist to chat history
        await appendChatMessage(taskId, { role: "assistant", content }).catch(
          (err) =>
            taskLogger.warn(`Failed to save chat message: ${err.message}`, {
              component: "CustomCodebaseTask",
            }),
        );

        // Detect conflict signals from AI
        if (
          content.includes("⚠️ CONFLICT DETECTED") ||
          content.toLowerCase().includes("option a") ||
          content.toLowerCase().includes("option b")
        ) {
          emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_CONFLICT_DETECTED, {
            taskId,
            domainId,
            content,
            timestamp: new Date().toISOString(),
          });

          emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_AWAITING_RESPONSE, {
            taskId,
            domainId,
            timestamp: new Date().toISOString(),
          });

          await appendProgressNote(
            taskId,
            "Conflict detected - awaiting user response",
          ).catch(() => {});
        }
      }
    },

    onToolCall: (toolName, args, result) => {
      const isFileWrite =
        toolName === "write_file" ||
        toolName === "create_file" ||
        toolName === "str_replace";
      const isDocUpdate =
        args?.path?.includes(".code-analysis/") ||
        args?.path?.includes("docs/");

      if (isFileWrite && args?.path) {
        const event = isDocUpdate
          ? SOCKET_EVENTS.CUSTOM_TASK_DOC_UPDATED
          : SOCKET_EVENTS.CUSTOM_TASK_FILE_UPDATED;

        emitSocketEvent(event, {
          taskId,
          domainId,
          filePath: args.path,
          timestamp: new Date().toISOString(),
        });

        taskLogger.info(`📝 File updated: ${args.path}`, {
          component: "CustomCodebaseTask",
          toolName,
        });
      }
    },

    onComplete: async (stopReason, iterations) => {
      taskLogger.info(
        `✅ Custom task complete after ${iterations} iterations`,
        {
          component: "CustomCodebaseTask",
          stopReason,
        },
      );

      await markProgressComplete(taskId).catch(() => {});

      emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_COMPLETED, {
        taskId,
        domainId,
        messagesStreamed: messageCount,
        iterations,
        timestamp: new Date().toISOString(),
      });
    },
  };
}
