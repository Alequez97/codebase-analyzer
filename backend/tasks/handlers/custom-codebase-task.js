import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import {
  emitSocketEvent,
  emitTaskProgress,
} from "../../utils/socket-emitter.js";
import { appendChatMessage } from "../../utils/chat-history.js";
import {
  ensureProgressDirectory,
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

    onStart: () => {
      // Ensure progress directory exists — the model creates the file itself
      ensureProgressDirectory(taskId).catch((err) =>
        taskLogger.warn(
          `Failed to prepare progress directory: ${err.message}`,
        ),
      );

      taskLogger.info("🤔 AI is thinking...");

      emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_THINKING, {
        taskId,
        domainId,
        thinking: true,
        timestamp: new Date().toISOString(),
      });

      emitTaskProgress(task, PROGRESS_STAGES.PROCESSING, "Thinking…");
    },

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`);
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

    onCompaction: (phase, tokensAfter) => {
      const msg =
        phase === "complete"
          ? `Compaction complete. Tokens after: ~${tokensAfter}`
          : "Compacting chat history…";
      taskLogger.info(`🗜️  ${msg}`);
      emitTaskProgress(task, PROGRESS_STAGES.COMPACTING, msg);
    },

    onMessage: async (role, content) => {
      if (role === "assistant") {
        messageCount++;

        taskLogger.info(`📨 AI message #${messageCount}`, {
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
            taskLogger.warn(`Failed to save chat message: ${err.message}`),
        );
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
          toolName,
        });
      }
    },

    /**
     * Custom tasks don't produce an output file — just log completion and emit events.
     */
    onComplete: async (result) => {
      taskLogger.info(
        `✅ Custom task complete after ${result.iterations} iterations`,
        {
          stopReason: result.stopReason,
        },
      );

      markProgressComplete(taskId).catch(() => {});

      emitSocketEvent(SOCKET_EVENTS.CUSTOM_TASK_COMPLETED, {
        taskId,
        domainId,
        messagesStreamed: messageCount,
        iterations: result.iterations,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    },
  };
}
