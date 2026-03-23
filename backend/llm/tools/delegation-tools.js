import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import * as logger from "../../utils/logger.js";
import { DESIGN_TECHNOLOGIES } from "../../constants/design-technologies.js";

/**
 * Task types that can be targeted by delegate_task.
 */
export const DELEGATABLE_TASK_TYPES = [
  "edit-documentation",
  "edit-diagrams",
  "edit-requirements",
  "edit-bugs-security",
  "edit-refactoring-and-testing",
  "design-plan-and-style-system-generate",
  "design-generate-page",
];

/**
 * Maps a delegatable task type to its section type string,
 * which is used when writing the synthetic chat-history file.
 */
const SECTION_TYPE_BY_TASK_TYPE = {
  "edit-documentation": "documentation",
  "edit-diagrams": "diagrams",
  "edit-requirements": "requirements",
  "edit-bugs-security": "bugs-security",
  "edit-refactoring-and-testing": "refactoring-and-testing",
};

const DIRECT_DELEGATION_TASK_TYPES = new Set([
  "design-plan-and-style-system-generate",
  "design-generate-page",
]);

export const DELEGATION_TOOLS = [
  {
    name: "delegate_task",
    description: `Queue a follow-up task for a specialized agent based on your findings.

How to use:
  1. Use write_file to create a delegation request file under .code-analysis/temp/delegation-requests/ describing exactly what the delegated agent should do and why (include relevant context from your analysis).
  2. Call delegate_task with the path to that file, the target task type, and any required params.
  3. When this returns success: true, the task is queued successfully — move on immediately. Do NOT check folders, search for files, or verify. Delegated tasks run asynchronously.

The delegation request file content becomes the user message (or briefing) for the delegated agent. Treat it like a detailed chat message.`,
    parameters: {
      type: {
        type: "string",
        enum: DELEGATABLE_TASK_TYPES,
        description: "The type of specialized agent to delegate to.",
      },
      requestFile: {
        type: "string",
        description:
          "Relative path (from project root) to the delegation request file you wrote. Must be under .code-analysis/temp/. The file content becomes the delegated agent's user message.",
      },
      params: {
        type: "object",
        description:
          "Additional parameters passed to the queue function. Edit tasks require `domainId`. Design plan delegation requires `designId` and should include `technology`; `prompt`/`brief` are optional (request file content is used as fallback prompt). Design page delegation requires `designId`, `pageId`, `pageName`, and optionally `route` and `technology`.",
      },
    },
    required: ["type", "requestFile"],
  },
];

export class DelegationToolExecutor {
  /**
   * @param {string} projectRoot
   * @param {string} parentTaskId
   * @param {Object<string, Function>} queueFunctions
   */
  constructor(projectRoot, parentTaskId, queueFunctions) {
    this.projectRoot = projectRoot;
    this.parentTaskId = parentTaskId;
    this.queueFunctions = queueFunctions;
  }

  /**
   * Get human-readable description for progress display
   * @param {string} _toolName - Tool name (ignored, we only handle one tool)
   * @param {Object} args - Tool arguments
   * @returns {string} Human-readable description
   */
  getToolDescription(_toolName, args) {
    const delType = args?.type || "task";
    const delName = args?.params?.competitorName || args?.params?.domainId;
    return delName
      ? `Delegating ${delType}: ${delName}`
      : `Delegating ${delType}`;
  }

  /**
   * Execute delegate_task tool
   * @param {string} _toolName - Tool name (ignored, we only handle delegate_task)
   * @param {Object} args - { type, params }
   * @returns {Promise<Object>} { taskId, status, message }
   */
  async execute(_toolName, args) {
    return this._delegateTask(args);
  }

