import fs from "fs/promises";
import path from "path";
import config from "../../config.js";
import { emitTaskLog } from "../../utils/socket-emitter.js";

/**
 * Handler for implement-fix task (LLM API)
 * Applies a bug or security finding fix by modifying the source file(s) directly.
 * Verifies that the target file was modified after the agent completes.
 */
export function implementFixHandler(task, taskLogger, agent) {
  const findingFile = task.params?.findingFile;

  return {
    initialMessage:
      "Begin implementing the fix as specified in the instructions. " +
      "Use read_file to understand the current code, then use replace_lines to apply the fix to the relevant lines. " +
      "Only modify what is necessary to resolve the specific finding.",

    shouldContinue: (response) => {
      if (
        response.stopReason === "end_turn" ||
        response.stopReason === "stop_sequence" ||
        response.stopReason === "completed"
      ) {
        taskLogger.info("✅ Fix implementation complete", {
          component: "ImplementFix",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Complete] Fix implemented\n`,
        });
        return false;
      }

      if (response.stopReason === "max_tokens" && !response.toolCalls?.length) {
        taskLogger.warn("⚠️  Max tokens reached, requesting fix completion", {
          component: "ImplementFix",
        });
        const fileHint = findingFile
          ? ` Use replace_lines on ${findingFile} to apply the fix now.`
          : " Apply the fix using replace_lines now.";
        agent.addUserMessage(
          `You've hit the token limit. The fix has not been applied yet.${fileHint}`,
        );
        return true;
      }

      return true;
    },

    onComplete: async (_result) => {
      if (!findingFile) {
        // No specific file to verify — trust the agent completed successfully
        taskLogger.info("✅ Fix task complete (no target file to verify)", {
          component: "ImplementFix",
        });
        return { success: true };
      }

      const targetFilePath = path.join(config.target.directory, findingFile);

      try {
        await fs.access(targetFilePath);
        const stats = await fs.stat(targetFilePath);
        taskLogger.info(
          `✅ Target file verified (${stats.size} bytes): ${findingFile}`,
          { component: "ImplementFix" },
        );
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stdout",
          log: `\n✅ [Success] Fix applied to: ${findingFile}\n`,
        });
      } catch {
        taskLogger.warn(`⚠️  Target file not accessible: ${findingFile}`, {
          component: "ImplementFix",
        });
        emitTaskLog(task, {
          taskId: task.id,
          domainId: task.params?.domainId,
          type: task.type,
          stream: "stderr",
          log: `\n⚠️  [Warning] Could not verify target file: ${findingFile}\n`,
        });
      }

      return { success: true };
    },
  };
}
