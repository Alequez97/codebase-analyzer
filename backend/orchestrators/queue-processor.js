import * as tasksPersistence from "../persistence/tasks.js";
import { executeTask } from "./task.js";
import * as logger from "../utils/logger.js";

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;

let pollTimer = null;
let active = false;

/**
 * Start the queue processor.
 * Polls the pending folder and fires off execution for queued tasks
 * up to MAX_CONCURRENT at a time.
 */
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

/**
 * Stop the queue processor (used during graceful shutdown / tests).
 */
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

async function poll() {
  try {
    const running = await tasksPersistence.listRunning();
    const slots = MAX_CONCURRENT - running.length;

    if (slots > 0) {
      const pending = await tasksPersistence.listPending();

      // listPending returns oldest-first; take as many as slots allow
      const toProcess = pending.slice(0, slots);

      for (const task of toProcess) {
        // Claim the task synchronously (move pending/ → running/) before firing
        // the agent, so the next poll doesn't see it as pending again.
        try {
          await tasksPersistence.moveToRunning(task.id);
        } catch (err) {
          logger.error(
            `Queue processor: failed to claim task ${task.id}, skipping`,
            { error: err, component: "QueueProcessor", taskId: task.id },
          );
          continue;
        }

        logger.info(
          `Queue processor: dispatching task ${task.id} (type: ${task.type})`,
          { component: "QueueProcessor", taskId: task.id, type: task.type },
        );

        // Fire-and-forget — task is already in running/, executeTask skips moveToRunning
        executeTask(task.id).catch((err) => {
          logger.error(`Queue processor: task ${task.id} threw unexpectedly`, {
            error: err,
            component: "QueueProcessor",
            taskId: task.id,
          });
        });
      }
    }
  } catch (err) {
    logger.error("Queue processor poll error", {
      error: err,
      component: "QueueProcessor",
    });
  }

  schedulePoll();
}
