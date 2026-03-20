import fs from "fs/promises";
import path from "path";
import config from "../../../config.js";
import { SOCKET_EVENTS } from "../../../constants/socket-events.js";
import { emitSocketEvent } from "../../../utils/socket-emitter.js";

/**
 * Handler for analyze-documentation task
 * Defines how documentation analysis works
 * Only overrides what's different from default
 */
export function analyzeDocumentationHandler(task, taskLogger, agent) {
  return {
    initialMessage: `Analyze the domain and generate the complete documentation with Mermaid diagrams as specified in the instructions.`,

    shouldContinue: (response) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✨ Documentation complete!");
        taskLogger.log(`\n✨ [Complete] Documentation finished\n`);
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        agent.addUserMessage(
          "Please use write_file to save the complete documentation.",
        );
        return true;
      }

      return true;
    },

    onComplete: async (_result) => {
      const outputPath = path.join(config.target.directory, task.outputFile);
      const content = await fs.readFile(outputPath, "utf-8");

      if (!content || content.length < 100) {
        return {
          success: false,
          error: `Generated documentation too short (${content?.length || 0} chars)`,
        };
      }

      emitSocketEvent(SOCKET_EVENTS.DOCUMENTATION_UPDATED, {
        domainId: task.params?.domainId,
        content,
      });

      taskLogger.info("✅ Documentation sent via socket", {
        contentLength: content.length,
      });

      return { success: true };
    },
  };
}
