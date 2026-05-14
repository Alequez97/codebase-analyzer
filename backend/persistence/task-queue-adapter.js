import fs from "fs/promises";
import path from "path";
import {
  createFileQueueStore,
  TASK_FOLDERS as PKG_FOLDERS,
  TASK_ERROR_CODES,
  tryReadJsonFile,
} from "@jet-source/task-queue";
import config from "../config.js";
import { TASK_STATUS } from "../constants/task-status.js";
import { TASK_FOLDERS } from "../constants/persistence-files.js";
import { SOCKET_EVENTS } from "../constants/socket-events.js";
import { emitSocketEvent } from "../utils/socket-emitter.js";
import * as logger from "../utils/logger.js";

const queueDir = path.join(config.paths.targetAnalysis);

const base = createFileQueueStore({ queueDir });

function taskFolderPath(folder, taskId) {
  return path.join(queueDir, "tasks", folder, `${taskId}.json`);
}

async function moveTask(taskId, fromFolder, toFolder) {
  const src = taskFolderPath(fromFolder, taskId);
  const dst = taskFolderPath(toFolder, taskId);
  const content = await fs.readFile(src, "utf-8");
  const task = JSON.parse(content);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.writeFile(dst, content, "utf-8");
  await fs.unlink(src);
  return task;
}

export async function readTask(taskId) {
  const folders = [...Object.values(PKG_FOLDERS), TASK_FOLDERS.WAITING_FOR_USER];
  for (const folder of folders) {
    try {
      const task = await tryReadJsonFile(
        taskFolderPath(folder, taskId),
        `task ${taskId}`,
      );
      if (task) return task;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

export async function moveToWaitingForUser(taskId, waitingMetadata = {}) {
  const task = await moveTask(taskId, PKG_FOLDERS.RUNNING, TASK_FOLDERS.WAITING_FOR_USER);
  task.status = TASK_STATUS.WAITING_FOR_USER;
  task.waitingSince = new Date().toISOString();
  task.waitingMetadata = { ...waitingMetadata, timestamp: new Date().toISOString() };

  const dst = taskFolderPath(TASK_FOLDERS.WAITING_FOR_USER, taskId);
  await fs.writeFile(dst, JSON.stringify(task, null, 2), "utf-8");

  emitSocketEvent(SOCKET_EVENTS.TASK_WAITING_FOR_USER, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    waitingMetadata: task.waitingMetadata,
    timestamp: new Date().toISOString(),
  });

  return task;
}

export async function resumeFromWaitingForUser(taskId, userResponse) {
  const task = await moveTask(taskId, TASK_FOLDERS.WAITING_FOR_USER, PKG_FOLDERS.RUNNING);
  task.status = TASK_STATUS.RUNNING;
  task.resumedAt = new Date().toISOString();

  if (!task.userResponses) task.userResponses = [];
  task.userResponses.push({
    messageId: task.waitingMetadata?.messageId,
    message: task.waitingMetadata?.message,
    response: userResponse,
    respondedAt: new Date().toISOString(),
  });

  delete task.waitingSince;
  delete task.waitingMetadata;

  const dst = taskFolderPath(PKG_FOLDERS.RUNNING, taskId);
  await fs.writeFile(dst, JSON.stringify(task, null, 2), "utf-8");

  emitSocketEvent(SOCKET_EVENTS.TASK_RESUMED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId,
    timestamp: new Date().toISOString(),
  });

  return task;
}

export async function updateTask(taskId, updates) {
  const task = await readTask(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  Object.assign(task, updates);

  const folder = task.status === TASK_STATUS.WAITING_FOR_USER
    ? TASK_FOLDERS.WAITING_FOR_USER
    : task.status === TASK_STATUS.RUNNING
      ? PKG_FOLDERS.RUNNING
      : task.status === TASK_STATUS.PENDING
        ? PKG_FOLDERS.PENDING
        : task.status === TASK_STATUS.COMPLETED
          ? PKG_FOLDERS.COMPLETED
          : task.status === TASK_STATUS.FAILED
            ? PKG_FOLDERS.FAILED
            : PKG_FOLDERS.CANCELED;

  await fs.writeFile(
    taskFolderPath(folder, taskId),
    JSON.stringify(task, null, 2),
    "utf-8",
  );

  return task;
}

export const enqueueTask = base.enqueueTask;
export const listPending = base.listPending;
export const listRunning = base.listRunning;
export const listTasks = base.listTasks;
export const claimTask = base.claimTask;
export const completeTask = base.completeTask;
export const failTask = base.failTask;
export const cancelTask = base.cancelTask;
export const requeueTask = base.requeueTask;
export const restartTask = base.restartTask;
export const deleteTask = base.deleteTask;
export const renewLease = base.renewLease;
export const releaseLease = base.releaseLease;
export const requeueExpiredTasks = base.requeueExpiredTasks;
