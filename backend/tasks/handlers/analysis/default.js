import fs from "fs/promises";
import path from "path";
import config from "../../../config.js";
import { PROGRESS_STAGES } from "@jet-source/agent-core";

/**
 * Default handler for generic analysis tasks
 * Used by: requirements, bugs-security, testing, diagrams, etc.
 * Provides complete handler with all callbacks
 */
export function defaultAnalysisHandler(task, taskLogger, agent) {
  return {
    initialMessage: "Begin the analysis as specified in the instructions.",

    onProgress: (progress) => {
      if (progress.stage) {
        taskLogger.progress(progress.message, { stage: progress.stage });
      }
    },

    onCompaction: (phase, tokensAfter) => {
      if (phase === "start") {
        taskLogger.progress("Compacting chat history...", {
          stage: PROGRESS_STAGES.COMPACTING,
        });
        taskLogger.log(`\n🗜️  [Compacting] Summarizing conversation...\n`);
      } else if (phase === "complete") {
        taskLogger.progress(`Compaction complete. Tokens after: ~${tokensAfter}`, {
          stage: PROGRESS_STAGES.COMPACTING,
        });
        taskLogger.log(`🗜️  [Compacting] Done. Tokens after: ~${tokensAfter}\n`);
      }
    },

    onIteration: (iteration, response) => {
      taskLogger.info(
        `📥 [${iteration}/${agent.maxIterations}] Response - ${response.usage.inputTokens} in / ${response.usage.outputTokens} out (${response.stopReason})`,
      );

      taskLogger.log(`\n📥 [Response] ${response.toolCalls?.length ? `Tool calls: ${response.toolCalls.length}` : "Text response"} (tokens: ${response.usage.inputTokens}/${response.usage.outputTokens})\n`);
    },

    onToolCall: (toolName, args, result, error) => {
      const rawPath = args?.path || args?.file_path || "";
      const filePath =
        rawPath === "." ? "(project root)" : rawPath || "unknown";
      const startLine = args?.start_line;
      const endLine = args?.end_line;

      let toolDescription = toolName;
      if (toolName === "read_file") {
        toolDescription =
          startLine && endLine
            ? `Reading ${filePath} (lines ${startLine}-${endLine})`
            : `Reading ${filePath}`;
      } else if (toolName === "list_directory") {
        toolDescription = `Listing directory ${filePath}`;
      } else if (toolName === "write_file") {
        toolDescription = `Writing ${filePath}`;
      } else if (toolName === "replace_lines") {
        toolDescription = `Editing ${filePath} (lines ${startLine}-${endLine})`;
      } else if (toolName === "search_files") {
        const pattern = args?.pattern || args?.query || "";
        toolDescription = pattern
          ? `Searching for "${pattern}"`
          : "Searching files";
      } else if (toolName === "execute_command") {
        toolDescription = `Running: ${args?.command || "command"}`;
      }

      const logPrefix = error ? "❌" : "📖";
      const logStatus = error ? `failed: ${error}` : `completed`;

      const argsJson = JSON.stringify(args ?? {});
      const argsPreview = argsJson.substring(0, 150);
      taskLogger.log(`  ├─ ${logPrefix} ${toolDescription}\n  │  Args: ${argsPreview}${argsJson.length > 150 ? "..." : ""}\n  └─ ${logStatus}\n`);

      if (!error) {
        taskLogger.progress(toolDescription, { stage: PROGRESS_STAGES.ANALYZING });
      }
    },

    shouldContinue: (response) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed" ||
        response.stopReason === "stop"
      ) {
        taskLogger.info("✅ Analysis complete");
        taskLogger.log(`\n✅ [Complete] Analysis finished\n`);
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting JSON output");
        agent.addUserMessage(
          "You've hit the token limit. Please output the complete JSON with all analysis.",
        );
        return true;
      }

      return true;
    },

    onComplete: async (_result) => {
      const outputPath = path.join(config.target.directory, task.outputFile);

      // Check if output file was created
      let outputExists = false;
      try {
        await fs.access(outputPath);
        outputExists = true;
        taskLogger.info("✅ Output file found");
      } catch {
        outputExists = false;
        taskLogger.warn(
          "⚠️  Output file not found, extracting from conversation",
        );
      }

      // Extract JSON if needed
      if (!outputExists) {
        const jsonContent = agent.extractJSON();
        if (!jsonContent) {
          return {
            success: false,
            error: "LLM did not output valid JSON",
          };
        }

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(
          outputPath,
          JSON.stringify(jsonContent, null, 2),
          "utf-8",
        );
        taskLogger.info("✅ Output file written");
      }

      return {
        success: true,
        outputFile: outputPath,
      };
    },
  };
}
