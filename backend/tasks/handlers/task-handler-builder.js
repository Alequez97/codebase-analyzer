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
import {
  getAllowedReadPaths,
  getAllowedWritePaths,
  hasUnrestrictedReadAccess,
  hasUnrestrictedWriteAccess,
  DEFAULT_WRITE_DIRECTORY,
} from "../../utils/task-file-access.js";
import { analyzeDocumentationHandler } from "./analysis/documentation.js";
import { analyzeRefactoringAndTestingHandler } from "./analysis/refactoring-and-testing.js";
import { applyRefactoringHandler } from "./application/refactoring.js";
import { customCodebaseTaskHandler } from "./custom/codebase-task.js";
import { defaultAnalysisHandler } from "./analysis/default.js";
import {
  designBrainstormHandler,
  designPlanAndStyleSystemGenerateHandler,
  designGeneratePageHandler,
  designAssistantHandler,
  designReverseEngineerHandler,
  designReverseEngineerPageHandler,
} from "./design/index.js";
import { editCodebaseAnalysisHandler } from "./editing/codebase-analysis.js";
import { editDocumentationHandler } from "./editing/documentation.js";
import { createEditSectionHandler } from "./editing/section.js";
import { implementFixHandler } from "./implementation/fix.js";
import { implementTestHandler } from "./implementation/test.js";
import { reviewChangesHandler } from "./review/changes.js";
import { queueDesignReverseEngineerTask } from "../queue/design/reverse-engineer.js";
import { queueDesignReverseEngineerPageTask } from "../queue/design/reverse-engineer-page.js";
import { queueDesignGeneratePageTask } from "../queue/design/generate-page.js";
import { queueDesignAssistantTask } from "../queue/design/design-assistant.js";
import { queueDesignPlanAndStyleSystemGenerateTask } from "../queue/design/plan-and-style-system-generate.js";

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

const DESIGN_QUEUE_FUNCTIONS = {
  [TASK_TYPES.DESIGN_ASSISTANT]: queueDesignAssistantTask,
  [TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE]:
    queueDesignPlanAndStyleSystemGenerateTask,
  [TASK_TYPES.DESIGN_GENERATE_PAGE]: queueDesignGeneratePageTask,
  [TASK_TYPES.DESIGN_REVERSE_ENGINEER]: queueDesignReverseEngineerTask,
  [TASK_TYPES.DESIGN_REVERSE_ENGINEER_PAGE]: queueDesignReverseEngineerPageTask,
};

const MESSAGE_TOOL_TASK_TYPES = new Set([
  TASK_TYPES.DESIGN_BRAINSTORM,
  TASK_TYPES.DESIGN_ASSISTANT,
]);

