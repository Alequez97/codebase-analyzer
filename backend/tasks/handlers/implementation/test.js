import fs from "fs/promises";
import path from "path";
import config from "../../../config.js";
import { PROGRESS_STAGES } from "@jet-source/agent-core";
import { CommandToolExecutor } from "@jet-source/agent-core";
import * as domainTestingPersistence from "../../../persistence/domain-refactoring-and-testing.js";

/**
 * Handler for implement-test task
 * Generates a new test file based on recommendations, then validates it runs without failures
 * Overrides post-processing to verify test file creation
 */
export function implementTestHandler(task, taskLogger, agent) {
  if (agent) {
    agent.enableTools(new CommandToolExecutor(config.target.directory, { timeoutMs: 60_000 }));
    taskLogger.info("🔧 Command execution tools enabled (test runner)");
  }

  return {
    initialMessage:
      "Begin the test generation as specified in the instructions.",

    shouldContinue: (response) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✅ Test generation and validation complete");
        taskLogger.log(`\n✅ [Complete] Test written and validated\n`);
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting test file write");
        agent.addUserMessage(
          `You've hit the token limit. Please write the complete test file to ${task.params.testFile} now using the write_file tool.`,
        );
        return true;
      }

      return true;
    },

    onComplete: async (_result) => {
      const testFilePath = path.join(
        config.target.directory,
        task.params.testFile,
      );

      // Check if test file was created
      let testFileExists = false;
      try {
        await fs.access(testFilePath);
        testFileExists = true;
        taskLogger.info("✅ Test file created successfully", {
          testFile: task.params.testFile,
        });
        taskLogger.log(`\n✅ [Success] Test file created: ${task.params.testFile}\n`);
      } catch {
        testFileExists = false;
        taskLogger.error("❌ Test file was not created", {
          expectedPath: testFilePath,
        });
        taskLogger.log(`\n❌ [Error] Test file was not created at: ${task.params.testFile}\n`);
      }

      if (!testFileExists) {
        return {
          success: false,
          error: `Test file was not created at ${task.params.testFile}. The AI may not have used the write_file tool.`,
        };
      }

      // Verify the file has content
      const stats = await fs.stat(testFilePath);
      if (stats.size === 0) {
        taskLogger.error("❌ Test file is empty", {
          testFile: task.params.testFile,
        });
        return {
          success: false,
          error: `Test file ${task.params.testFile} was created but is empty.`,
        };
      }

      taskLogger.info(`✅ Test file verified (${stats.size} bytes)`);

      if (task.params?.domainId && task.params?.testId) {
        try {
          await domainTestingPersistence.upsertDomainExistingTest(
            task.params.domainId,
            {
              file: task.params.testFile,
              description: task.params.testDescription,
              testType: task.params.testType,
            },
          );
        } catch (error) {
          taskLogger.error("Failed to update existing tests list", {
            error,
            taskId: task.id,
          });
        }

        try {
          await domainTestingPersistence.recordTestingApplyCompleted(
            task.params.domainId,
            {
              taskId: task.id,
              testId: task.params.testId,
              testFile: task.params.testFile,
            },
          );
        } catch (error) {
          taskLogger.error("Failed to record completed testing action", {
            error,
            taskId: task.id,
          });
        }
      }

      taskLogger.progress(`Test file created: ${task.params.testFile}`, {
        stage: PROGRESS_STAGES.COMPLETING,
      });

      return {
        success: true,
        testFile: testFilePath,
        testFileSize: stats.size,
      };
    },
  };
}
