import fs from "fs/promises";
import { defaultAnalysisHandler } from "./default-analysis.js";

/**
 * Handler for analyze-testing task
 * Keeps testing-specific schema validation out of the default handler
 */
export function analyzeTestingHandler(task, taskLogger, agent) {
  return {
    postProcess: async (result) => {
      const defaults = defaultAnalysisHandler(task, taskLogger, agent);
      const defaultResult = await defaults.postProcess(
        result,
        task,
        agent,
        taskLogger,
      );

      if (!defaultResult?.success) {
        return defaultResult;
      }

      const outputPath = defaultResult.outputFile;
      const outputContent = await fs.readFile(outputPath, "utf-8");

      let testingJson;
      try {
        testingJson = JSON.parse(outputContent);
      } catch {
        return {
          success: false,
          error: "Testing analysis output is not valid JSON",
        };
      }

      if (testingJson?.domainId !== task.params?.domainId) {
        return {
          success: false,
          error: `Testing analysis domain mismatch: expected '${task.params?.domainId}', got '${testingJson?.domainId || "missing"}'`,
        };
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
        return {
          success: false,
          error:
            "Testing analysis schema invalid: missingTests must be an object with unit/integration/e2e arrays",
        };
      }

      if (!Array.isArray(testingJson?.existingTests)) {
        return {
          success: false,
          error:
            "Testing analysis schema invalid: existingTests must be an array",
        };
      }

      for (const [index, existingTest] of testingJson.existingTests.entries()) {
        if (
          !existingTest?.file ||
          !existingTest?.description ||
          !existingTest?.testType
        ) {
          return {
            success: false,
            error: `Testing analysis schema invalid: existingTests[${index}] must include file, description, and testType`,
          };
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
          return {
            success: false,
            error: `Testing analysis schema invalid: missing test at index ${index} has missing required fields or empty scenarios`,
          };
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
            return {
              success: false,
              error: `Testing analysis schema invalid: scenarios[${scenarioIndex}] for ${missingTest.id} must include scenario and non-empty checks array`,
            };
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
              return {
                success: false,
                error: `Testing analysis schema invalid: check ${checkIndex} in ${missingTest.id}/${scenario.scenario} must include input[], expectedOutput, assertionType`,
              };
            }
          }
        }
      }

      return {
        success: true,
        outputFile: defaultResult.outputFile,
      };
    },
  };
}
