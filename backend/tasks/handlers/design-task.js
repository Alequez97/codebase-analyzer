import fs from "fs/promises";
import {
  getDesignAppManifestRelativePath,
  getDesignBriefRelativePath,
  getDesignCssOutputPath,
  getDesignHtmlOutputPath,
  getDesignJsOutputPath,
  getDesignSystemManifestRelativePath,
  getAbsoluteDesignPath,
} from "../queue/design-shared.js";
import { appendChatMessage } from "../../utils/chat-history.js";
import {
  ensureProgressDirectory,
  markProgressComplete,
} from "../../utils/task-progress.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { TASK_TYPES } from "../../constants/task-types.js";

function describeDesignToolCall(toolName) {
  if (
    toolName === "write_file" ||
    toolName === "replace_lines" ||
    toolName === "create_file"
  ) {
    return {
      stage: PROGRESS_STAGES.SAVING,
      message: "Refining the design output...",
    };
  }

  if (toolName === "execute_command") {
    return {
      stage: PROGRESS_STAGES.ANALYZING,
      message: "Checking the design setup...",
    };
  }

  if (
    toolName === "read_file" ||
    toolName === "list_directory" ||
    toolName === "search_files"
  ) {
    return {
      stage: PROGRESS_STAGES.ANALYZING,
      message: "Gathering design context...",
    };
  }

  return {
    stage: PROGRESS_STAGES.PROCESSING,
    message: "Working through the next design step...",
  };
}

function getPublicDesignProgress(progress) {
  if (!progress || typeof progress !== "object") {
    return {
      stage: PROGRESS_STAGES.PROCESSING,
      message: "Working on the design...",
    };
  }

  if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
    return describeDesignToolCall(progress.tool);
  }

  if (progress.stage === PROGRESS_STAGES.COMPACTING) {
    return {
      stage: PROGRESS_STAGES.COMPACTING,
      message: "Compacting the design conversation...",
    };
  }

  if (progress.stage === PROGRESS_STAGES.SAVING) {
    return {
      stage: PROGRESS_STAGES.SAVING,
      message: "Refining the design output...",
    };
  }

  if (progress.stage === PROGRESS_STAGES.ANALYZING) {
    return {
      stage: PROGRESS_STAGES.ANALYZING,
      message: "Gathering design context...",
    };
  }

  return {
    stage: progress.stage || PROGRESS_STAGES.PROCESSING,
    message: "Working on the design...",
  };
}

export function designTaskHandler(task, taskLogger) {
  return {
    initialMessage: task.params.userInstruction,
    priorMessages: Array.isArray(task.params?.history)
      ? task.params.history.filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim(),
        )
      : [],

    onStart: () => {
      ensureProgressDirectory(task.id).catch((error) =>
        taskLogger.warn(
          `Failed to prepare progress directory: ${error.message}`,
        ),
      );
      taskLogger.progress("Thinking...", {
        stage: PROGRESS_STAGES.PROCESSING,
        publicLogText: "Thinking through the design direction...",
      });
    },

    onProgress: (progress) => {
      const internalMessage = progress.message || "Working on the design...";
      const publicProgress = getPublicDesignProgress(progress);
      taskLogger.progress(internalMessage, {
        stage: publicProgress.stage,
        publicLogText: publicProgress.message,
      });
    },

    onCompaction: (phase, _tokensAfter) => {
      const message =
        phase === "complete"
          ? "Refreshing the design context..."
          : "Compacting the design conversation...";
      taskLogger.progress(message, {
        stage: PROGRESS_STAGES.COMPACTING,
        publicLogText: message,
      });
    },

    onMessage: async (role, content) => {
      if (role !== "assistant" || !content?.trim()) {
        return;
      }

      await appendChatMessage(task.id, { role, content }).catch((error) =>
        taskLogger.warn(`Failed to save design chat message: ${error.message}`),
      );
    },

    onToolCall: (toolName, args) => {
      const { stage, message } = describeDesignToolCall(toolName);
      taskLogger.info(`Tool ${toolName} invoked`, {
        filePath: args?.path || args?.file_path || null,
      });
      taskLogger.progress(message, {
        stage,
        publicLogText: message,
      });
    },

    onComplete: async () => {
      taskLogger.progress("Finalizing the design preview...", {
        stage: PROGRESS_STAGES.COMPLETING,
        publicLogText: "Finalizing the design preview...",
      });

      if (task.type === TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE) {
        const designId = task.params?.designId;
        const expectedPaths = [
          getDesignBriefRelativePath(designId),
          getDesignAppManifestRelativePath(designId),
          getDesignSystemManifestRelativePath(designId),
          task.params?.tokensPath,
        ];

        for (const relativePath of expectedPaths.filter(Boolean)) {
          try {
            await fs.access(getAbsoluteDesignPath(relativePath));
          } catch {
            return {
              success: false,
              error: `Design orchestration did not produce required file: ${relativePath}`,
            };
          }
        }
      }

      if (task.type === TASK_TYPES.DESIGN_GENERATE_PAGE) {
        const designId = task.params?.designId;
        const pageId = task.params?.pageId;
        const expectedPaths = [
          getDesignHtmlOutputPath(designId, pageId),
          getDesignCssOutputPath(designId, pageId),
          getDesignJsOutputPath(designId, pageId),
        ];

        for (const relativePath of expectedPaths) {
          try {
            await fs.access(getAbsoluteDesignPath(relativePath));
          } catch {
            return {
              success: false,
              error: `Design page generation did not produce required file: ${relativePath}`,
            };
          }
        }
      }

      await markProgressComplete(task.id).catch(() => {});
      return { success: true };
    },
  };
}


