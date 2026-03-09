/**
 * Task Handler Factory
 * Creates task-specific handler configuration based on task type
 */

import { TASK_TYPES } from "../../constants/task-types.js";
import { loadInstructionForTask } from "../../utils/instruction-loader.js";
import { loadDomainSectionChatHistory } from "../../utils/chat-history.js";
import * as logger from "../../utils/logger.js";
import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { editDocumentationHandler } from "./edit-documentation.js";
import { customCodebaseTaskHandler } from "./custom-codebase-task.js";
import { analyzeDocumentationHandler } from "./analyze-documentation.js";
import { analyzeRefactoringAndTestingHandler } from "./analyze-refactoring-and-testing.js";
import { implementTestHandler } from "./implement-test.js";
import { applyRefactoringHandler } from "./apply-refactoring.js";
import { implementFixHandler } from "./implement-fix.js";
import { defaultAnalysisHandler } from "./default-analysis.js";

/**
 * Create task handler configuration for a given task
 * Merges default handler with task-specific overrides
 * @param {Object} task - The task object
 * @param {Object} taskLogger - Task-specific logger instance
 * @param {Object} agent - LLM agent instance
 * @returns {Promise<Object>} Handler configuration with all callbacks and systemPrompt
 */
/**
 * Resolve the file paths this task is allowed to read and write.
 * Centralises all file-access rules in one place instead of scattering
 * setAllowedWritePaths() calls across individual handlers.
 *
 * - Edit tasks  : task.outputFile (a .code-analysis path that must also be readable)
 * - Implement test : task.params.testFile (source file to create/overwrite)
 * - Apply refactoring : task.params.newServiceFile + task.params.targetFile
 * - Everything else : empty list (analysis tasks only write .code-analysis paths,
 *                     which are always allowed by the write gate)
 */
function resolveAllowedWritePaths(task) {
  const EDIT_TASK_TYPES = [
    TASK_TYPES.EDIT_DOCUMENTATION,
    TASK_TYPES.EDIT_DIAGRAMS,
    TASK_TYPES.EDIT_REQUIREMENTS,
    TASK_TYPES.EDIT_BUGS_SECURITY,
    TASK_TYPES.EDIT_REFACTORING_AND_TESTING,
  ];

  if (EDIT_TASK_TYPES.includes(task.type)) {
    // Edit tasks need to read the current content then overwrite it.
    return task.outputFile ? [task.outputFile] : [];
  }

  if (task.type === TASK_TYPES.IMPLEMENT_TEST) {
    return task.params?.testFile ? [task.params.testFile] : [];
  }

  if (task.type === TASK_TYPES.APPLY_REFACTORING) {
    return [task.params?.newServiceFile, task.params?.targetFile].filter(
      Boolean,
    );
  }

  if (task.type === TASK_TYPES.IMPLEMENT_FIX) {
    return task.params?.files?.length ? task.params.files : [];
  }

  return [];
}

export async function createTaskHandler(task, taskLogger, agent) {
  // Configure file-access permissions for this task type (single source of truth).
  if (agent?.fileToolExecutor) {
    const allowedPaths = resolveAllowedWritePaths(task);
    agent.fileToolExecutor.setAllowedWritePaths(allowedPaths);

    // IMPLEMENT_FIX tasks need unrestricted write access — a fix may require
    // creating new files or modifying files beyond the single findingFile.
    // CUSTOM_CODEBASE_TASK needs full read+write access to operate across the entire project.
    if (task.type === TASK_TYPES.IMPLEMENT_FIX) {
      agent.fileToolExecutor.setAllowAnyWrite(true);
      taskLogger.info("🔓 Full project write access granted (IMPLEMENT_FIX)", {
        component: "TaskHandler",
      });
    } else if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
      agent.fileToolExecutor.setAllowAnyWrite(true);
      agent.fileToolExecutor.setAllowAnyRead(true);
      taskLogger.info(
        "🔓 Full project read+write access granted (CUSTOM_CODEBASE_TASK)",
        {
          component: "TaskHandler",
        },
      );
    } else if (allowedPaths.length > 0) {
      taskLogger.info(`🔓 Allowed file paths: ${allowedPaths.join(", ")}`, {
        component: "TaskHandler",
      });
    }
  }

  // Load task-specific instructions
  const instructions = await loadInstructionForTask(task);
  taskLogger.info(`📝 Instructions loaded (${instructions.length} chars)`, {
    component: "TaskHandler",
  });

  // Dump processed instruction to temp folder for debugging
  try {
    const dumpDir = path.join(config.paths.temp, "instructions");
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
  } else if (task.type === TASK_TYPES.CUSTOM_CODEBASE_TASK) {
    overrides = customCodebaseTaskHandler(task, taskLogger, agent);
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
