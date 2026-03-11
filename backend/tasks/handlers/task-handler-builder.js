/**
 * Task Handler Factory
 * Creates task-specific handler configuration based on task type
 */

import { TASK_TYPES } from "../../constants/task-types.js";
import { loadSystemInstructionForTask } from "../../utils/system-instruction-loader.js";
import { loadDomainSectionChatHistory } from "../../utils/chat-history.js";
import * as logger from "../../utils/logger.js";
import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { editDocumentationHandler } from "./edit-documentation.js";
import { createEditSectionHandler } from "./edit-section.js";
import { customCodebaseTaskHandler } from "./custom-codebase-task.js";
import { analyzeDocumentationHandler } from "./analyze-documentation.js";
import { analyzeRefactoringAndTestingHandler } from "./analyze-refactoring-and-testing.js";
import { implementTestHandler } from "./implement-test.js";
import { applyRefactoringHandler } from "./apply-refactoring.js";
import { implementFixHandler } from "./implement-fix.js";
import { defaultAnalysisHandler } from "./default-analysis.js";
import { reviewChangesHandler } from "./review-changes.js";

import { SOCKET_EVENTS } from "../../constants/socket-events.js";

/**
 * Map of edit task types to their createEditSectionHandler options
 */
const EDIT_SECTION_HANDLER_OPTIONS = {
  [TASK_TYPES.EDIT_DIAGRAMS]: {
    componentName: "EditDiagrams",
    contentUpdatedEvent: SOCKET_EVENTS.DIAGRAMS_UPDATED,
    isJsonOutput: true,
    sectionLabel: "diagrams",
  },
  [TASK_TYPES.EDIT_REQUIREMENTS]: {
    componentName: "EditRequirements",
    contentUpdatedEvent: SOCKET_EVENTS.REQUIREMENTS_UPDATED,
    isJsonOutput: true,
    sectionLabel: "requirements",
  },
  [TASK_TYPES.EDIT_BUGS_SECURITY]: {
    componentName: "EditBugsSecurity",
    contentUpdatedEvent: SOCKET_EVENTS.BUGS_SECURITY_UPDATED,
    isJsonOutput: true,
    sectionLabel: "bugs & security",
  },
  [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]: {
    componentName: "EditRefactoringAndTesting",
    contentUpdatedEvent: SOCKET_EVENTS.REFACTORING_AND_TESTING_UPDATED,
    isJsonOutput: true,
    sectionLabel: "refactoring & testing",
  },
};

/**
 * Configure all file-access permissions on the agent's fileToolExecutor for the given task.
 * This is the single source of truth for what the agent is allowed to read and write.
 *
 * - IMPLEMENT_FIX / IMPLEMENT_TEST / APPLY_REFACTORING : full project write access
 * - CUSTOM_CODEBASE_TASK                               : full project read + write access
 * - Edit tasks                                         : task.outputFile only
 * - Everything else                : empty list (analysis tasks only write to .code-analysis/,
 *                                    which is always permitted by the write gate)
 */
