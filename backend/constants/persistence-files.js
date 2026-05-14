import { TASK_FOLDERS as BASE_TASK_FOLDERS } from "@jet-source/task-queue";

export const PERSISTENCE_FILES = {
  ANALYSIS_ROOT_DIR: ".code-analysis",
  CONTENT_JSON: "content.json",
  METADATA_JSON: "metadata.json",
  ACTIONS_JSON: "actions.json",
  CONTENT_MD: "content.md",
  CODEBASE_ANALYSIS_JSON: "codebase-analysis.json",
};

export const TASK_FOLDERS = {
  ...BASE_TASK_FOLDERS,
  WAITING_FOR_USER: "waiting_for_user",
};
