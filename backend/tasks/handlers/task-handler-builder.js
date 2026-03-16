/**
 * Task Handler Factory
 * Creates task-specific handler configuration based on task type.
 */

import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { loadSystemInstructionForTask } from "../../utils/system-instruction-loader.js";
import { loadDomainSectionChatHistory } from "../../utils/chat-history.js";
import * as logger from "../../utils/logger.js";
import { analyzeDocumentationHandler } from "./analyze-documentation.js";
import { analyzeRefactoringAndTestingHandler } from "./analyze-refactoring-and-testing.js";
import { applyRefactoringHandler } from "./apply-refactoring.js";
import { customCodebaseTaskHandler } from "./custom-codebase-task.js";
import { defaultAnalysisHandler } from "./default-analysis.js";
import { designTaskHandler } from "./design-task.js";
import { editCodebaseAnalysisHandler } from "./edit-codebase-analysis.js";
import { editDocumentationHandler } from "./edit-documentation.js";
import { createEditSectionHandler } from "./edit-section.js";
import { implementFixHandler } from "./implement-fix.js";
import { implementTestHandler } from "./implement-test.js";
import { reviewChangesHandler } from "./review-changes.js";

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

function setTaskFileAccess(fileToolExecutor, task, taskLogger) {
  const editTaskTypes = [
    TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
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
    taskLogger.info(`Full project write access granted (${task.type})`);
    return;
  }

  if (
    task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK ||
    task.type === TASK_TYPES.DESIGN_BRAINSTORM ||
    task.type === TASK_TYPES.DESIGN_GENERATE ||
    task.type === TASK_TYPES.REVIEW_CHANGES
  ) {
    if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
      fileToolExecutor.setAllowAnyWrite(true);
    }
    fileToolExecutor.setAllowAnyRead(true);
    taskLogger.info(
      `Full project ${task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK ? "read+write" : "read-only"} access granted (${task.type})`,
    );
    return;
  }

  const allowedPaths = editTaskTypes.includes(task.type)
    ? task.outputFile
      ? [task.outputFile]
      : []
    : [];

  fileToolExecutor.setAllowedWritePaths(allowedPaths);

  if (allowedPaths.length > 0) {
    taskLogger.info(
      `Write access restricted to: ${allowedPaths.join(", ")}`,
    );
  } else {
    taskLogger.info(
      "No explicit write paths set; analysis writes are limited to .code-analysis/",
    );
  }
}

function enableGitCommandsIfUseful(agent, task, taskLogger) {
  const gitEnabledTaskTypes = [
    TASK_TYPES.IMPLEMENT_FIX,
    TASK_TYPES.IMPLEMENT_TEST,
    TASK_TYPES.APPLY_REFACTORING,
    TASK_TYPES.REVIEW_CHANGES,
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
    TASK_TYPES.DESIGN_BRAINSTORM,
    TASK_TYPES.DESIGN_GENERATE,
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  if (!gitEnabledTaskTypes.includes(task.type)) {
    return;
  }

  agent.enableCommandTools({
    timeoutMs: 60_000,
    additionalAllowedPrefixes: [
      "git diff",
      "git log",
      "git status",
      "git show",
      "git branch",
      "git blame",
    ],
  });

  taskLogger.info("Git command tools enabled");
}

function buildSectionChatContext(task, fallbackMessage) {
  return loadDomainSectionChatHistory(
    task.params.domainId,
    task.params.sectionType,
    task.params.chatId,
  ).then((chatHistory) => {
    const messages = (chatHistory?.messages || []).filter(
      (message) => message.role === "user" || message.role === "assistant",
    );

    return {
      initialMessage: messages.at(-1)?.content || fallbackMessage,
      priorMessages: messages.slice(0, -1).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };
  });
}

export async function createTaskHandler(task, taskLogger, agent) {
  if (agent?.fileToolExecutor) {
    setTaskFileAccess(agent.fileToolExecutor, task, taskLogger);
  }

  if (agent) {
    enableGitCommandsIfUseful(agent, task, taskLogger);
  }

  const instructions = await loadSystemInstructionForTask(task);
  taskLogger.info(`Instructions loaded (${instructions.length} chars)`);

  try {
    const dumpDir = path.join(config.paths.temp, "system-instructions");
    await fs.mkdir(dumpDir, { recursive: true });
    await fs.writeFile(
      path.join(dumpDir, `${task.id}.md`),
      instructions,
      "utf-8",
    );
  } catch (error) {
    logger.debug("Failed to write instruction dump", {
      error: error.message,
    });
  }

  const defaults = defaultAnalysisHandler(task, taskLogger, agent);
  let overrides = {};

  if (task.type === TASK_TYPES.EDIT_DOCUMENTATION) {
    const chatContext = await buildSectionChatContext(
      task,
      "Please help with the documentation.",
    );
    overrides = editDocumentationHandler(task, taskLogger, agent, chatContext);
  } else if (
    task.type === TASK_TYPES.EDIT_DIAGRAMS ||
    task.type === TASK_TYPES.EDIT_REQUIREMENTS ||
    task.type === TASK_TYPES.EDIT_BUGS_SECURITY ||
    task.type === TASK_TYPES.EDIT_REFACTORING_AND_TESTING
  ) {
    const chatContext = await buildSectionChatContext(
      task,
      "Please help with this section.",
    );
    overrides = createEditSectionHandler(
      task,
      taskLogger,
      agent,
      chatContext,
      EDIT_SECTION_HANDLER_OPTIONS[task.type],
    );
  } else if (
    task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK ||
    task.type === TASK_TYPES.DESIGN_BRAINSTORM
  ) {
    overrides =
      task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK
        ? customCodebaseTaskHandler(task, taskLogger, agent)
        : designTaskHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.REVIEW_CHANGES) {
    overrides = reviewChangesHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.EDIT_CODEBASE_ANALYSIS) {
    overrides = editCodebaseAnalysisHandler(task, taskLogger, agent);
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
  } else if (task.type === TASK_TYPES.DESIGN_GENERATE) {
    overrides = designTaskHandler(task, taskLogger, agent);
  }

  return {
    systemPrompt: instructions,
    ...defaults,
    ...overrides,
  };
}
