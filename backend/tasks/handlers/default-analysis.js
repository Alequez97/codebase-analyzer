import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import { emitTaskLog, emitTaskProgress } from "../../utils/socket-emitter.js";

/**
 * Default handler for generic analysis tasks
 * Used by: requirements, bugs-security, testing, diagrams, etc.
 * Provides complete handler with all callbacks
 */
export function defaultAnalysisHandler(task, taskLogger, agent) {
  return {
    initialMessage: "Begin the analysis as specified in the instructions.",

    onProgress: (progress) => {
      if (progress.iteration) {
        taskLogger.info(
          `🔄 Iteration ${progress.iteration}/${agent.maxIterations}`,
          { component: "LLM-API" },
        );
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n${"-".repeat(80)}\n[Iteration ${progress.iteration}/${agent.maxIterations}] ${progress.message || "Processing"}\n${"-".repeat(80)}\n`,
        });
      }

      if (
        progress.compacting ||
        progress.stage === PROGRESS_STAGES.COMPACTING
      ) {
        taskLogger.info("🗜️  Compacting chat history...", {
          component: "LLM-API",
        });
        emitTaskProgress(
          task,
          PROGRESS_STAGES.COMPACTING,
          "Compacting chat history...",
        );
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n🗜️  [Compacting] Summarizing conversation...\n`,
        });
      } else if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ⚡ ${progress.message}`, { component: "LLM-API" });
        emitTaskProgress(task, PROGRESS_STAGES.ANALYZING, progress.message);
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `  ⚡ ${progress.message}\n`,
        });
      } else if (progress.stage) {
        emitTaskProgress(task, progress.stage, progress.message);
      }
    },

    onIteration: (iteration, response) => {
      taskLogger.info(
        `📥 Response - ${response.usage.inputTokens} in / ${response.usage.outputTokens} out (${response.stopReason})`,
        { component: "LLM-API" },
      );

      emitTaskLog(task, {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stdout",
        log: `\n📥 [Response] ${response.toolCalls?.length ? `Tool calls: ${response.toolCalls.length}` : "Text response"} (tokens: ${response.usage.inputTokens}/${response.usage.outputTokens})\n`,
      });
    },

    onToolCall: (toolName, args, result, error) => {
      const filePath = args?.path || args?.file_path || "unknown";
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
      }

      const logPrefix = error ? "❌" : "📖";
      const logStatus = error ? `failed: ${error}` : `completed`;

      taskLogger.info(`  ${logPrefix} ${toolDescription}`, {
        component: "LLM-API",
      });

      const argsJson = JSON.stringify(args ?? {});
      const argsPreview = argsJson.substring(0, 150);
      emitTaskLog(task, {
        taskId: task.id,
        domainId: task.params?.domainId,
        type: task.type,
        stream: "stdout",
        log: `  ├─ ${logPrefix} ${toolDescription}\n  │  Args: ${argsPreview}${argsJson.length > 150 ? "..." : ""}\n  └─ ${logStatus}\n`,
      });

      if (!error) {
        emitTaskProgress(task, PROGRESS_STAGES.ANALYZING, toolDescription);
      }
    },

    shouldContinue: (response, iteration) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✅ Analysis complete", {
          component: "Analysis",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Complete] Analysis finished\n`,
        });
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting JSON output", {
          component: "Analysis",
        });
        agent.addUserMessage(
          "You've hit the token limit. Please output the complete JSON with all analysis.",
        );
        return true;
      }

      return true;
    },

    postProcess: async (result, task, agent, taskLogger) => {
      const outputPath = path.join(config.target.directory, task.outputFile);

      // Check if output file was created
      let outputExists = false;
      try {
        await fs.access(outputPath);
        outputExists = true;
        taskLogger.info("✅ Output file found", {
          component: "Analysis",
        });
      } catch {
        outputExists = false;
        taskLogger.warn(
          "⚠️  Output file not found, extracting from conversation",
          {
            component: "Analysis",
          },
        );
      }

      // Extract JSON if needed
      if (!outputExists) {
        const jsonContent = agent.extractJSON();
        if (!jsonContent) {
          throw new Error("LLM did not output valid JSON");
        }

        await fs.writeFile(
          outputPath,
          JSON.stringify(jsonContent, null, 2),
          "utf-8",
        );
        taskLogger.info("✅ Output file written", {
          component: "Analysis",
        });
      }

      if (task.type === TASK_TYPES.TESTING) {
        const outputContent = await fs.readFile(outputPath, "utf-8");

        let testingJson;
        try {
          testingJson = JSON.parse(outputContent);
        } catch {
          throw new Error("Testing analysis output is not valid JSON");
        }

        if (testingJson?.domainId !== task.params?.domainId) {
          throw new Error(
            `Testing analysis domain mismatch: expected '${task.params?.domainId}', got '${testingJson?.domainId || "missing"}'`,
          );
        }

        const missingTests = testingJson?.missingTests;
        const hasGroupedMissingTests =
          missingTests &&
          typeof missingTests === "object" &&
          !Array.isArray(missingTests) &&
          Array.isArray(missingTests.unit) &&
          Array.isArray(missingTests.integration) &&
          Array.isArray(missingTests.e2e);

        if (!hasGroupedMissingTests) {
          throw new Error(
            "Testing analysis schema invalid: missingTests must be an object with unit/integration/e2e arrays",
          );
        }

        if (!Array.isArray(testingJson?.existingTests)) {
          throw new Error(
            "Testing analysis schema invalid: existingTests must be an array",
          );
        }

        for (const [
          index,
          existingTest,
        ] of testingJson.existingTests.entries()) {
          if (
            !existingTest?.file ||
            !existingTest?.description ||
            !existingTest?.testType
          ) {
            throw new Error(
              `Testing analysis schema invalid: existingTests[${index}] must include file, description, and testType`,
            );
          }
        }

        const allMissingTests = [
          ...missingTests.unit,
          ...missingTests.integration,
          ...missingTests.e2e,
        ];

        for (const [index, missingTest] of allMissingTests.entries()) {
          const hasRequiredFields =
            missingTest?.id &&
            missingTest?.description &&
            missingTest?.priority &&
            missingTest?.category &&
            missingTest?.suggestedTestFile &&
            missingTest?.relatedRequirement &&
            missingTest?.reason &&
            Array.isArray(missingTest?.scenarios) &&
            missingTest.scenarios.length > 0;

          if (!hasRequiredFields) {
            throw new Error(
              `Testing analysis schema invalid: missing test at index ${index} has missing required fields or empty scenarios`,
            );
          }

          for (const [
            scenarioIndex,
            scenario,
          ] of missingTest.scenarios.entries()) {
            if (
              !scenario?.scenario ||
              !Array.isArray(scenario?.checks) ||
              scenario.checks.length === 0
            ) {
              throw new Error(
                `Testing analysis schema invalid: scenarios[${scenarioIndex}] for ${missingTest.id} must include scenario and non-empty checks array`,
              );
            }

            for (const [checkIndex, checkItem] of scenario.checks.entries()) {
              const hasCaseShape =
                Array.isArray(checkItem?.input) &&
                checkItem.input.length > 0 &&
                typeof checkItem?.expectedOutput === "string" &&
                checkItem.expectedOutput.length > 0 &&
                typeof checkItem?.assertionType === "string" &&
                checkItem.assertionType.length > 0;

              if (!hasCaseShape) {
                throw new Error(
                  `Testing analysis schema invalid: check ${checkIndex} in ${missingTest.id}/${scenario.scenario} must include input[], expectedOutput, assertionType`,
                );
              }
            }
          }
        }
      }

      return { outputFile: outputPath };
    },
  };
}
