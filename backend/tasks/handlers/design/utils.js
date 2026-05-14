/**
 * Shared utilities for design task handlers
 */
import { PROGRESS_STAGES } from "@jet-source/agent-core";

export function describeDesignToolCall(toolName) {
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

export function getPublicDesignProgress(progress) {
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

export function getHistoryMessages(history) {
  return Array.isArray(history)
    ? history
        .filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim(),
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
          // Preserve reasoning_content for Kimi/DeepSeek thinking mode
          reasoning_content: message.reasoning_content ?? null,
        }))
    : [];
}
