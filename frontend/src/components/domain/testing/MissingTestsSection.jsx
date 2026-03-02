import { Fragment, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Icon,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, ChevronDown, ChevronRight, Edit2, X } from "lucide-react";
import { Alert } from "../../ui/alert";
import { useTestingEditorStore } from "../../../store/useTestingEditorStore";
import { TESTING_ACTION_STATUS } from "../../../constants/testing-actions";
import { TestCaseDetails, TestCaseInlineEditorComponent } from "./index";
import { getPriorityColor } from "./utils";

export function MissingTestsSection({
  missingTests,
  applyingTests,
  applyLogs,
  onApplyTest,
  onApplyTestEdits,
  domainId,
}) {
  const [expandedTests, setExpandedTests] = useState(new Set());
  const editorRef = useRef(null);

  const {
    editingTestId,
    setEditedMissingTests,
    getEditedMissingTests,
    updateTestInMissingTests,
    markPendingEditedTest,
    hasPendingEditedTest,
    setEditingTest,
    clearEditingTest,
  } = useTestingEditorStore();

  // Initialize store with missing tests if not already set
  const editedMissingTests = getEditedMissingTests(domainId) || missingTests;
  if (!getEditedMissingTests(domainId)) {
    setEditedMissingTests(domainId, missingTests);
  }

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

  const handleSaveTestCases = (updatedTest, previousTest) => {
    updateTestInMissingTests(domainId, updatedTest);

    if (previousTest?.actionStatus === TESTING_ACTION_STATUS.COMPLETED) {
      markPendingEditedTest(domainId, updatedTest.id);
    }
  };

  const hasTests =
    editedMissingTests?.unit?.length > 0 ||
    editedMissingTests?.integration?.length > 0 ||
    editedMissingTests?.e2e?.length > 0;

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
        {editedMissingTests.unit?.length > 0 && (
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
                {editedMissingTests.unit.length}
              </Badge>
            </HStack>
          </Box>
        )}
        {editedMissingTests.integration?.length > 0 && (
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
                {editedMissingTests.integration.length}
              </Badge>
            </HStack>
          </Box>
        )}
        {editedMissingTests.e2e?.length > 0 && (
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
                {editedMissingTests.e2e.length}
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
              <Table.ColumnHeader width="140px" textAlign="center">
                Actions
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {/* Unit Tests */}
            {editedMissingTests.unit?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              return (
                <Fragment key={test.id}>
                  <Table.Row
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
                      <HStack gap={1} justify="center">
                        {editingTestId === test.id ? (
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              clearEditingTest();
                            }}
                            title="Cancel editing"
                          >
                            <X size={14} />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="xs"
                            colorPalette="blue"
                            variant="ghost"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTest(test.id, domainId);
                            }}
                            title="Edit test cases"
                          >
                            <Edit2 size={14} />
                          </IconButton>
                        )}
                        {!isApplied && (
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
                        )}
                        {isApplied && hasPendingEdits && (
                          <Button
                            size="xs"
                            colorPalette="yellow"
                            variant="solid"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyTestEdits?.(test.id);
                            }}
                          >
                            Apply edits
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        {editingTestId === test.id ? (
                          <TestCaseInlineEditorComponent
                            ref={editorRef}
                            test={test}
                            onSave={(updatedTest) => {
                              handleSaveTestCases(updatedTest, test);
                              clearEditingTest();
                            }}
                            onCancel={() => clearEditingTest()}
                          />
                        ) : (
                          <VStack align="stretch" gap={3}>
                            {test.scenarios ? (
                              <TestCaseDetails scenarios={test.scenarios} />
                            ) : null}

                            {Array.isArray(test.actionHistory) &&
                              test.actionHistory.length > 0 && (
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    mb={2}
                                  >
                                    Action History
                                  </Text>
                                  {test.actionHistory.map((action) => (
                                    <Text
                                      key={action.id}
                                      fontSize="xs"
                                      color="gray.700"
                                    >
                                      {action.action} • {action.status} •{" "}
                                      {action.timestamp}
                                    </Text>
                                  ))}
                                </Box>
                              )}

                            {applyLogs?.[test.id] && (
                              <Box borderWidth="1px" borderRadius="md" p={3}>
                                <Text
                                  fontSize="xs"
                                  fontWeight="semibold"
                                  mb={2}
                                >
                                  Apply Logs
                                </Text>
                                <Box
                                  bg="gray.900"
                                  color="green.300"
                                  p={3}
                                  borderRadius="sm"
                                  fontFamily="mono"
                                  fontSize="xs"
                                  maxH="240px"
                                  overflowY="auto"
                                  whiteSpace="pre-wrap"
                                >
                                  {applyLogs[test.id]}
                                </Box>
                              </Box>
                            )}
                          </VStack>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}

            {/* Integration Tests */}
            {editedMissingTests.integration?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              return (
                <Fragment key={test.id}>
                  <Table.Row
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
                      <HStack gap={1} justify="center">
                        {editingTestId === test.id ? (
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              clearEditingTest();
                            }}
                            title="Cancel editing"
                          >
                            <X size={14} />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="xs"
                            colorPalette="blue"
                            variant="ghost"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTest(test.id, domainId);
                            }}
                            title="Edit test cases"
                          >
                            <Edit2 size={14} />
                          </IconButton>
                        )}
                        {!isApplied && (
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
                        )}
                        {isApplied && hasPendingEdits && (
                          <Button
                            size="xs"
                            colorPalette="yellow"
                            variant="solid"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyTestEdits?.(test.id);
                            }}
                          >
                            Apply edits
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        {editingTestId === test.id ? (
                          <TestCaseInlineEditorComponent
                            ref={editorRef}
                            test={test}
                            onSave={(updatedTest) => {
                              handleSaveTestCases(updatedTest, test);
                              clearEditingTest();
                            }}
                            onCancel={() => clearEditingTest()}
                          />
                        ) : (
                          <VStack align="stretch" gap={3}>
                            {test.scenarios ? (
                              <TestCaseDetails scenarios={test.scenarios} />
                            ) : null}

                            {Array.isArray(test.actionHistory) &&
                              test.actionHistory.length > 0 && (
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    mb={2}
                                  >
                                    Action History
                                  </Text>
                                  {test.actionHistory.map((action) => (
                                    <Text
                                      key={action.id}
                                      fontSize="xs"
                                      color="gray.700"
                                    >
                                      {action.action} • {action.status} •{" "}
                                      {action.timestamp}
                                    </Text>
                                  ))}
                                </Box>
                              )}

                            {applyLogs?.[test.id] && (
                              <Box borderWidth="1px" borderRadius="md" p={3}>
                                <Text
                                  fontSize="xs"
                                  fontWeight="semibold"
                                  mb={2}
                                >
                                  Apply Logs
                                </Text>
                                <Box
                                  bg="gray.900"
                                  color="green.300"
                                  p={3}
                                  borderRadius="sm"
                                  fontFamily="mono"
                                  fontSize="xs"
                                  maxH="240px"
                                  overflowY="auto"
                                  whiteSpace="pre-wrap"
                                >
                                  {applyLogs[test.id]}
                                </Box>
                              </Box>
                            )}
                          </VStack>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}

            {/* E2E Tests */}
            {editedMissingTests.e2e?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              return (
                <Fragment key={test.id}>
                  <Table.Row
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
                      <HStack gap={1} justify="center">
                        {editingTestId === test.id ? (
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              clearEditingTest();
                            }}
                            title="Cancel editing"
                          >
                            <X size={14} />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="xs"
                            colorPalette="blue"
                            variant="ghost"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTest(test.id, domainId);
                            }}
                            title="Edit test cases"
                          >
                            <Edit2 size={14} />
                          </IconButton>
                        )}
                        {!isApplied && (
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
                        )}
                        {isApplied && hasPendingEdits && (
                          <Button
                            size="xs"
                            colorPalette="yellow"
                            variant="solid"
                            disabled={!!applyingTests[test.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyTestEdits?.(test.id);
                            }}
                          >
                            Apply edits
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        {editingTestId === test.id ? (
                          <TestCaseInlineEditorComponent
                            ref={editorRef}
                            test={test}
                            onSave={(updatedTest) => {
                              handleSaveTestCases(updatedTest, test);
                              clearEditingTest();
                            }}
                            onCancel={() => clearEditingTest()}
                          />
                        ) : (
                          <VStack align="stretch" gap={3}>
                            {test.scenarios ? (
                              <TestCaseDetails scenarios={test.scenarios} />
                            ) : null}

                            {Array.isArray(test.actionHistory) &&
                              test.actionHistory.length > 0 && (
                                <Box borderWidth="1px" borderRadius="md" p={3}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    mb={2}
                                  >
                                    Action History
                                  </Text>
                                  {test.actionHistory.map((action) => (
                                    <Text
                                      key={action.id}
                                      fontSize="xs"
                                      color="gray.700"
                                    >
                                      {action.action} • {action.status} •{" "}
                                      {action.timestamp}
                                    </Text>
                                  ))}
                                </Box>
                              )}

                            {applyLogs?.[test.id] && (
                              <Box borderWidth="1px" borderRadius="md" p={3}>
                                <Text
                                  fontSize="xs"
                                  fontWeight="semibold"
                                  mb={2}
                                >
                                  Apply Logs
                                </Text>
                                <Box
                                  bg="gray.900"
                                  color="green.300"
                                  p={3}
                                  borderRadius="sm"
                                  fontFamily="mono"
                                  fontSize="xs"
                                  maxH="240px"
                                  overflowY="auto"
                                  whiteSpace="pre-wrap"
                                >
                                  {applyLogs[test.id]}
                                </Box>
                              </Box>
                            )}
                          </VStack>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
}