  async _delegateTask({ type, domainId, requestFile, params = {} } = {}) {
    if (!type || !requestFile) {
      return {
        success: false,
        error: { message: "type and requestFile are required" },
      };
    }

    if (!DELEGATABLE_TASK_TYPES.includes(type)) {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_TYPE",
          message: `Unsupported delegation type: ${type}. Must be one of: ${DELEGATABLE_TASK_TYPES.join(", ")}`,
        },
      };
    }

    const queueFn = this.queueFunctions[type];
    if (!queueFn) {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_TYPE",
          message: `No queue function registered for delegation type: ${type}`,
        },
      };
    }

    const normalized = path.normalize(requestFile).replace(/\\/g, "/");
    if (!normalized.startsWith(".code-analysis/temp/")) {
      return {
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message:
            "requestFile must be under .code-analysis/temp/ (e.g. .code-analysis/temp/delegation-requests/my-request.md)",
        },
      };
    }

    const absPath = path.join(this.projectRoot, requestFile);
    let requestContent;
    try {
      requestContent = await fs.readFile(absPath, "utf-8");
    } catch {
      return {
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: `Could not read delegation request file: ${requestFile}`,
        },
      };
    }

    if (!requestContent.trim()) {
      return {
        success: false,
        error: {
          code: "EMPTY_INSTRUCTION",
          message: `Delegation request file is empty: ${requestFile}`,
        },
      };
    }

    fs.unlink(absPath).catch(() => {});

    const mergedParams = { ...(domainId ? { domainId } : {}), ...params };

    if (DIRECT_DELEGATION_TASK_TYPES.has(type)) {
      return this._delegateDirectTask({
        type,
        queueFn,
        requestContent,
        mergedParams,
      });
    }

    const effectiveDomainId = mergedParams.domainId;
    if (!effectiveDomainId) {
      return {
        success: false,
        error: {
          message:
            "domainId is required for edit task delegation (pass via params.domainId or top-level domainId)",
        },
      };
    }

    const sectionType = SECTION_TYPE_BY_TASK_TYPE[type];
    const syntheticChatId = `delegated-${this.parentTaskId}-${randomBytes(3).toString("hex")}`;

    await this._writeSyntheticChatHistory({
      domainId: effectiveDomainId,
      sectionType,
      chatId: syntheticChatId,
      content: requestContent,
    });

    logger.info("Delegating task", {
      component: "DelegationTools",
      type,
      domainId: effectiveDomainId,
      parentTaskId: this.parentTaskId,
      syntheticChatId,
    });

    const task = await queueFn({
      domainId: effectiveDomainId,
      chatId: syntheticChatId,
      delegatedByTaskId: this.parentTaskId,
    });

    if (task?.success === false) {
      return {
        success: false,
        error: {
          message: task.error || "Failed to queue delegated task",
          code: task.code,
        },
      };
    }

    logger.info("Delegated task queued", {
      component: "DelegationTools",
      taskId: task.id,
      type: task.type,
      domainId: effectiveDomainId,
    });

    return {
      success: true,
      data: {
        taskId: task.id,
        type: task.type,
        domainId: effectiveDomainId,
        message: `Queued ${type} task for domain '${effectiveDomainId}' (taskId: ${task.id})`,
      },
    };
  }

  async _delegateDirectTask({ type, queueFn, requestContent, mergedParams }) {
    if (type === "design-plan-and-style-system-generate") {
      const {
        designId,
        prompt = requestContent,
        brief = "",
        technology = DESIGN_TECHNOLOGIES.STATIC_HTML,
      } = mergedParams;

      if (!designId) {
        return {
          success: false,
          error: {
            message:
              "designId is required for design plan delegation (prevents accidental prompt-slug design IDs)",
          },
        };
      }

      if (!prompt?.trim()) {
        return {
          success: false,
          error: {
            message:
              "prompt is required for design plan delegation (or provide content in requestFile)",
          },
        };
      }

      return this._queueDirectDelegation({
        type,
        queueFn,
        mergedParams,
        extraPayload: {
          designId,
          prompt: prompt.trim(),
          brief: typeof brief === "string" ? brief : "",
          technology,
        },
        successMeta: {
          designId,
          technology,
        },
        logMeta: {
          designId,
          technology,
        },
        errorMessage: "Failed to queue delegated design planning task",
      });
    }

    if (type === "design-generate-page") {
      const {
        designId,
        pageId,
        pageName,
        route = "",
        technology = DESIGN_TECHNOLOGIES.STATIC_HTML,
      } = mergedParams;
      if (!designId || !pageId || !pageName) {
        return {
          success: false,
          error: {
            message:
              "designId, pageId, and pageName are required for design page delegation",
          },
        };
      }

      return this._queueDirectDelegation({
        type,
        queueFn,
        mergedParams,
        extraPayload: {
          designId,
          pageId,
          pageName,
          route,
          technology,
          designBriefing: mergedParams.designBriefing ?? requestContent,
        },
        successMeta: {
          designId,
          pageId,
        },
        logMeta: {
          designId,
          pageId,
        },
        errorMessage: "Failed to queue delegated design page task",
      });
    }

    return {
      success: false,
      error: {
        message: `Unsupported direct delegation type: ${type}`,
      },
    };
  }

  async _queueDirectDelegation({
    type,
    queueFn,
    mergedParams,
    extraPayload = {},
    successMeta = {},
    logMeta = {},
    errorMessage,
  }) {
    logger.info("Delegating direct task", {
      component: "DelegationTools",
      type,
      parentTaskId: this.parentTaskId,
      ...logMeta,
    });

    const task = await queueFn({
      ...mergedParams,
      ...extraPayload,
      delegatedByTaskId: this.parentTaskId,
    });

    if (task?.success === false) {
      return {
        success: false,
        error: {
          message: task.error || errorMessage,
          code: task.code,
        },
      };
    }

    logger.info("Delegated direct task queued", {
      component: "DelegationTools",
      taskId: task.id,
      type: task.type,
      ...logMeta,
    });

    const summaryKey = mergedParams.designId || mergedParams.domainId;

    return {
      success: true,
      data: {
        taskId: task.id,
        type: task.type,
        ...successMeta,
        message: `Queued ${type} task for '${summaryKey}' (taskId: ${task.id})`,
      },
    };
  }

  async _writeSyntheticChatHistory({ domainId, sectionType, chatId, content }) {
    const chatHistoryDir = path.join(
      this.projectRoot,
      ".code-analysis",
      "tasks",
      "chat-history",
    );
    await fs.mkdir(chatHistoryDir, { recursive: true });

    const fileName = `domain-${domainId}-${sectionType}-${chatId}.json`;
    const filePath = path.join(chatHistoryDir, fileName);

    const now = new Date().toISOString();
    const history = {
      domainId,
      sectionType,
      chatId,
      delegated: true,
      delegatedByTaskId: this.parentTaskId,
      createdAt: now,
      lastMessageAt: now,
      messages: [
        {
          id: 1,
          role: "user",
          content,
          timestamp: now,
        },
      ],
    };

    await fs.writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");
  }
}
