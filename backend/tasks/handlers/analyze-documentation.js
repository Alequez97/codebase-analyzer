import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { PERSISTENCE_FILES } from "../../constants/persistence-files.js";
import { TASK_STATUS } from "../../constants/task-status.js";
import { emitTaskLog } from "../../utils/socket-emitter.js";

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
        taskLogger.info("✨ Documentation complete!", {
          component: "AnalyzeDocumentation",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✨ [Complete] Documentation finished\n`,
        });
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

    postProcess: async (result, task, agent, taskLogger) => {
      const outputPath = path.join(config.target.directory, task.outputFile);
      const documentationMarkdown = await fs.readFile(outputPath, "utf-8");

      if (!documentationMarkdown || documentationMarkdown.length < 100) {
        return {
          success: false,
          error: `Generated documentation too short (${documentationMarkdown?.length || 0} chars)`,
        };
      }

      // Save metadata
      const metadata = agent.getMetadata();
      const documentationDir = path.dirname(outputPath);
      await fs.mkdir(documentationDir, { recursive: true });

      const metadataPath = path.join(
        documentationDir,
        PERSISTENCE_FILES.METADATA_JSON,
      );
      await fs.writeFile(
        metadataPath,
        JSON.stringify(
          {
            status: TASK_STATUS.COMPLETED,
            generatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            iterations: metadata.iterations,
            tokenUsage: {
              inputTokens: metadata.tokenUsage.input,
              outputTokens: metadata.tokenUsage.output,
              totalTokens: metadata.tokenUsage.total,
            },
            agent: "llm-api",
            model: agent.client.model,
            logFile: task.logFile,
          },
          null,
          2,
        ),
        "utf-8",
      );

      taskLogger.info("✅ Documentation and metadata saved", {
        component: "AnalyzeDocumentation",
      });

      return {
        success: true,
        metadata: metadata,
        markdownLength: documentationMarkdown.length,
      };
    },
  };
}
