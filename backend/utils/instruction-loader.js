/**
 * Instruction Template Loader
 * Loads and processes instruction templates for LLM prompts
 */

import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import {
  processTemplate,
  buildTemplateVariables,
} from "./template-processor.js";

/**
 * Load and process an instruction template
 * @param {string} templateName - Name of template file (e.g., "edit-domain-section.md")
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
 * Build system prompt for domain section chat
 * @param {string} domainId - Domain ID
 * @param {string} sectionType - Section type (documentation, requirements, etc.)
 * @param {Object} context - Current section content
 * @returns {Promise<string>} Processed system prompt
 */
export async function buildChatSystemPrompt(domainId, sectionType, context) {
  // Look up domain name from codebase analysis (if available)
  let domainName = domainId; // Fallback to ID

  try {
    const { readCodebaseAnalysis } =
      await import("../persistence/codebase-analysis.js");
    const analysis = await readCodebaseAnalysis();
    const domain = analysis?.domains?.find((d) => d.id === domainId);
    if (domain?.name) {
      domainName = domain.name;
    }
  } catch {
    // Fallback to domainId if analysis not found
  }

  // Build template variables
  const variables = {
    SECTION_TYPE: sectionType,
    DOMAIN_NAME: domainName,
    HAS_CONTENT: context?.content ? true : false,
    CURRENT_CONTENT: context?.content || "",
    IS_DOCUMENTATION: sectionType === "documentation",
    IS_REQUIREMENTS: sectionType === "requirements",
    IS_DIAGRAMS: sectionType === "diagrams",
    IS_BUGS_SECURITY: sectionType === "bugs-security",
    IS_TESTING: sectionType === "testing",
  };

  return loadInstructionTemplate("edit-domain-section.md", variables);
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
  return loadInstructionTemplate("analyze-domain-documentation.md", variables);
}
