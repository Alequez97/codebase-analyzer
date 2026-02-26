import config from "../../config.js";
import * as tasksPersistence from "../../persistence/tasks.js";
import { getAgentConfig } from "../../agents/index.js";
import { INSTRUCTION_FILES_PATHS } from "../../constants/instruction-files.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { generateTaskId } from "../utils.js";
import * as logger from "../../utils/logger.js";

/**
 * Create a task to apply a bug or security fix
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.finding - The finding object to fix
 * @param {Object} options - Task options
 * @param {boolean} options.executeNow - Whether to execute immediately
 * @returns {Promise<Object>} The created task
 */
export async function createApplyFixTask(
  { domainId, finding },
  { executeNow = false } = {},
) {
  const agentConfigResult = getAgentConfig(TASK_TYPES.APPLY_FIX);
  if (!agentConfigResult.success) {
    return agentConfigResult;
  }

  const agentConfig = agentConfigResult.agentConfig;

  // Determine which file(s) to include
  const files = [];
  const sourceText = typeof finding.source === "string" ? finding.source : "";
  const sourceFirstSegment = sourceText.split(",")[0]?.trim() || "";
  const sourcePathMatch = sourceFirstSegment.match(/^(.+?):\d/);
  const sourceFile = sourcePathMatch
    ? sourcePathMatch[1].trim()
    : sourceFirstSegment;
  const sourceLineMatch = sourceFirstSegment.match(/:(\d+)/);
  const sourceLine = sourceLineMatch ? sourceLineMatch[1] : "";

  const findingFile = finding.location?.file || sourceFile || "";
  const findingLine = finding.location?.line || sourceLine || "";

  if (findingFile) {
    files.push(findingFile);
  }

  // Build parameters for template replacement
  const params = {
    domainId,
    targetDirectory: config.target.directory,
    files,
    findingId: finding.id,
    findingType: finding.type || "bug",
    findingSeverity: finding.severity || "unknown",
    findingTitle: finding.title || "Untitled Finding",
    findingDescription: finding.description || "",
    findingImpact: finding.impact || "",
    findingRecommendation: finding.recommendation || "",
    findingFixExample: finding.fixExample || finding.suggestedFix || "",
    findingLocation: finding.location || null,
    findingFile,
    findingLine,
    findingSnippet: finding.location?.snippet || "",
  };

  const task = {
    id: generateTaskId(TASK_TYPES.APPLY_FIX),
    type: TASK_TYPES.APPLY_FIX,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    instructionFile: INSTRUCTION_FILES_PATHS.APPLY_FINDING_FIX,
    outputFile: null, // No JSON output needed - agent modifies source files directly
    generateMetadata: true,
  };

  await tasksPersistence.writeTask(task);

  if (executeNow) {
    // Import dynamically to avoid circular dependency
    const { executeTask } = await import("../../orchestrators/task.js");
    executeTask(task.id).catch((err) => {
      logger.error(`Failed to execute task ${task.id}`, {
        error: err,
        component: "TaskFactory",
      });
    });
  }

  return task;
}
