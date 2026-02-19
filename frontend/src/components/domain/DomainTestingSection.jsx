import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  Separator,
  Grid,
  Table,
  Icon,
  Collapsible,
  IconButton,
  Skeleton,
  Code,
  Stack,
} from "@chakra-ui/react";
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
  TestTube,
} from "lucide-react";
import { Card } from "../ui/card";
import { Alert } from "../ui/alert";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

function TestCaseDetails({ testCases }) {
  if (!testCases || testCases.length === 0) {
    return (
      <Box p={3} bg="gray.50" borderRadius="md">
        <Text fontSize="sm" color="gray.600">
          No detailed test cases available
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={3} p={4} bg="gray.50" borderRadius="md">
      <Text fontWeight="medium" fontSize="sm" color="gray.700">
        Test Cases ({testCases.length})
      </Text>
      {testCases.map((testCase, index) => (
        <Box
          key={index}
          p={3}
          bg="white"
          borderWidth="1px"
          borderRadius="md"
          borderColor="gray.200"
        >
          <VStack align="stretch" gap={2}>
            <Text fontWeight="semibold" fontSize="sm" color="blue.700">
              {index + 1}. {testCase.scenario}
            </Text>
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                Input:
              </Text>
              <Code
                fontSize="xs"
                p={2}
                bg="gray.100"
                borderRadius="sm"
                display="block"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
              >
                {testCase.input}
              </Code>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
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
                {testCase.expectedOutput}
              </Code>
            </Box>
            <HStack gap={2}>
              <Badge size="xs" colorPalette="purple">
                {testCase.assertionType}
              </Badge>
            </HStack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

function ExistingTestsTable({ testFiles }) {
  if (testFiles.length === 0) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Description>
          No existing test files identified for this domain.
        </Alert.Description>
      </Alert.Root>
    );
  }

  return (
    <Table.Root size="sm" variant="outline">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>File</Table.ColumnHeader>
          <Table.ColumnHeader>Type</Table.ColumnHeader>
          <Table.ColumnHeader>Description</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {testFiles.map((test) => (
          <Table.Row key={test.file}>
            <Table.Cell>
              <Text fontSize="sm" fontFamily="mono">
                {test.file}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette={
                  test.testType === "unit"
                    ? "purple"
                    : test.testType === "integration"
                      ? "blue"
                      : "green"
                }
              >
                {test.testType || "unit"}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm" color="gray.600">
                {test.description || "No description"}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function MissingTestsSection({ missingTests, applyingTests, onApplyTest }) {
  const [expandedTests, setExpandedTests] = useState(new Set());

  const toggleExpand = (testId) => {
    setExpandedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const hasTests =
    missingTests?.unit?.length > 0 ||
    missingTests?.integration?.length > 0 ||
    missingTests?.e2e?.length > 0;

  if (!hasTests) {
    return (
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Description>
          All critical tests are in place! 🎉
        </Alert.Description>
      </Alert.Root>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {/* Summary Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={3}>
        {missingTests.unit?.length > 0 && (
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={3}
            bg="purple.50"
            borderColor="purple.200"
          >
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="medium">
                Unit Tests
              </Text>
              <Badge colorPalette="purple" size="sm">
                {missingTests.unit.length}
              </Badge>
            </HStack>
          </Box>
        )}
        {missingTests.integration?.length > 0 && (
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={3}
            bg="blue.50"
            borderColor="blue.200"
          >
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="medium">
                Integration Tests
              </Text>
              <Badge colorPalette="blue" size="sm">
                {missingTests.integration.length}
              </Badge>
            </HStack>
          </Box>
        )}
        {missingTests.e2e?.length > 0 && (
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={3}
            bg="green.50"
            borderColor="green.200"
          >
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="medium">
                E2E Tests
              </Text>
              <Badge colorPalette="green" size="sm">
                {missingTests.e2e.length}
              </Badge>
            </HStack>
          </Box>
        )}
      </Grid>

      {/* Table */}
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
        <Table.Root size="sm" variant="outline" striped>
          <Table.Header>
            <Table.Row bg="gray.50">
              <Table.ColumnHeader width="40px"></Table.ColumnHeader>
              <Table.ColumnHeader width="80px">ID</Table.ColumnHeader>
              <Table.ColumnHeader width="100px">Type</Table.ColumnHeader>
              <Table.ColumnHeader width="80px">Priority</Table.ColumnHeader>
              <Table.ColumnHeader>Description</Table.ColumnHeader>
              <Table.ColumnHeader>Suggested File</Table.ColumnHeader>
              <Table.ColumnHeader width="90px" textAlign="center">
                Action
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {/* Unit Tests */}
            {missingTests.unit?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              return (
                <>
                  <Table.Row
                    key={test.id}
                    bg={
                      test.priority === "P0"
                        ? "red.50"
                        : test.priority === "P1"
                          ? "orange.50"
                          : undefined
                    }
                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                    onClick={() => toggleExpand(test.id)}
                  >
                    <Table.Cell>
                      <Icon size="sm" color="gray.500">
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Icon>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="xs" fontFamily="mono" fontWeight="medium">
                        {test.id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette="purple" size="sm">
                        Unit
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={getPriorityColor(test.priority)}
                        size="sm"
                      >
                        {test.priority}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{test.description}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="gray.700"
                        wordBreak="break-all"
                      >
                        {test.suggestedTestFile}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button
                        size="xs"
                        colorPalette="green"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTest(test.id);
                        }}
                        loading={!!applyingTests[test.id]}
                        loadingText="Applying"
                      >
                        <Check size={12} />
                        Apply
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              );
            })}

            {/* Integration Tests */}
            {missingTests.integration?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              return (
                <>
                  <Table.Row
                    key={test.id}
                    bg={
                      test.priority === "P0"
                        ? "red.50"
                        : test.priority === "P1"
                          ? "orange.50"
                          : undefined
                    }
                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                    onClick={() => toggleExpand(test.id)}
                  >
                    <Table.Cell>
                      <Icon size="sm" color="gray.500">
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Icon>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="xs" fontFamily="mono" fontWeight="medium">
                        {test.id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette="blue" size="sm">
                        Integration
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={getPriorityColor(test.priority)}
                        size="sm"
                      >
                        {test.priority}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{test.description}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="gray.700"
                        wordBreak="break-all"
                      >
                        {test.suggestedTestFile}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button
                        size="xs"
                        colorPalette="green"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTest(test.id);
                        }}
                        loading={!!applyingTests[test.id]}
                        loadingText="Applying"
                      >
                        <Check size={12} />
                        Apply
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              );
            })}

            {/* E2E Tests */}
            {missingTests.e2e?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              return (
                <>
                  <Table.Row
                    key={test.id}
                    bg={
                      test.priority === "P0"
                        ? "red.50"
                        : test.priority === "P1"
                          ? "orange.50"
                          : undefined
                    }
                    _hover={{ bg: "gray.100", cursor: "pointer" }}
                    onClick={() => toggleExpand(test.id)}
                  >
                    <Table.Cell>
                      <Icon size="sm" color="gray.500">
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Icon>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="xs" fontFamily="mono" fontWeight="medium">
                        {test.id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette="green" size="sm">
                        E2E
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={getPriorityColor(test.priority)}
                        size="sm"
                      >
                        {test.priority}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{test.description}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="gray.700"
                        wordBreak="break-all"
                      >
                        {test.suggestedTestFile}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Button
                        size="xs"
                        colorPalette="green"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTest(test.id);
                        }}
                        loading={!!applyingTests[test.id]}
                        loadingText="Applying"
                      >
                        <Check size={12} />
                        Apply
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
}

export default function DomainTestingSection({
  testing,
  loading,
  progress,
  applyingTests,
  onAnalyze,
  onApplyTest,
  showLogs = false,
  logs = "",
  logsLoading = false,
}) {
  const existingTestFiles = testing?.existingTests || [];
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card.Root>
      <Card.Header py="4">
        <HStack justify="space-between" alignItems="center">
          <HStack
            gap={2}
            flex={1}
            cursor="pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            alignItems="center"
          >
            <IconButton
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </IconButton>
            <Heading size="md">Testing</Heading>
            {showLogs && (
              <Badge colorPalette="purple" size="sm">
                Logs View
              </Badge>
            )}
          </HStack>
          <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
            {!showLogs && (
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={onAnalyze}
                loading={loading}
                loadingText="Analyzing"
              >
                <Sparkles size={14} />
                {testing ? "Re-analyze tests" : "Analyze tests"}
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Header>
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          <Card.Body>
            {(loading || progress) && !showLogs && (
              <Box
                mb={4}
                p={3}
                bg="blue.50"
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="blue.500"
              >
                <HStack gap={2}>
                  <FileText size={16} />
                  <Text fontSize="sm" fontWeight="medium" color="blue.800">
                    {progress?.message ||
                      "AI is analyzing domain files and identifying missing tests..."}
                  </Text>
                </HStack>
              </Box>
            )}
            {showLogs ? (
              <LogsViewer logs={logs} loading={logsLoading} />
            ) : loading && !testing ? (
              <VStack align="stretch" gap={6}>
                <Box>
                  <Skeleton height="20px" width="180px" mb={3} />
                  <Skeleton height="120px" />
                </Box>
                <Separator />
                <Box>
                  <Skeleton height="20px" width="200px" mb={3} />
                  <Skeleton height="200px" />
                </Box>
              </VStack>
            ) : !testing ? (
              <EmptyState
                icon={TestTube}
                title="No test analysis yet"
                description="Click 'Analyze tests' to get detailed coverage analysis and test suggestions."
                variant="simple"
              />
            ) : (
              <VStack align="stretch" gap={6}>
                {/* Existing Tests */}
                <Box>
                  <Text fontWeight="semibold" mb={3} fontSize="md">
                    Existing Test Files
                  </Text>
                  <ExistingTestsTable testFiles={existingTestFiles} />
                </Box>

                <Separator />

                {/* Missing Tests */}
                <Box>
                  <Text fontWeight="semibold" mb={4} fontSize="md">
                    Missing Tests (Suggestions)
                  </Text>
                  <MissingTestsSection
                    missingTests={testing.missingTests}
                    applyingTests={applyingTests}
                    onApplyTest={onApplyTest}
                  />
                </Box>
              </VStack>
            )}
          </Card.Body>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Root>
  );
}
