import { useState } from "react";
import { formatAssertionType } from "./utils";

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
                      <HStack justify="space-between" align="center">
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          color="gray.600"
                        >
                          Check {caseIndex + 1}
                        </Text>
                        <Badge size="xs" colorPalette="purple">
                          {formatAssertionType(testCaseItem.assertionType)}
                        </Badge>
                      </HStack>

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
                                      {inputField.value}
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
                            {testCaseItem.input}
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
                          bg="green.50"
                          color="green.800"
                          borderRadius="sm"
                          display="block"
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                        >
                          {testCaseItem.expectedOutput}
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
