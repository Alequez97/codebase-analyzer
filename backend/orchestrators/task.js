import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { TaskOrchestrator, TASK_EVENTS, TASK_ERROR_CODES } from "@jet-source/task-queue";
import * as queueStore from "../persistence/task-queue-adapter.js";
import { execute as executeTask } from "../tasks/executors/index.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { TASK_TYPES } from "../constants/task-types.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import { deleteProgressFile } from "../utils/task-progress.js";
import * as domainBugsSecurityPersistence from "../persistence/domain-bugs-security.js";
import { PERSISTENCE_FILES } from "../constants/persistence-files.js";
import * as logger from "../utils/logger.js";
import {
  isDesignTaskType,
  sanitizeDesignUserFacingText,
} from "../utils/user-facing-sanitizer.js";

const pendingUserResponses = new Map();

const taskEventPublisher = {
  publish(eventName, { task, error, ...rest }) {
    const map = {
      [TASK_EVENTS.QUEUED]: SOCKET_EVENTS.TASK_QUEUED,
      [TASK_EVENTS.COMPLETED]: SOCKET_EVENTS.TASK_COMPLETED,
      [TASK_EVENTS.FAILED]: SOCKET_EVENTS.TASK_FAILED,
      [TASK_EVENTS.CANCELED]: SOCKET_EVENTS.TASK_CANCELED,
    };
    const socketEvent = map[eventName];
    if (!socketEvent) return;

    emitSocketEvent(socketEvent, {
      taskId: task?.id,
      type: task?.type,
      domainId: task?.params?.domainId,
      error,
      params: task?.params,
      timestamp: new Date().toISOString(),
      ...rest,
    });
  },
};

const taskRunner = {
  isAvailable: async () => true,
  execute: async (task, buildHandler, emitEvent, signal) => {
    const responseHandler = createUserResponseHandler(task);
    const result = await executeTask(task, signal, responseHandler);

    if (result.success) {
      await persistTaskRevision(task);
    }

    if (result.cancelled) {
      await deleteProgressFile(task.id);
    } else if (!result.success) {
      // Keep progress file for debugging failed tasks
    }

    return result;
  },
};

export const orchestrator = new TaskOrchestrator({
  resolveTaskHandler: () => () => ({}),
  queueStore,
  taskRunner,
  taskEventPublisher,
});

export async function getPendingTasks() {
  return queueStore.listPending();
}

export async function getTasks(filters = {}) {
  return queueStore.listTasks(filters);
}

export async function getTask(taskId) {
  return queueStore.readTask(taskId);
}

export async function executeTask(taskId, signal, responseHandler) {
  return orchestrator.executeTask(taskId, { signal });
}

export async function deleteTask(taskId) {
  return orchestrator.deleteTask(taskId);
}

export async function cancelTask(taskId) {
  return orchestrator.cancelTask(taskId);
}

export async function restartTask(taskId) {
  return orchestrator.restartTask(taskId);
}

export async function recoverOrphanedTasks() {
  return orchestrator.recoverOrphanedTasks();
}

export function createUserResponseHandler(task) {
  const { id: taskId, type: taskType } = task;
  return {
    sendMessage(messageData) {
      const isDesignTask = isDesignTaskType(taskType);
      const sanitizedMessage = isDesignTask
        ? sanitizeDesignUserFacingText(messageData?.message)
        : messageData?.message;
      const sanitizedUserOptions =
        isDesignTask && Array.isArray(messageData?.user_options)
          ? messageData.user_options.map((option) =>
              sanitizeDesignUserFacingText(option),
            )
          : messageData?.user_options;

      emitSocketEvent(SOCKET_EVENTS.TASK_MESSAGE_TO_USER, {
        ...messageData,
        message: sanitizedMessage,
        ...(Array.isArray(sanitizedUserOptions)
          ? { user_options: sanitizedUserOptions }
          : {}),
        taskId,
        taskType,
      });
    },

    async waitForResponse(messageId) {
      logger.info(`Task ${taskId} waiting for user response`, {
        component: "TaskOrchestrator",
        messageId,
      });

      await queueStore.moveToWaitingForUser(taskId, {
        messageId,
        waitingFor: "user_response",
      });

      return new Promise((resolve, reject) => {
        pendingUserResponses.set(taskId, { resolve, reject, messageId });

        const timeout = setTimeout(() => {
          if (pendingUserResponses.has(taskId)) {
            pendingUserResponses.delete(taskId);
            reject(
              new Error(
                "User response timeout (10 minutes). Task remains paused and can be resumed later.",
              ),
            );
          }
        }, 600000);

        const wrappedResolve = (value) => {
          clearTimeout(timeout);
          resolve(value);
        };
        const wrappedReject = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        pendingUserResponses.set(taskId, {
          resolve: wrappedResolve,
          reject: wrappedReject,
          messageId,
        });
      });
    },
  };
}

