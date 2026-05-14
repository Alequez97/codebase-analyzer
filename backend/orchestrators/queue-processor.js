import { createQueueProcessor } from "@jet-source/task-queue";
import * as queueStore from "../persistence/task-queue-adapter.js";
import { orchestrator } from "./task.js";

const processor = createQueueProcessor({
  queueStore,
  taskOrchestrator: orchestrator,
});

export const startQueueProcessor = processor.start;
export const stopQueueProcessor = processor.stop;
