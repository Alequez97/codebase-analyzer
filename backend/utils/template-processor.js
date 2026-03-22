/**
 * Template Processing Utility
 * Processes Handlebars-like templates in instruction files
 */

import { TASK_TYPES } from "../constants/task-types.js";
import { DESIGN_TECHNOLOGIES } from "../constants/design-technologies.js";
import {
  getDomainSectionContentMdRelativePath,
  getDomainSectionContentJsonRelativePath,
} from "../persistence/domain-section-paths.js";
import { getProgressFileRelativePath } from "./task-progress.js";
import {
  getDesignAppManifestRelativePath,
  getDesignHtmlOutputPath,
  getDesignCssOutputPath,
  getDesignJsOutputPath,
  getDesignSystemManifestRelativePath,
} from "../tasks/queue/design/shared.js";

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

  // Process conditional blocks: {{#if VARIABLE}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, varName, content) => {
      const value = variables[varName];

      // Check if there's an {{else}} block
      const elseSplit = content.split(/\{\{else\}\}/);
      if (elseSplit.length === 2) {
        // Has else block: show one or the other
        return value ? elseSplit[0] : elseSplit[1];
      }

      // No else block: show content if truthy, nothing otherwise
      return value ? content : "";
    },
  );

  // Process array iteration: {{#each ARRAY_NAME}}{{this}}{{/each}} or {{this.property}}
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, itemTemplate) => {
      const array = variables[arrayName];
      if (!Array.isArray(array) || array.length === 0) {
        return "";
      }

      return array
        .map((item) => {
          let rendered = itemTemplate;
          if (item !== null && typeof item === "object") {
            // Replace {{this.property}} with item[property]
            rendered = rendered.replace(
              /\{\{this\.(\w+)\}\}/g,
              (_m, prop) => item[prop] ?? "",
            );
          }
          // Replace plain {{this}} with the item (for scalar arrays)
          return rendered.replace(/\{\{this\}\}/g, item);
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
  } catch {
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
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
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
  } catch {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    INCLUDE_REQUIREMENTS: includeRequirements ? "true" : "",
    OUTPUT_FILE: task.outputFile || "",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
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
  } catch {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    OUTPUT_FILE: task.outputFile || "",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build variables object for testing analysis template
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildTestingTemplateVariables(task) {
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
  } catch {
    // Fallback to domainId if analysis not found
  }

  return {
    CODEBASE_PATH: targetDirectory,
    DOMAIN_ID: domainId,
    DOMAIN_NAME: domainName,
    FILES: files || [],
    INCLUDE_REQUIREMENTS: includeRequirements ? "true" : "",
    OUTPUT_FILE: task.outputFile || "",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build variables object for diagrams analysis template
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildDiagramsTemplateVariables(task) {
  const { domainId, files, includeDocumentation, targetDirectory } =
    task.params;

  let documentation = "";

  try {
    // Load documentation if requested
    if (includeDocumentation) {
      const { readDomainDocumentation } =
        await import("../persistence/domain-documentation.js");
      const docData = await readDomainDocumentation(domainId);
      if (docData?.documentation) {
        documentation = docData.documentation;
      }
    }
  } catch {
    // Fallback to empty documentation
  }

  // Format files as a bulleted list
  const filesList =
    files && files.length > 0
      ? files.map((f) => `- ${f}`).join("\n")
      : "(no files specified)";

  return {
    domainId,
    targetDirectory,
    files: filesList,
    includeDocumentation: !!includeDocumentation,
    documentation,
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
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
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

function buildDesignTemplateVariables(task) {
  const designId = task.params?.designId || "";
  const pageId = task.params?.pageId || "";
  const technology =
    task.params?.technology || DESIGN_TECHNOLOGIES.STATIC_HTML;

  return {
    CODEBASE_PATH: task.params?.targetDirectory || "",
    PROMPT: task.params?.prompt || "",
    BRIEF: task.params?.brief || "",
    TECHNOLOGY: technology,
    IS_REACT_VITE:
      technology === DESIGN_TECHNOLOGIES.REACT_VITE ? "true" : "",
    IS_STATIC_HTML:
      technology === DESIGN_TECHNOLOGIES.STATIC_HTML ? "true" : "",
    DESIGN_ID: designId,
    PAGE_ID: pageId,
    PAGE_NAME: task.params?.pageName || "",
    PAGE_ROUTE: task.params?.route || "",
    PAGE_BRIEFING: task.params?.designBriefing || "",
    DESIGN_PATH: task.params?.designPath || "",
    BRIEF_PATH: task.params?.briefPath || "",
    APP_MANIFEST_PATH:
      task.params?.appManifestPath ||
      getDesignAppManifestRelativePath(designId),
    DESIGN_SYSTEM_PATH:
      task.params?.designSystemPath ||
      getDesignSystemManifestRelativePath(designId),
    TOKENS_PATH: task.params?.tokensPath || "",
    HTML_OUTPUT_PATH:
      task.params?.htmlOutputPath ||
      (designId && pageId ? getDesignHtmlOutputPath(designId, pageId) : ""),
    CSS_OUTPUT_PATH:
      task.params?.cssOutputPath ||
      (designId && pageId ? getDesignCssOutputPath(designId, pageId) : ""),
    JS_OUTPUT_PATH:
      task.params?.jsOutputPath ||
      (designId && pageId ? getDesignJsOutputPath(designId, pageId) : ""),
    LEGACY_HTML_OUTPUT_PATH: task.params?.designId
      ? getDesignHtmlOutputPath(task.params.designId)
      : "",
    LEGACY_CSS_OUTPUT_PATH: task.params?.designId
      ? getDesignCssOutputPath(task.params.designId)
      : "",
    LEGACY_JS_OUTPUT_PATH: task.params?.designId
      ? getDesignJsOutputPath(task.params.designId)
      : "",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build variables object for implement-fix task template
 * @param {Object} task - Task object
 * @returns {Object} Variables for template processing
 */
export function buildImplementFixTemplateVariables(task) {
  const { params } = task;

  return {
    CODEBASE_PATH: params.targetDirectory || "",
    DOMAIN_ID: params.domainId || "",
    FILES: params.files || [],
    FINDING_ID: params.findingId || "",
    FINDING_TYPE: params.findingType || "",
    FINDING_SEVERITY: params.findingSeverity || "",
    FINDING_TITLE: params.findingTitle || "",
    FINDING_DESCRIPTION: params.findingDescription || "",
    FINDING_IMPACT: params.findingImpact || "",
    FINDING_RECOMMENDATION: params.findingRecommendation || "",
    FINDING_FIX_EXAMPLE: params.findingFixExample || "",
    FINDING_LOCATION: params.findingLocation,
    FINDING_FILE: params.findingFile || "",
    FINDING_LINE: params.findingLine || "",
    FINDING_SNIPPET: params.findingSnippet || "",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build variables object for apply-refactoring task template
 * @param {Object} task - Task object
 * @returns {Object} Variables for template processing
 */
export function buildApplyRefactoringTemplateVariables(task) {
  const { params } = task;
  const extractedFunctions = (params.extractedFunctions || []).map((fn) => ({
    name: fn.name || "",
    purpose: fn.purpose || "",
    params: Array.isArray(fn.params) ? fn.params.join(", ") : fn.params || "",
    returns: fn.returns || "",
  }));

  return {
    CODEBASE_PATH: params.targetDirectory || "",
    DOMAIN_ID: params.domainId || "",
    REFACTORING_ID: params.refactoringId || "",
    CATEGORY: params.category || "",
    PRIORITY: params.priority || "",
    TITLE: params.title || "",
    TARGET_FILE: params.targetFile || "",
    TARGET_FUNCTION: params.targetFunction || "",
    START_LINE: params.startLine || "",
    END_LINE: params.endLine || "",
    ISSUE: params.issue || "",
    NEW_SERVICE_FILE: params.newServiceFile || "",
    EXTRACTED_FUNCTIONS: extractedFunctions,
    BENEFITS: params.benefits || [],
    UNBLOCKS: params.unblocks || [],
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build variables object for implement-test task template
 * @param {Object} task - Task object
 * @returns {Object} Variables for template processing
 */
export function buildImplementTestTemplateVariables(task) {
  const { params } = task;
  const scenarios = params.scenarios || [];
  const scenarioTitles = scenarios
    .map((item) => item?.scenario)
    .filter((item) => typeof item === "string" && item.trim().length > 0);

  const testType = params.testType || "";

  return {
    CODEBASE_PATH: params.targetDirectory || "",
    DOMAIN_ID: params.domainId || "",
    TEST_ID: params.testId || "",
    TEST_FILE: params.testFile || "",
    TEST_TYPE: testType,
    IS_UNIT: testType === "unit" ? "true" : "",
    IS_INTEGRATION: testType === "integration" ? "true" : "",
    IS_E2E: testType === "e2e" ? "true" : "",
    IS_E2E_WITH_AUTH:
      testType === "e2e" && !!params.e2eAuthUsername ? "true" : "",
    E2E_BASE_URL: params.e2eBaseUrl || "http://localhost:5173",
    E2E_AUTH_USERNAME: params.e2eAuthUsername || "",
    E2E_AUTH_PASSWORD: params.e2eAuthPassword || "",
    TEST_DESCRIPTION: params.testDescription || "",
    TEST_SCENARIOS: scenarioTitles,
    TEST_SCENARIOS_JSON: JSON.stringify(scenarios, null, 2),
    SOURCE_FILE: params.sourceFile || "",
    DOMAIN_FILES: params.domainFiles || [],
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build template variables for edit tasks (AI chat)
 * @param {Object} task - Edit task object
 * @returns {Object} Variables for template processing
 */
export async function buildEditTemplateVariables(task) {
  const { domainId, sectionType } = task.params;

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

  // Pick the right relative-path helper based on whether this section outputs JSON or markdown.
  const isJsonSection = task.outputFile?.endsWith(".json") ?? false;
  const contentFile = isJsonSection
    ? getDomainSectionContentJsonRelativePath(domainId, sectionType)
    : getDomainSectionContentMdRelativePath(domainId, sectionType);

  return {
    SECTION_TYPE: sectionType,
    DOMAIN_NAME: domainName,
    CONTENT_FILE_PATH: task.outputFile ?? contentFile,
    IS_DOCUMENTATION: sectionType === "documentation",
    IS_REQUIREMENTS: sectionType === "requirements",
    IS_DIAGRAMS: sectionType === "diagrams",
    IS_BUGS_SECURITY: sectionType === "bugs-security",
    IS_TESTING: sectionType === "testing",
    PROGRESS_FILE: getProgressFileRelativePath(task.id),
  };
}

/**
 * Build template variables based on task type
 * @param {Object} task - Task object
 * @returns {Promise<Object>} Variables for template processing
 */
export async function buildTemplateVariables(task) {
  // Handle edit tasks
  if (task.type.startsWith("edit-")) {
    return await buildEditTemplateVariables(task);
  }

  switch (task.type) {
    case TASK_TYPES.REQUIREMENTS:
      return await buildRequirementsTemplateVariables(task);
    case TASK_TYPES.BUGS_SECURITY:
      return await buildBugsSecurityTemplateVariables(task);
    case TASK_TYPES.DOCUMENTATION:
      return await buildDocumentationTemplateVariables(task);
    case TASK_TYPES.REFACTORING_AND_TESTING:
      return await buildTestingTemplateVariables(task);
    case TASK_TYPES.DIAGRAMS:
      return await buildDiagramsTemplateVariables(task);
    case TASK_TYPES.CODEBASE_ANALYSIS:
      return buildCodebaseTemplateVariables(task);
    case TASK_TYPES.IMPLEMENT_FIX:
      return buildImplementFixTemplateVariables(task);
    case TASK_TYPES.IMPLEMENT_TEST:
      return buildImplementTestTemplateVariables(task);
    case TASK_TYPES.APPLY_REFACTORING:
      return buildApplyRefactoringTemplateVariables(task);
    case TASK_TYPES.CUSTOM_CODEBASE_TASK:
      return {
        CODEBASE_PATH: task.params?.targetDirectory || "",
        PROGRESS_FILE: getProgressFileRelativePath(task.id),
      };
    case TASK_TYPES.DESIGN_BRAINSTORM:
    case TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE:
    case TASK_TYPES.DESIGN_GENERATE_PAGE:
      return buildDesignTemplateVariables(task);
    case TASK_TYPES.REVIEW_CHANGES:
      return {
        CODEBASE_PATH: task.params?.targetDirectory || "",
        PROGRESS_FILE: getProgressFileRelativePath(task.id),
      };
    default:
      return {
        CODEBASE_PATH: task.params?.targetDirectory || "",
      };
  }
}
