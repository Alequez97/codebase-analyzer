import * as tasksPersistence from "../persistence/tasks.js";
import { executeTask } from "./task.js";
import * as logger from "../utils/logger.js";
import { TASK_STATUS } from "../constants/task-status.js";

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;

let pollTimer = null;
let active = false;

export function startQueueProcessor() {
  if (active) return;
  active = true;
  logger.info("Queue processor started", {
    component: "QueueProcessor",
    pollIntervalMs: POLL_INTERVAL_MS,
    maxConcurrent: MAX_CONCURRENT,
  });
  schedulePoll();
}

export function stopQueueProcessor() {
  active = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  logger.info("Queue processor stopped", { component: "QueueProcessor" });
}

function schedulePoll() {
  if (!active) return;
  pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
}

async function areDependenciesMet(task) {
  if (!Array.isArray(task.dependsOn) || task.dependsOn.length === 0) {
    return true;
  }

  for (const dependencyTaskId of task.dependsOn) {
    const dependencyTask = await tasksPersistence.readTask(dependencyTaskId);

    if (!dependencyTask) {
      return false;
    }

    if (
      dependencyTask.status !== TASK_STATUS.COMPLETED &&
      dependencyTask.status !== TASK_STATUS.FAILED
    ) {
      return false;
    }
  }

  return true;
}

async function poll() {
  try {
    const running = await tasksPersistence.listRunning();
    const slots = MAX_CONCURRENT - running.length;

    if (slots > 0) {
      const pending = await tasksPersistence.listPending();
      const toProcess = pending.slice(0, slots);

      for (const task of toProcess) {
        if (!(await areDependenciesMet(task))) {
          continue;
        }

        try {
          await tasksPersistence.moveToRunning(task.id);
        } catch (error) {
          logger.error(
            `Queue processor: failed to claim task ${task.id}, skipping`,
            { error, component: "QueueProcessor", taskId: task.id },
          );
          continue;
        }

        logger.info(
          `Queue processor: dispatching task ${task.id} (type: ${task.type})`,
          { component: "QueueProcessor", taskId: task.id, type: task.type },
        );

        executeTask(task.id).catch((error) => {
          logger.error(`Queue processor: task ${task.id} threw unexpectedly`, {
            error,
            component: "QueueProcessor",
            taskId: task.id,
          });
        });
      }
    }
  } catch (error) {
    logger.error("Queue processor poll error", {
      error,
      component: "QueueProcessor",
    });
  }

  schedulePoll();
}
