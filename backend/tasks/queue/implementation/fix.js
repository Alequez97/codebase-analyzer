import config from "../../../config.js";
import * as tasksPersistence from "../../../persistence/task-queue-adapter.js";

import { SYSTEM_INSTRUCTION_PATHS } from "../../../constants/system-instructions.js";
import { TASK_TYPES } from "../../../constants/task-types.js";
import { TASK_STATUS } from "../../../constants/task-status.js";
import { generateTaskId, getTaskAgentConfig } from "../../utils.js";
import {
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "../../../utils/task-progress.js";
import * as logger from "../../../utils/logger.js";

/**
 * Create a task to implement (fix) a bug or security finding using the LLM API
 * @param {Object} params - Task parameters
 * @param {string} params.domainId - The domain ID
 * @param {Object} params.finding - The finding object to fix
 * @returns {Promise<Object>} The created task
 */
export async function queueImplementFixTask({ domainId, finding }) {
  const agentConfigResult = getTaskAgentConfig(TASK_TYPES.IMPLEMENT_FIX);
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

  const taskId = generateTaskId(TASK_TYPES.IMPLEMENT_FIX);
  const task = {
    id: taskId,
    type: TASK_TYPES.IMPLEMENT_FIX,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params,
    agentConfig,
    systemInstructionFile: SYSTEM_INSTRUCTION_PATHS.IMPLEMENT_FINDING_FIX,
    outputFile: null, // No JSON output needed - agent modifies source files directly
    progressFile: getProgressFileRelativePath(taskId),
  };

  await ensureProgressDirectory(taskId);
  await tasksPersistence.enqueueTask(task);

  return task;
}
