import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  List,
  Separator,
  Grid,
  Table,
  Icon,
  Collapsible,
  IconButton,
  Skeleton,
} from "@chakra-ui/react";
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card } from "../ui/card";
import { Alert } from "../ui/alert";
import LogsViewer from "./LogsViewer";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

function TestCoverageMetrics({ coverage }) {
  return (
    <Box>
      <Text fontWeight="semibold" mb={3} fontSize="md">
        Current Coverage
      </Text>
      <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={3}>
        <Box borderWidth="1px" borderRadius="md" p={3} textAlign="center">
          <Text fontSize="xs" color="gray.600" mb={1}>
            Overall
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="blue.600">
            {coverage?.overall || "0%"}
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={3} textAlign="center">
          <Text fontSize="xs" color="gray.600" mb={1}>
            Statements
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="purple.600">
            {coverage?.statements || "0%"}
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={3} textAlign="center">
          <Text fontSize="xs" color="gray.600" mb={1}>
            Branches
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="orange.600">
            {coverage?.branches || "0%"}
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={3} textAlign="center">
          <Text fontSize="xs" color="gray.600" mb={1}>
            Functions
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.600">
            {coverage?.functions || "0%"}
          </Text>
        </Box>
      </Grid>
    </Box>
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
          <Table.ColumnHeader>Tests</Table.ColumnHeader>
          <Table.ColumnHeader>Pass Rate</Table.ColumnHeader>
          <Table.ColumnHeader>Last Run</Table.ColumnHeader>
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
              <Badge colorPalette="blue">{test.testsCount || 0} tests</Badge>
            </Table.Cell>
            <Table.Cell>
              <HStack>
                {test.passRate === "100%" ? (
                  <Icon color="green.600">
                    <CheckCircle size={16} />
                  </Icon>
                ) : (
                  <Icon color="orange.600">
                    <AlertCircle size={16} />
                  </Icon>
                )}
                <Text fontSize="sm">{test.passRate || "N/A"}</Text>
              </HStack>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="xs" color="gray.600">
                {test.lastRun
                  ? new Date(test.lastRun).toLocaleDateString()
                  : "Never"}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function MissingTestsSection({ missingTests, applyingTests, onApplyTest }) {
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
              <Table.ColumnHeader width="80px">ID</Table.ColumnHeader>
              <Table.ColumnHeader width="100px">Type</Table.ColumnHeader>
              <Table.ColumnHeader width="80px">Priority</Table.ColumnHeader>
              <Table.ColumnHeader width="90px">Effort</Table.ColumnHeader>
              <Table.ColumnHeader>Description</Table.ColumnHeader>
              <Table.ColumnHeader>Suggested File</Table.ColumnHeader>
              <Table.ColumnHeader width="90px" textAlign="center">
                Action
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {/* Unit Tests */}
            {missingTests.unit?.map((test) => (
              <Table.Row
                key={test.id}
                bg={
                  test.priority === "P0"
                    ? "red.50"
                    : test.priority === "P1"
                      ? "orange.50"
                      : undefined
                }
                _hover={{ bg: "gray.100" }}
              >
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
                  <Text fontSize="xs" color="gray.600">
                    {test.estimatedEffort || "Unknown"}
                  </Text>
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
                    onClick={() => onApplyTest(test.id)}
                    loading={!!applyingTests[test.id]}
                    loadingText="Applying"
                  >
                    <Check size={12} />
                    Apply
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}

            {/* Integration Tests */}
            {missingTests.integration?.map((test) => (
              <Table.Row
                key={test.id}
                bg={
                  test.priority === "P0"
                    ? "red.50"
                    : test.priority === "P1"
                      ? "orange.50"
                      : undefined
                }
                _hover={{ bg: "gray.100" }}
              >
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
                  <Text fontSize="xs" color="gray.600">
                    {test.estimatedEffort || "Unknown"}
                  </Text>
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
                    onClick={() => onApplyTest(test.id)}
                    loading={!!applyingTests[test.id]}
                    loadingText="Applying"
                  >
                    <Check size={12} />
                    Apply
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}

            {/* E2E Tests */}
            {missingTests.e2e?.map((test) => (
              <Table.Row
                key={test.id}
                bg={
                  test.priority === "P0"
                    ? "red.50"
                    : test.priority === "P1"
                      ? "orange.50"
                      : undefined
                }
                _hover={{ bg: "gray.100" }}
              >
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
                  <Text fontSize="xs" color="gray.600">
                    {test.estimatedEffort || "Unknown"}
                  </Text>
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
                    onClick={() => onApplyTest(test.id)}
                    loading={!!applyingTests[test.id]}
                    loadingText="Applying"
                  >
                    <Check size={12} />
                    Apply
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
}

function TestRecommendations({ recommendations }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Text color="gray.500" fontSize="sm">
        No additional recommendations at this time.
      </Text>
    );
  }

  return (
    <List.Root gap={2}>
      {recommendations.map((rec, index) => (
        <List.Item key={index}>
          <Text fontSize="sm">{rec}</Text>
        </List.Item>
      ))}
    </List.Root>
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
                      "AI is analyzing domain files and generating test recommendations..."}
                  </Text>
                </HStack>
              </Box>
            )}
            {showLogs ? (
              <LogsViewer logs={logs} loading={logsLoading} />
            ) : loading && !testing ? (
              <VStack align="stretch" gap={6}>
                <Box>
                  <Skeleton height="20px" width="150px" mb={3} />
                  <Grid
                    templateColumns="repeat(auto-fit, minmax(120px, 1fr))"
                    gap={3}
                  >
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                    <Skeleton height="80px" />
                  </Grid>
                </Box>
                <Separator />
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
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Title>No test analysis yet</Alert.Title>
                <Alert.Description>
                  Click "Analyze tests" to get detailed coverage analysis and
                  test suggestions.
                </Alert.Description>
              </Alert.Root>
            ) : (
              <VStack align="stretch" gap={6}>
                {/* Coverage Metrics */}
                <TestCoverageMetrics coverage={testing.currentCoverage} />

                <Separator />

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

                <Separator />

                {/* Recommendations */}
                <Box>
                  <Text fontWeight="semibold" mb={3} fontSize="md">
                    General Recommendations
                  </Text>
                  <TestRecommendations
                    recommendations={testing.recommendations}
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