export async function provideUserResponse(taskId, response) {
  const pending = pendingUserResponses.get(taskId);

  if (!pending) {
    logger.warn(`No pending response handler for task ${taskId}`, {
      component: "TaskOrchestrator",
    });
    return {
      success: false,
      error: "No pending response request for this task",
    };
  }

  logger.info(`User response received for task ${taskId}`, {
    component: "TaskOrchestrator",
    messageId: pending.messageId,
    responseLength: response?.length,
  });

  await queueStore.resumeFromWaitingForUser(taskId, response);
  pending.resolve(response);
  pendingUserResponses.delete(taskId);

  return { success: true };
}

async function persistTaskRevision(task) {
  if (task.type === TASK_TYPES.IMPLEMENT_FIX) {
    const { domainId, findingId } = task.params || {};
    if (domainId && findingId) {
      try {
        await domainBugsSecurityPersistence.recordBugsSecurityFindingAction(
          domainId,
          { findingId, action: "apply" },
        );
        logger.debug(
          `Recorded fix action for finding ${findingId} in domain ${domainId}`,
          { component: "TaskOrchestrator", taskId: task.id },
        );
      } catch (error) {
        logger.error(`Failed to record fix action for finding ${findingId}`, {
          error,
          component: "TaskOrchestrator",
          taskId: task.id,
        });
      }
    }
    return;
  }

  if (!task.outputFile) return;

  const outputPath = path.isAbsolute(task.outputFile)
    ? task.outputFile
    : path.join(config.target.directory, task.outputFile);
  const metadataPath = path.join(
    path.dirname(outputPath),
    PERSISTENCE_FILES.METADATA_JSON,
  );

  const SKIP_JSON_REWRITE_TYPES = [
    TASK_TYPES.DOCUMENTATION,
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  if (!SKIP_JSON_REWRITE_TYPES.includes(task.type)) {
    try {
      let raw = "";
      try {
        raw = await fs.readFile(outputPath, "utf-8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      if (raw && raw.trim()) {
        let analysis;
        try { analysis = JSON.parse(raw); } catch { analysis = null; }

        if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
          delete analysis.metadata;

          if (
            task.type === TASK_TYPES.BUGS_SECURITY &&
            Array.isArray(analysis.findings)
          ) {
            const summary = { critical: 0, high: 0, medium: 0, low: 0, total: analysis.findings.length };
            analysis.findings.forEach(({ severity }) => {
              const s = severity?.toLowerCase();
              if (s === "critical") summary.critical++;
              else if (s === "high") summary.high++;
              else if (s === "medium") summary.medium++;
              else if (s === "low") summary.low++;
            });
            analysis.summary = summary;
          }

          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), "utf-8");
        }
      }
    } catch (error) {
      logger.error(`Failed to rewrite analysis output for task ${task.id}`, {
        error,
        component: "TaskOrchestrator",
        taskId: task.id,
      });
    }
  }

  try {
    const { appendRevision } = await import("@jet-source/task-queue");
    const revisionEntry = {
      timestamp: new Date().toISOString(),
      type: task.type,
      model: task.agentConfig?.model,
      truncationCount: 0,
    };
    await appendRevision(metadataPath, revisionEntry);
  } catch (error) {
    logger.warn(`Failed to append revision for task ${task.id}`, {
      error,
      component: "TaskOrchestrator",
      taskId: task.id,
    });
  }
}