export function setTaskFileAccess(fileToolExecutor, task, taskLogger) {
  const editTaskTypes = [
    TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  // Check for unrestricted write access (full project read+write)
  if (hasUnrestrictedWriteAccess(task.type)) {
    fileToolExecutor.setAllowAnyWrite(true);
    fileToolExecutor.setAllowAnyRead(true);
    taskLogger.info(`Full project read+write access granted (${task.type})`);
    return;
  }

  // Check for task-specific write paths (e.g., design folder for page generation)
  const taskWritePaths = getAllowedWritePaths(task);
  if (taskWritePaths) {
    fileToolExecutor.setAllowedWritePaths(taskWritePaths);
    taskLogger.info(
      `${task.type}: write access restricted to ${taskWritePaths.join(", ")}`,
    );
  }

  // Check for unrestricted read access (full project read-only, limited write)
  if (hasUnrestrictedReadAccess(task.type)) {
    fileToolExecutor.setAllowAnyRead(true);
    taskLogger.info(`Full project read access granted (${task.type})`);
    return;
  }

  // Check for restricted read paths
  const restrictedReadPaths = getAllowedReadPaths(task);
  if (restrictedReadPaths) {
    fileToolExecutor.setAllowedReadPaths(restrictedReadPaths);
    taskLogger.info(
      `${task.type}: read access restricted to ${restrictedReadPaths.join(", ")}`,
    );
    return;
  } else {
    taskLogger.info(`${task.type}: no read path restrictions applied`);
  }

  // Default: use explicit write paths for edit tasks
  const allowedPaths = editTaskTypes.includes(task.type)
    ? task.outputFile
      ? [task.outputFile]
      : []
    : [];

  fileToolExecutor.setAllowedWritePaths(allowedPaths);

  if (allowedPaths.length > 0) {
    taskLogger.info(`Write access restricted to: ${allowedPaths.join(", ")}`);
  } else if (!taskWritePaths) {
    taskLogger.info(
      `No explicit write paths set; writes are limited to ${DEFAULT_WRITE_DIRECTORY}/`,
    );
  }
}

function enableCommandsIfUseful(agent, task, taskLogger) {
  // Task types that need Git commands
  const gitTaskTypes = [
    TASK_TYPES.IMPLEMENT_FIX,
    TASK_TYPES.IMPLEMENT_TEST,
    TASK_TYPES.APPLY_REFACTORING,
    TASK_TYPES.REVIEW_CHANGES,
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
    TASK_TYPES.DESIGN_BRAINSTORM,
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    TASK_TYPES.DESIGN_GENERATE_PAGE,
    TASK_TYPES.DESIGN_REVERSE_ENGINEER_PAGE,
    TASK_TYPES.DESIGN_ASSISTANT,
    TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
    TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
  ];

  // Task types that need npm build commands (any task that modifies code)
  const npmBuildTaskTypes = [
    // Design tasks
    TASK_TYPES.DESIGN_BRAINSTORM,
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
    TASK_TYPES.DESIGN_GENERATE_PAGE,
    TASK_TYPES.DESIGN_REVERSE_ENGINEER_PAGE,
    TASK_TYPES.DESIGN_ASSISTANT,
    TASK_TYPES.DESIGN_REVERSE_ENGINEER,
    // Implementation tasks
    TASK_TYPES.IMPLEMENT_FIX,
    TASK_TYPES.IMPLEMENT_TEST,
    TASK_TYPES.APPLY_REFACTORING,
    // Custom tasks
    TASK_TYPES.CUSTOM_CODEBASE_TASK,
    TASK_TYPES.REVIEW_CHANGES,
    // Edit tasks (might modify code)
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
    TASK_TYPES.EDIT_CODEBASE_ANALYSIS,
  ];

  const needsGit = gitTaskTypes.includes(task.type);
  const needsNpmBuild = npmBuildTaskTypes.includes(task.type);

  if (!needsGit && !needsNpmBuild) {
    return;
  }

  // Enable specific command categories
  if (needsGit) {
    agent.enableGitCommands();
  }

  if (needsNpmBuild) {
    agent.enableAllNpmCommands();
  }

  // Set longer timeout for tasks that need builds (installs/compilations take time)
  agent.setCommandTimeout(needsNpmBuild ? 120_000 : 60_000);

  taskLogger.info("Command tools enabled", {
    git: needsGit,
    npmBuild: needsNpmBuild,
  });
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
        // Preserve reasoning_content for Kimi/DeepSeek thinking mode
        reasoning_content: message.reasoning_content ?? null,
      })),
    };
  });
}

export async function createTaskHandler(task, taskLogger, agent) {
  if (agent?.tools?.fileToolExecutor) {
    setTaskFileAccess(agent.tools.fileToolExecutor, task, taskLogger);
  }

  if (agent) {
    enableCommandsIfUseful(agent, task, taskLogger);
  }

  if (agent && task.responseHandler && MESSAGE_TOOL_TASK_TYPES.has(task.type)) {
    agent.enableMessageTools(task.responseHandler);
    taskLogger.info(`Message tools enabled (${task.type})`);
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
  } else if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
    overrides = customCodebaseTaskHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DESIGN_BRAINSTORM) {
    overrides = designBrainstormHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE) {
    if (agent) {
      agent.enableDelegationTools(task.id, DESIGN_QUEUE_FUNCTIONS);
      taskLogger.info("Design page delegation tools enabled");
    }
    overrides = designPlanAndStyleSystemGenerateHandler(
      task,
      taskLogger,
      agent,
    );
  } else if (task.type === TASK_TYPES.DESIGN_GENERATE_PAGE) {
    overrides = designGeneratePageHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DESIGN_REVERSE_ENGINEER_PAGE) {
    overrides = designReverseEngineerPageHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DESIGN_ASSISTANT) {
    if (agent) {
      agent.enableDelegationTools(task.id, DESIGN_QUEUE_FUNCTIONS);
      taskLogger.info("Design assistant delegation tools enabled");
    }
    overrides = designAssistantHandler(task, taskLogger, agent);
  } else if (task.type === TASK_TYPES.DESIGN_REVERSE_ENGINEER) {
    if (agent) {
      agent.enableDelegationTools(task.id, DESIGN_QUEUE_FUNCTIONS);
      taskLogger.info("Design reverse-engineer delegation tools enabled");
    }
    overrides = designReverseEngineerHandler(task, taskLogger, agent);
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
  }

  return {
    systemPrompt: instructions,
    ...defaults,
    ...overrides,
  };
}
