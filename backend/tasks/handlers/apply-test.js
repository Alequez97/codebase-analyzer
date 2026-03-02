import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { PROGRESS_STAGES } from "../../constants/progress-stages.js";
import * as domainTestingPersistence from "../../persistence/domain-testing.js";
import { emitTaskLog, emitTaskProgress } from "../../utils/socket-emitter.js";

/**
 * Handler for apply-test task
 * Generates a new test file based on recommendations
 * Overrides post-processing to verify test file creation
 */
export function applyTestHandler(task, taskLogger, agent) {
  if (agent?.fileToolExecutor && task?.params?.testFile) {
    agent.fileToolExecutor.setAllowedWritePaths([task.params.testFile]);
    taskLogger.info("🔓 Enabled direct test file write path", {
      component: "ApplyTest",
      testFile: task.params.testFile,
    });
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
        taskLogger.info("✅ Test generation complete", {
          component: "ApplyTest",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Complete] Test generation finished\n`,
        });
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting test file write", {
          component: "ApplyTest",
        });
        agent.addUserMessage(
          `You've hit the token limit. Please write the complete test file to ${task.params.testFile} now using the write_file tool.`,
        );
        return true;
      }

      return true;
    },

    postProcess: async (result, task, agent, taskLogger) => {
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
          component: "ApplyTest",
          testFile: task.params.testFile,
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Success] Test file created: ${task.params.testFile}\n`,
        });
      } catch {
        testFileExists = false;
        taskLogger.error("❌ Test file was not created", {
          component: "ApplyTest",
          expectedPath: testFilePath,
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stderr",
          log: `\n❌ [Error] Test file was not created at: ${task.params.testFile}\n`,
        });
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
          component: "ApplyTest",
          testFile: task.params.testFile,
        });
        return {
          success: false,
          error: `Test file ${task.params.testFile} was created but is empty.`,
        };
      }

      taskLogger.info(`✅ Test file verified (${stats.size} bytes)`, {
        component: "ApplyTest",
      });

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
            component: "ApplyTest",
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
            component: "ApplyTest",
            taskId: task.id,
          });
        }
      }

      emitTaskProgress(
        task,
        PROGRESS_STAGES.COMPLETE,
        `Test file created: ${task.params.testFile}`,
      );

      return {
        success: true,
        testFile: testFilePath,
        testFileSize: stats.size,
      };
    },
  };
}
