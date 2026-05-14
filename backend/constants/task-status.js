import { TASK_STATUS as BASE_STATUS } from "@jet-source/task-queue";

export const TASK_STATUS = {
  ...BASE_STATUS,
  WAITING_FOR_USER: "waiting_for_user",
};
