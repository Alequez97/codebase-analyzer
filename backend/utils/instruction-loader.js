/**
 * Instruction Template Loader
 * Loads and processes instruction templates for LLM prompts
 */

import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import { INSTRUCTION_FILES_NAMES } from "../constants/instruction-files.js";
import {
  processTemplate,
  buildTemplateVariables,
} from "./template-processor.js";

/**
 * Load and process an instruction template
 * @param {string} templateName - Name of template file
 *                                or absolute file path
 * @param {Object} variables - Variables to replace in template
 * @returns {Promise<string>} Processed instruction template
 */
export async function loadInstructionTemplate(templateName, variables = {}) {
  // If it's an absolute path, use it directly, otherwise join with instructions path
  const instructionPath = path.isAbsolute(templateName)
    ? templateName
    : path.join(config.paths.instructions, templateName);

  const instructionTemplate = await fs.readFile(instructionPath, "utf-8");
  return processTemplate(instructionTemplate, variables);
}

/**
 * Load and process instruction template for a task
 * @param {Object} task - Task object with instructionFile path
 * @returns {Promise<string>} Processed instruction template
 */
export async function loadInstructionForTask(task) {
  const instructionPath = path.join(
    config.paths.analyzerRoot,
    task.instructionFile,
  );
  const variables = await buildTemplateVariables(task);
  return loadInstructionTemplate(instructionPath, variables);
}

/**
 * Load and process instruction template for domain documentation task
 * @param {Object} task - Task object
 * @returns {Promise<string>} Processed instruction template
 */
export async function loadDocumentationInstruction(task) {
  const variables = await buildTemplateVariables(task);
  return loadInstructionTemplate(
    INSTRUCTION_FILES_NAMES.ANALYZE_DOMAIN_DOCUMENTATION,
    variables,
  );
}
