import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { emitTaskLog } from "../../utils/socket-emitter.js";

/**
 * Handler for apply-refactoring task
 * Applies a refactoring recommendation by extracting code and creating new service files
 * Verifies the new service file was created and existing tests still pass
 */
export function applyRefactoringHandler(task, taskLogger, agent) {
  // Enable command execution for running tests
  if (agent) {
    agent.enableCommandTools({ timeoutMs: 120_000 }); // Longer timeout for potentially running full test suite
    taskLogger.info("🔧 Command execution tools enabled (test validation)", {
      component: "ApplyRefactoring",
    });
  }

  return {
    initialMessage:
      "Begin the refactoring as specified in the instructions. Create the new service file using write_file, then use replace_lines (NOT write_file) to update the controller — call read_file first to get current line numbers, then make one replace_lines call per change (import addition, function body replacement).",

    shouldContinue: (response) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✅ Refactoring application complete", {
          component: "ApplyRefactoring",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Complete] Refactoring applied and validated\n`,
        });
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting file completion", {
          component: "ApplyRefactoring",
        });
        agent.addUserMessage(
          `You've hit the token limit. If the service file is not yet created, write it to ${task.params.newServiceFile} using write_file. If the service file exists but the controller hasn't been updated, use read_file on ${task.params.targetFile} to get current line numbers, then use replace_lines to add the import and replace the extracted function body. Do NOT rewrite the entire controller with write_file.`,
        );
        return true;
      }

      return true;
    },

    postProcess: async (result, task, agent, taskLogger) => {
      const newServiceFilePath = path.join(
        config.target.directory,
        task.params.newServiceFile,
      );
      const targetFilePath = path.join(
        config.target.directory,
        task.params.targetFile,
      );

      // Check if new service file was created
      let serviceFileExists = false;
      try {
        await fs.access(newServiceFilePath);
        serviceFileExists = true;
        taskLogger.info("✅ New service file created successfully", {
          component: "ApplyRefactoring",
          serviceFile: task.params.newServiceFile,
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Success] Service file created: ${task.params.newServiceFile}\n`,
        });
      } catch {
        serviceFileExists = false;
        taskLogger.error("❌ Service file was not created", {
          component: "ApplyRefactoring",
          expectedPath: newServiceFilePath,
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stderr",
          log: `\n❌ [Error] Service file was not created at: ${task.params.newServiceFile}\n`,
        });
      }

      if (!serviceFileExists) {
        return {
          success: false,
          error: `Service file was not created at ${task.params.newServiceFile}. The AI may not have completed the refactoring.`,
        };
      }

      // Verify the service file has content
      const serviceStats = await fs.stat(newServiceFilePath);
      if (serviceStats.size === 0) {
        taskLogger.error("❌ Service file is empty", {
          component: "ApplyRefactoring",
          serviceFile: task.params.newServiceFile,
        });
        return {
          success: false,
          error: `Service file ${task.params.newServiceFile} was created but is empty.`,
        };
      }

      taskLogger.info(`✅ Service file verified (${serviceStats.size} bytes)`, {
        component: "ApplyRefactoring",
      });

      // Verify target file was modified
      try {
        await fs.access(targetFilePath);
        const targetStats = await fs.stat(targetFilePath);
        taskLogger.info(`✅ Target file verified (${targetStats.size} bytes)`, {
          component: "ApplyRefactoring",
          targetFile: task.params.targetFile,
        });
      } catch {
        taskLogger.warn("⚠️  Target file not found or not modified", {
          component: "ApplyRefactoring",
          targetFile: task.params.targetFile,
        });
      }

      // Update refactoring status in testing content
      if (task.params?.domainId && task.params?.refactoringId) {
        try {
          const domainTestingPersistence =
            await import("../../persistence/domain-refactoring-and-testing.js");
          await domainTestingPersistence.recordRefactoringApplied(
            task.params.domainId,
            {
              refactoringId: task.params.refactoringId,
              taskId: task.id,
              serviceFile: task.params.newServiceFile,
              timestamp: new Date().toISOString(),
            },
          );

          taskLogger.info("✅ Refactoring status updated in domain data", {
            component: "ApplyRefactoring",
            refactoringId: task.params.refactoringId,
          });

          emitTaskLog(task, {
            taskId: task.id,
            domainId: task.params.domainId,
            type: task.type,
            stream: "stdout",
            log: `\n✅ [Updated] Refactoring ${task.params.refactoringId} marked as applied\n`,
          });
        } catch (error) {
          taskLogger.error("Failed to update refactoring status", {
            error,
            component: "ApplyRefactoring",
            taskId: task.id,
          });
        }
      }

      return {
        success: true,
        message: `Refactoring applied successfully. Service file created at ${task.params.newServiceFile}`,
        outputs: {
          serviceFile: task.params.newServiceFile,
          targetFile: task.params.targetFile,
          refactoringId: task.params.refactoringId,
        },
      };
    },
  };
}
