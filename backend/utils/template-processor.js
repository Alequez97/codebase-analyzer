/**
 * Template Processing Utility
 * Processes Handlebars-like templates in instruction files
 */

/**
 * Process a template string with variables
 * @param {string} template - Template string with {{VARIABLE}} placeholders
 * @param {Object} variables - Key-value pairs to replace in template
 * @returns {string} Processed template
 */
export function processTemplate(template, variables = {}) {
  let result = template;

  // Process simple variables: {{VARIABLE_NAME}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(placeholder, value || "");
  }

  // Process conditional blocks: {{#if VARIABLE}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, varName, content) => {
      const value = variables[varName];
      return value ? content : "";
    },
  );

  // Process array iteration: {{#each ARRAY_NAME}}{{this}}{{/each}}
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, itemTemplate) => {
      const array = variables[arrayName];
      if (!Array.isArray(array) || array.length === 0) {
        return "";
      }

      return array
        .map((item) => {
          // Replace {{this}} with the array item
          return itemTemplate.replace(/\{\{this\}\}/g, item);
        })
        .join("");
    },
  );

  return result;
}

/**
 * Build variables object for requirements analysis template
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildRequirementsTemplateVariables(task) {
  const {
    domainId,
    files,
    userContext,
    includeDocumentation,
    targetDirectory,
  } = task.params;

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
  } catch (err) {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    USER_CONTEXT: userContext || "",
    INCLUDE_DOCUMENTATION: includeDocumentation ? "true" : "",
    OUTPUT_FILE: task.outputFile || "",
  };
}

/**
 * Build variables object for bugs & security analysis template
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildBugsSecurityTemplateVariables(task) {
  const { domainId, files, includeRequirements, targetDirectory } = task.params;

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
  } catch (err) {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    INCLUDE_REQUIREMENTS: includeRequirements ? "true" : "",
    OUTPUT_FILE: task.outputFile || "",
  };
}

/**
 * Build variables object for documentation analysis template
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildDocumentationTemplateVariables(task) {
  const { domainId, files, targetDirectory } = task.params;

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
  } catch (err) {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    OUTPUT_FILE: task.outputFile || "",
  };
}

/**
 * Build variables object for codebase analysis template
 * @param {Object} task - Task object
 * @returns {Object} Variables for template processing
 */
export function buildCodebaseTemplateVariables(task) {
  const { targetDirectory } = task.params;

  return {
    CODEBASE_PATH: targetDirectory,
    OUTPUT_FILE: task.outputFile || "",
  };
}

/**
 * Build template variables based on task type
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildTemplateVariables(task) {
  switch (task.type) {
    case "analyze-requirements":
      return await buildRequirementsTemplateVariables(task);
    case "analyze-bugs-security":
      return await buildBugsSecurityTemplateVariables(task);
    case "analyze-documentation":
      return await buildDocumentationTemplateVariables(task);
    case "analyze-codebase":
      return buildCodebaseTemplateVariables(task);
    default:
      return {
        CODEBASE_PATH: task.params?.targetDirectory || "",
      };
  }
}
