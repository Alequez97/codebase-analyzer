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
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "../../../store/useRefactoringAndTestingEditorStore";
import { TESTING_ACTION_STATUS } from "../../../constants/testing-actions";
import { TestCaseDetails, TestCaseInlineEditorComponent } from "./index";
import { getPriorityColor, sortByPriority } from "./utils";

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
    unblockTest,
  } = useTestingEditorStore();

  const mergeActionStatusFromSource = (edited, source) => {
    if (!edited) return source;

    const sourceById = new Map();
    ["unit", "integration", "e2e"].forEach((type) => {
      (source?.[type] || []).forEach((test) => {
        sourceById.set(test.id, test);
      });
    });

    const mergeList = (tests = []) =>
      tests.map((test) => {
        const sourceTest = sourceById.get(test.id);
        if (!sourceTest) return test;

        return {
          ...test,
          actionStatus: sourceTest.actionStatus || test.actionStatus || null,
          actionHistory: sourceTest.actionHistory || test.actionHistory || [],
          suggestedTestFile:
            sourceTest.suggestedTestFile || test.suggestedTestFile,
        };
      });

    return {
      unit: mergeList(edited.unit || []),
      integration: mergeList(edited.integration || []),
      e2e: mergeList(edited.e2e || []),
    };
  };

  // Initialize store with missing tests if not already set
  const editedMissingTests = mergeActionStatusFromSource(
    getEditedMissingTests(domainId),
    missingTests,
  );
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

  const renderActionButton = (test, isApplied, hasPendingEdits, isBlocked) => {
    if (isApplied && hasPendingEdits) {
      return (
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
      );
    }

    if (isApplied) {
      return (
        <Button size="xs" colorPalette="green" variant="subtle" disabled>
          Applied
        </Button>
      );
    }

    if (isBlocked) {
      return (
        <Button
          size="xs"
          colorPalette="orange"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            unblockTest(domainId, test.id);
          }}
        >
          Unblock manually
        </Button>
      );
    }

    return (
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
    );
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
        <Table.Root size="sm" variant="outline">
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
            {sortByPriority(editedMissingTests.unit)?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const isApplying = !!applyingTests[test.id];
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              const isBlocked = !!test.blockedBy;
              return (
                <Fragment key={test.id}>
                  <Table.Row
                    bg={
                      isBlocked
                        ? "orange.50"
                        : isApplied
                          ? "green.50"
                          : isApplying
                            ? "blue.50"
                            : "gray.50"
                    }
                    _hover={{
                      bg: isBlocked
                        ? "orange.100"
                        : isApplied
                          ? "green.100"
                          : isApplying
                            ? "blue.100"
                            : "gray.100",
                      cursor: "pointer",
                    }}
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
                      <HStack gap={1}>
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          fontWeight="medium"
                        >
                          {test.id}
                        </Text>
                        {isBlocked && (
                          <Badge
                            colorPalette="orange"
                            size="sm"
                            variant="solid"
                          >
                            🔒
                          </Badge>
                        )}
                      </HStack>
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
                        {renderActionButton(
                          test,
                          isApplied,
                          hasPendingEdits,
                          isBlocked,
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
                            {test.blockedBy && (
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                bg="orange.50"
                                borderColor="orange.300"
                              >
                                <HStack justify="space-between" mb={2}>
                                  <HStack>
                                    <Badge
                                      colorPalette="orange"
                                      size="sm"
                                      variant="solid"
                                    >
                                      🔒 BLOCKED
                                    </Badge>
                                    <Text fontSize="xs" fontWeight="semibold">
                                      Requires refactoring before implementation
                                    </Text>
                                  </HStack>
                                  <Button
                                    size="xs"
                                    colorPalette="orange"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unblockTest(domainId, test.id);
                                    }}
                                  >
                                    Unblock manually
                                  </Button>
                                </HStack>
                                <Text fontSize="xs" color="gray.700">
                                  ⚠️ Blocked by{" "}
                                  <Text
                                    as="span"
                                    fontFamily="mono"
                                    fontWeight="semibold"
                                  >
                                    {test.blockedBy}
                                  </Text>
                                </Text>
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                  Apply the recommended refactoring above, or
                                  click Unblock manually to proceed without it.
                                </Text>
                              </Box>
                            )}

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
            {sortByPriority(editedMissingTests.integration)?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const isApplying = !!applyingTests[test.id];
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              const isBlocked = !!test.blockedBy;
              return (
                <Fragment key={test.id}>
                  <Table.Row
                    bg={
                      isBlocked
                        ? "orange.50"
                        : isApplied
                          ? "green.50"
                          : isApplying
                            ? "blue.50"
                            : "gray.50"
                    }
                    _hover={{
                      bg: isBlocked
                        ? "orange.100"
                        : isApplied
                          ? "green.100"
                          : isApplying
                            ? "blue.100"
                            : "gray.100",
                      cursor: "pointer",
                    }}
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
                      <HStack gap={1}>
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          fontWeight="medium"
                        >
                          {test.id}
                        </Text>
                        {isBlocked && (
                          <Badge
                            colorPalette="orange"
                            size="sm"
                            variant="solid"
                          >
                            🔒
                          </Badge>
                        )}
                      </HStack>
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
                        {renderActionButton(
                          test,
                          isApplied,
                          hasPendingEdits,
                          isBlocked,
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
                            {test.blockedBy && (
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                bg="orange.50"
                                borderColor="orange.300"
                              >
                                <HStack justify="space-between" mb={2}>
                                  <HStack>
                                    <Badge
                                      colorPalette="orange"
                                      size="sm"
                                      variant="solid"
                                    >
                                      🔒 BLOCKED
                                    </Badge>
                                    <Text fontSize="xs" fontWeight="semibold">
                                      Requires refactoring before implementation
                                    </Text>
                                  </HStack>
                                  <Button
                                    size="xs"
                                    colorPalette="orange"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unblockTest(domainId, test.id);
                                    }}
                                  >
                                    Unblock manually
                                  </Button>
                                </HStack>
                                <Text fontSize="xs" color="gray.700">
                                  ⚠️ Blocked by{" "}
                                  <Text
                                    as="span"
                                    fontFamily="mono"
                                    fontWeight="semibold"
                                  >
                                    {test.blockedBy}
                                  </Text>
                                </Text>
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                  Apply the recommended refactoring above, or
                                  click Unblock manually to proceed without it.
                                </Text>
                              </Box>
                            )}

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
            {sortByPriority(editedMissingTests.e2e)?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
              const isApplied =
                test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
              const isApplying = !!applyingTests[test.id];
              const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
              const isBlocked = !!test.blockedBy;
              return (
                <Fragment key={test.id}>
                  <Table.Row
                    bg={
                      isBlocked
                        ? "orange.50"
                        : isApplied
                          ? "green.50"
                          : isApplying
                            ? "blue.50"
                            : "gray.50"
                    }
                    _hover={{
                      bg: isBlocked
                        ? "orange.100"
                        : isApplied
                          ? "green.100"
                          : isApplying
                            ? "blue.100"
                            : "gray.100",
                      cursor: "pointer",
                    }}
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
                      <HStack gap={1}>
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          fontWeight="medium"
                        >
                          {test.id}
                        </Text>
                        {isBlocked && (
                          <Badge
                            colorPalette="orange"
                            size="sm"
                            variant="solid"
                          >
                            🔒
                          </Badge>
                        )}
                      </HStack>
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
                        {renderActionButton(
                          test,
                          isApplied,
                          hasPendingEdits,
                          isBlocked,
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
                            {test.blockedBy && (
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                bg="orange.50"
                                borderColor="orange.300"
                              >
                                <HStack justify="space-between" mb={2}>
                                  <HStack>
                                    <Badge
                                      colorPalette="orange"
                                      size="sm"
                                      variant="solid"
                                    >
                                      🔒 BLOCKED
                                    </Badge>
                                    <Text fontSize="xs" fontWeight="semibold">
                                      Requires refactoring before implementation
                                    </Text>
                                  </HStack>
                                  <Button
                                    size="xs"
                                    colorPalette="orange"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unblockTest(domainId, test.id);
                                    }}
                                  >
                                    Unblock manually
                                  </Button>
                                </HStack>
                                <Text fontSize="xs" color="gray.700">
                                  ⚠️ Blocked by{" "}
                                  <Text
                                    as="span"
                                    fontFamily="mono"
                                    fontWeight="semibold"
                                  >
                                    {test.blockedBy}
                                  </Text>
                                </Text>
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                  Apply the recommended refactoring above, or
                                  click Unblock manually to proceed without it.
                                </Text>
                              </Box>
                            )}

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

