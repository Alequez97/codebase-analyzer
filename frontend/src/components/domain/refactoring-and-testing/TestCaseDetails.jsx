import { useState } from "react";
import { Box, Code, HStack, Tabs, Text, VStack } from "@chakra-ui/react";

function formatValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Unserializable object]";
    }
  }

  return String(value);
}

/**
 * Determines the color scheme for the expected output based on status code
 * @param {*} expectedOutput - The expected output value (can be object, string, etc.)
 * @returns {{ bg: string, color: string }} - Chakra UI color tokens
 */
function getExpectedOutputColors(expectedOutput) {
  // Try to extract status code from the expected output
  let statusCode = null;

  if (typeof expectedOutput === "object" && expectedOutput !== null) {
    statusCode = expectedOutput.statusCode;
  } else if (typeof expectedOutput === "string") {
    try {
      const parsed = JSON.parse(expectedOutput);
      statusCode = parsed.statusCode;
    } catch {
      // Not JSON, ignore
    }
  }

  // If no status code found, default to green (success)
  if (statusCode === null || statusCode === undefined) {
    return { bg: "green.50", color: "green.800" };
  }

  // Color based on HTTP status code ranges
  if (statusCode >= 200 && statusCode < 300) {
    // 2xx Success
    return { bg: "green.50", color: "green.800" };
  } else if (statusCode >= 400 && statusCode < 500) {
    // 4xx Client Error
    return { bg: "orange.50", color: "orange.800" };
  } else if (statusCode >= 500 && statusCode < 600) {
    // 5xx Server Error
    return { bg: "red.50", color: "red.800" };
  } else {
    // Other status codes (1xx, 3xx, etc.)
    return { bg: "blue.50", color: "blue.800" };
  }
}

export function TestCaseDetails({ scenarios }) {
  const [activeTab, setActiveTab] = useState(0);
  const scenarioList = scenarios || [];

  if (!scenarioList || scenarioList.length === 0) {
    return (
      <Box p={3} bg="gray.50" borderRadius="md">
        <Text fontSize="sm" color="gray.600">
          No detailed test cases available
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Tabs.Root
        value={activeTab.toString()}
        onValueChange={(e) => setActiveTab(parseInt(e.value))}
      >
        <Tabs.List>
          {scenarioList.map((testCase, index) => (
            <Tabs.Trigger key={index} value={index.toString()}>
              {testCase.scenario || `Scenario ${index + 1}`}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {scenarioList.map((testCase, index) => (
          <Tabs.Content
            key={index}
            value={index.toString()}
            maxHeight="500px"
            overflowY="auto"
            pt={4}
          >
            {/* Render checks array (new structure) */}
            {Array.isArray(testCase.checks) && testCase.checks.length > 0 ? (
              <VStack align="stretch" gap={2}>
                {testCase.checks.map((testCaseItem, caseIndex) => (
                  <Box
                    key={caseIndex}
                    p={2}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.300"
                  >
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600">
                        Check {caseIndex + 1}
                      </Text>

                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          color="gray.600"
                          mb={1}
                        >
                          Input:
                        </Text>
                        {Array.isArray(testCaseItem.input) &&
                        testCaseItem.input.length > 0 ? (
                          <VStack align="stretch" gap={1}>
                            {testCaseItem.input.map(
                              (inputField, fieldIndex) => (
                                <Box
                                  key={fieldIndex}
                                  p={2}
                                  bg="gray.100"
                                  borderRadius="sm"
                                >
                                  <HStack gap={2} align="start">
                                    <Text
                                      fontSize="xs"
                                      fontWeight="semibold"
                                      color="gray.700"
                                      minWidth="80px"
                                    >
                                      {inputField.field}:
                                    </Text>
                                    <Code
                                      fontSize="xs"
                                      flex={1}
                                      whiteSpace="pre-wrap"
                                      wordBreak="break-word"
                                    >
                                      {formatValue(inputField.value)}
                                    </Code>
                                  </HStack>
                                </Box>
                              ),
                            )}
                          </VStack>
                        ) : typeof testCaseItem.input === "string" ? (
                          <Code
                            fontSize="xs"
                            p={2}
                            bg="gray.100"
                            borderRadius="sm"
                            display="block"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                          >
                            {formatValue(testCaseItem.input)}
                          </Code>
                        ) : (
                          <Text fontSize="xs" color="gray.500">
                            No input specified
                          </Text>
                        )}
                      </Box>

                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          color="gray.600"
                          mb={1}
                        >
                          Expected Output:
                        </Text>
                        <Code
                          fontSize="xs"
                          p={2}
                          bg={
                            getExpectedOutputColors(testCaseItem.expectedOutput)
                              .bg
                          }
                          color={
                            getExpectedOutputColors(testCaseItem.expectedOutput)
                              .color
                          }
                          borderRadius="sm"
                          display="block"
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                        >
                          {formatValue(testCaseItem.expectedOutput)}
                        </Code>
                      </Box>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                No test case details available
              </Text>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  );
}