function setTaskFileAccess(fileToolExecutor, task, taskLogger) {
  const EDIT_TASK_TYPES = [
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  if (
    task.type === TASK_TYPES.IMPLEMENT_FIX ||
    task.type === TASK_TYPES.IMPLEMENT_TEST ||
    task.type === TASK_TYPES.APPLY_REFACTORING
  ) {
    fileToolExecutor.setAllowAnyWrite(true);
    taskLogger.info(`🔓 Full project write access granted (${task.type})`, {
      component: "TaskHandler",
    });
    return;
  }

  if (
    task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK ||
    task.type === TASK_TYPES.REVIEW_CHANGES
  ) {
    fileToolExecutor.setAllowAnyWrite(true);
    fileToolExecutor.setAllowAnyRead(true);
    taskLogger.info(
      `🔓 Full project read+write access granted (${task.type})`,
      { component: "TaskHandler" },
    );
    return;
  }

  let allowedPaths = [];

  if (EDIT_TASK_TYPES.includes(task.type)) {
    allowedPaths = task.outputFile ? [task.outputFile] : [];
  }

  fileToolExecutor.setAllowedWritePaths(allowedPaths);

  if (allowedPaths.length > 0) {
    taskLogger.info(
      `🔓 Write access restricted to output file only (edit task): ${allowedPaths.join(", ")}`,
      { component: "TaskHandler" },
    );
  } else {
    taskLogger.info(
      `🔒 No explicit write paths set — analysis task writes only to .code-analysis/ (enforced by write gate)`,
      { component: "TaskHandler" },
    );
  }
}

export async function createTaskHandler(task, taskLogger, agent) {
  // Configure file-access permissions for this task type (single source of truth).
  if (agent?.fileToolExecutor) {
    setTaskFileAccess(agent.fileToolExecutor, task, taskLogger);
  }

  // Load task-specific system instructions
  const instructions = await loadSystemInstructionForTask(task);
  taskLogger.info(`📝 Instructions loaded (${instructions.length} chars)`, {
    component: "TaskHandler",
  });

  // Dump processed instruction to temp folder for debugging
  try {
    const dumpDir = path.join(config.paths.temp, "system-instructions");
    await fs.mkdir(dumpDir, { recursive: true });
    await fs.writeFile(
      path.join(dumpDir, `${task.id}.md`),
      instructions,
      "utf-8",
    );
  } catch (err) {
    logger.debug("Failed to write instruction dump", {
      error: err.message,
      component: "TaskHandler",
    });
  }

  // Get default handler (complete with all callbacks)
  const defaults = defaultAnalysisHandler(task, taskLogger, agent);

  // Get task-specific overrides
  let overrides = {};

  if (task.type === TASK_TYPES.EDIT_DOCUMENTATION) {
    // Load the persisted session so the LLM gets full multi-turn context.
    // The last message in the file is always the current user turn (it was
    // written by the route handler before launching this task).
    const chatHistory = await loadDomainSectionChatHistory(
      task.params.domainId,
      task.params.sectionType,
      task.params.chatId,
    );
    const messages = (chatHistory?.messages || []).filter(
      (m) => m.role === "user" || m.role === "assistant",
    );
    // Split: everything before the last entry is prior context;
    // the last entry must be the current user message.
    const initialMessage =
      messages.at(-1)?.content || "Please help with the documentation.";
    const priorMessages = messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    overrides = editDocumentationHandler(task, taskLogger, agent, {
      initialMessage,
      priorMessages,
    });
  } else if (
    task.type === TASK_TYPES.EDIT_DIAGRAMS ||
    task.type === TASK_TYPES.EDIT_REQUIREMENTS ||
    task.type === TASK_TYPES.EDIT_BUGS_SECURITY ||
    task.type === TASK_TYPES.EDIT_REFACTORING_AND_TESTING
  ) {
    const chatHistory = await loadDomainSectionChatHistory(
      task.params.domainId,
      task.params.sectionType,
      task.params.chatId,
    );
    const messages = (chatHistory?.messages || []).filter(
      (m) => m.role === "user" || m.role === "assistant",
    );
    const initialMessage =
      messages.at(-1)?.content || "Please help with this section.";
    const priorMessages = messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    overrides = createEditSectionHandler(
      task,
      taskLogger,
      agent,
      { initialMessage, priorMessages },
      EDIT_SECTION_HANDLER_OPTIONS[task.type],
    );
  } else if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
    overrides = customCodebaseTaskHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.REVIEW_CHANGES) {
    overrides = reviewChangesHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DOCUMENTATION) {
    overrides = analyzeDocumentationHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.REFACTORING_AND_TESTING) {
    overrides = analyzeRefactoringAndTestingHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.IMPLEMENT_TEST) {
    overrides = implementTestHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.APPLY_REFACTORING) {
    overrides = applyRefactoringHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.IMPLEMENT_FIX) {
    overrides = implementFixHandler(task, taskLogger, agent);
  }

  // Merge: defaults provide all callbacks, overrides replace what's needed
  return {
    systemPrompt: instructions,
    ...defaults,
    ...overrides,
  };
}
