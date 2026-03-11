import { Fragment, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Checkbox } from "../../ui/checkbox";
import { Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Alert } from "../../ui/alert";
import { toaster } from "../../ui/toaster";
import api from "../../../api";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "../../../store/useRefactoringAndTestingEditorStore";
import { useDomainRefactoringAndTestingStore } from "../../../store/useDomainRefactoringAndTestingStore";
import { useRefactoringAndTestingStore } from "../../../store/useRefactoringAndTestingStore";
import { TESTING_ACTION_STATUS } from "../../../constants/testing-actions";
import { TestCaseDetails } from "../refactoring-and-testing/TestCaseDetails";
import { TestTypeAccordion } from "../refactoring-and-testing/TestTypeAccordion";
import {
  getPriorityColor,
  sortByPriority,
} from "../refactoring-and-testing/utils";

export function MissingTestsSection({
  missingTests,
  implementingTests,
  implementLogs,
  onImplementBatchTests,
  domainId,
}) {
  const [expandedTests, setExpandedTests] = useState(new Set());
  const [selectedTestIds, setSelectedTestIds] = useState(new Set());
  const [hasCustomizedSelection, setHasCustomizedSelection] = useState(false);
  const [isBatchImplementing, setIsBatchImplementing] = useState(false);
  const [filterImplemented, setFilterImplemented] = useState(true);
  const [filterMissing, setFilterMissing] = useState(true);
  const [filterBlocked, setFilterBlocked] = useState(true);

  const { setEditedMissingTests, getEditedMissingTests } =
    useTestingEditorStore();

  const recentlyChangedTests = useDomainRefactoringAndTestingStore(
    (state) => state.recentlyChangedTests,
  );

  const implementProgressByTestId = useRefactoringAndTestingStore(
    (state) => state.implementProgressByTestId,
  );

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

  const allTests = [
    ...(editedMissingTests?.unit || []),
    ...(editedMissingTests?.integration || []),
    ...(editedMissingTests?.e2e || []),
  ];

  const isSelectableTest = (test) => {
    if (!test) {
      return false;
    }

    return (
      !test.blockedBy &&
      test.actionStatus !== TESTING_ACTION_STATUS.COMPLETED &&
      !implementingTests?.[test.id]
    );
  };

  const selectableTestIds = new Set(
    allTests.filter((test) => isSelectableTest(test)).map((test) => test.id),
  );

  const effectiveSelectedTestIds = hasCustomizedSelection
    ? selectedTestIds
    : selectableTestIds;

  useEffect(() => {
    setHasCustomizedSelection(false);
    setSelectedTestIds(new Set());
  }, [domainId]);

  useEffect(() => {
    setSelectedTestIds((prev) => {
      if (!hasCustomizedSelection) {
        return prev;
      }

      const next = new Set(
        [...prev].filter((testId) => selectableTestIds.has(testId)),
      );

      if (next.size !== prev.size) {
        return next;
      }

      return prev;
    });
  }, [hasCustomizedSelection, editedMissingTests, implementingTests]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTestIds(new Set(selectableTestIds));
    } else {
      setSelectedTestIds(new Set());
    }
    setHasCustomizedSelection(true);
  };

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

  const toggleTestSelection = (testId, checked) => {
    setSelectedTestIds((prev) => {
      const next = hasCustomizedSelection
        ? new Set(prev)
        : new Set(selectableTestIds);

      if (checked) {
        next.add(testId);
      } else {
        next.delete(testId);
      }

      return next;
    });

    setHasCustomizedSelection(true);
  };

  const handleBatchImplement = async () => {
    const selectedIds = allTests
      .filter(
        (test) =>
          effectiveSelectedTestIds.has(test.id) && isSelectableTest(test),
      )
      .map((test) => test.id);

    if (selectedIds.length === 0 || !onImplementBatchTests) {
      return;
    }

    setIsBatchImplementing(true);
    const result = await onImplementBatchTests(selectedIds);
    setIsBatchImplementing(false);

    if (!result?.success) {
      return;
    }

    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((testId) => next.delete(testId));
      return next;
    });
    setHasCustomizedSelection(true);
  };

  // Determine group-level change type for a test type
  const getGroupChangeType = (tests = []) => {
    if (!tests || tests.length === 0) return null;

    const hasAdded = tests.some(
      (test) => recentlyChangedTests.get(test.id) === "added",
    );
    const hasModified = tests.some(
      (test) => recentlyChangedTests.get(test.id) === "modified",
    );
    const hasRemoved = tests.some(
      (test) => recentlyChangedTests.get(test.id) === "removed",
    );

    // Priority: removed > added > modified
    if (hasRemoved) return "removed";
    if (hasAdded) return "added";
    if (hasModified) return "edited";
    return null;
  };

  // Render a single test row
  const renderTestRow = (test) => {
    const isExpanded = expandedTests.has(test.id);
    const isImplemented = test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
    const isImplementing = !!implementingTests[test.id];
    const implementProgress = implementProgressByTestId.get(test.id);
    const isBlocked = !!test.blockedBy;
    const isSelectable = isSelectableTest(test);
    const isSelected = effectiveSelectedTestIds.has(test.id);
    const recentChangeType = recentlyChangedTests.get(test.id) ?? null;

    return (
      <Fragment key={test.id}>
        <Table.Row
          id={test.id}
          bg={
            recentChangeType === "added"
              ? "green.100"
              : recentChangeType === "modified"
                ? "yellow.100"
                : recentChangeType === "removed"
                  ? "red.100"
                  : isBlocked
                    ? "gray.50"
                    : isImplemented
                      ? "green.50"
                      : isImplementing
                        ? "blue.50"
                        : "white"
          }
          _hover={{
            bg:
              recentChangeType === "added"
                ? "green.200"
                : recentChangeType === "modified"
                  ? "yellow.200"
                  : recentChangeType === "removed"
                    ? "red.200"
                    : isBlocked
                      ? "gray.100"
                      : isImplemented
                        ? "green.100"
                        : isImplementing
                          ? "blue.100"
                          : "gray.50",
            cursor: "pointer",
          }}
          onClick={() => toggleExpand(test.id)}
          opacity={recentChangeType === "removed" ? 0.6 : 1}
          textDecoration={
            recentChangeType === "removed" ? "line-through" : "none"
          }
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
              <Text fontSize="xs" fontFamily="mono" fontWeight="medium">
                {test.id}
              </Text>
              {isBlocked && (
                <Badge colorPalette="gray" size="sm" variant="solid">
                  🔒
                </Badge>
              )}
            </HStack>
          </Table.Cell>
          <Table.Cell>
            <Badge colorPalette={getPriorityColor(test.priority)} size="sm">
              {test.priority}
            </Badge>
          </Table.Cell>
          <Table.Cell>
            <Text fontSize="sm">{test.description}</Text>
          </Table.Cell>
          {isImplementing ? (
            <Table.Cell colSpan={3}>
              <HStack
                gap={2}
                px={3}
                py={1}
                bg="blue.100"
                borderRadius="md"
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Spinner
                  size="xs"
                  color="blue.500"
                  borderWidth="2px"
                  flexShrink={0}
                />
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  color="blue.700"
                  truncate
                >
                  {implementProgress?.message || "AI is starting\u2026"}
                </Text>
              </HStack>
            </Table.Cell>
          ) : (
            <>
              <Table.Cell>
                {isImplemented ? (
                  <Badge colorPalette="green" size="xs" variant="subtle">
                    Implemented
                  </Badge>
                ) : isBlocked ? (
                  <Badge colorPalette="gray" size="xs" variant="subtle">
                    Blocked
                  </Badge>
                ) : (
                  <Badge colorPalette="orange" size="xs" variant="subtle">
                    Missing
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                {recentChangeType && (
                  <Badge
                    colorPalette={
                      recentChangeType === "added"
                        ? "green"
                        : recentChangeType === "modified"
                          ? "orange"
                          : "red"
                    }
                    size="xs"
                    variant="subtle"
                  >
                    {recentChangeType === "added"
                      ? "+ New"
                      : recentChangeType === "modified"
                        ? "\u270e Modified"
                        : "\u2212 Deleted"}
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell
                onClick={(e) => e.stopPropagation()}
                textAlign="center"
              >
                {isSelectable ? (
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Checkbox
                      aria-label={`Select ${test.id}`}
                      checked={isSelected}
                      colorPalette="green"
                      onCheckedChange={(event) =>
                        toggleTestSelection(test.id, event.checked)
                      }
                    />
                  </Box>
                ) : null}
              </Table.Cell>
            </>
          )}
        </Table.Row>
        {isExpanded && (
          <Table.Row key={`${test.id}-details`}>
            <Table.Cell colSpan={7} bg="gray.50" p={4}>
              <VStack align="stretch" gap={3}>
                {test.blockedBy && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="gray.100"
                    borderColor="gray.400"
                  >
                    <HStack mb={2}>
                      <Badge colorPalette="gray" size="sm" variant="solid">
                        🔒 BLOCKED
                      </Badge>
                      <Text fontSize="xs" fontWeight="semibold">
                        Requires refactoring before implementation
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.700">
                      ⚠️ Blocked by{" "}
                      <Text as="span" fontFamily="mono" fontWeight="semibold">
                        {test.blockedBy}
                      </Text>
                    </Text>
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      Please implement the recommended refactoring above before
                      implementing this test.
                    </Text>
                  </Box>
                )}

                {test.suggestedTestFile && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.500"
                      mb={1}
                    >
                      {isImplemented ? "Test file" : "Suggested test file"}
                    </Text>
                    <HStack gap={2}>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="gray.700"
                        wordBreak="break-all"
                      >
                        {test.suggestedTestFile}
                      </Text>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="blue"
                        flexShrink={0}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.openFileInEditor(test.suggestedTestFile);
                            toaster.create({
                              title: "Opened in VS Code",
                              type: "success",
                            });
                          } catch (error) {
                            toaster.create({
                              title: "Failed to open file",
                              description:
                                error?.response?.data?.message ||
                                "Make sure VS Code is accessible via the 'code' command.",
                              type: "error",
                            });
                          }
                        }}
                      >
                        <ExternalLink size={12} />
                        Open in editor
                      </Button>
                    </HStack>
                  </Box>
                )}

                {test.scenarios ? (
                  <TestCaseDetails scenarios={test.scenarios} />
                ) : null}

                {Array.isArray(test.actionHistory) &&
                  test.actionHistory.length > 0 && (
                    <Box borderWidth="1px" borderRadius="md" p={3}>
                      <Text fontSize="xs" fontWeight="semibold" mb={2}>
                        Action History
                      </Text>
                      {test.actionHistory.map((action) => (
                        <Text key={action.id} fontSize="xs" color="gray.700">
                          {action.action} • {action.status} • {action.timestamp}
                        </Text>
                      ))}
                    </Box>
                  )}

                {implementLogs?.[test.id] && (
                  <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontSize="xs" fontWeight="semibold" mb={2}>
                      Implementation Logs
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
                      {implementLogs[test.id]}
                    </Box>
                  </Box>
                )}
              </VStack>
            </Table.Cell>
          </Table.Row>
        )}
      </Fragment>
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

  const filterTest = (test) => {
    const impl = test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
    const blocked = !!test.blockedBy;
    if (impl) return filterImplemented;
    if (blocked) return filterBlocked;
    return filterMissing;
  };

  const implementedCount = allTests.filter(
    (t) => t.actionStatus === TESTING_ACTION_STATUS.COMPLETED,
  ).length;
  const blockedCount = allTests.filter(
    (t) => !!t.blockedBy && t.actionStatus !== TESTING_ACTION_STATUS.COMPLETED,
  ).length;
  const missingCount = allTests.filter(
    (t) => !t.blockedBy && t.actionStatus !== TESTING_ACTION_STATUS.COMPLETED,
  ).length;

  const unitTests = sortByPriority(
    (editedMissingTests.unit || []).filter(filterTest),
  );
  const integrationTests = sortByPriority(
    (editedMissingTests.integration || []).filter(filterTest),
  );
  const e2eTests = sortByPriority(
    (editedMissingTests.e2e || []).filter(filterTest),
  );
  const selectedReadyCount = allTests.filter(
    (test) => effectiveSelectedTestIds.has(test.id) && isSelectableTest(test),
  ).length;
  const allSelectableSelected =
    selectableTestIds.size > 0 &&
    [...selectableTestIds].every((id) => effectiveSelectedTestIds.has(id));
  const someSelectableSelected = [...selectableTestIds].some((id) =>
    effectiveSelectedTestIds.has(id),
  );

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <HStack gap={4}>
          <Checkbox
            checked={filterImplemented}
            onCheckedChange={(e) => setFilterImplemented(e.checked)}
            colorPalette="green"
            size="sm"
          >
            Implemented ({implementedCount})
          </Checkbox>
          <Checkbox
            checked={filterMissing}
            onCheckedChange={(e) => setFilterMissing(e.checked)}
            colorPalette="orange"
            size="sm"
          >
            Missing ({missingCount})
          </Checkbox>
          <Checkbox
            checked={filterBlocked}
            onCheckedChange={(e) => setFilterBlocked(e.checked)}
            colorPalette="gray"
            size="sm"
          >
            Blocked ({blockedCount})
          </Checkbox>
        </HStack>
        <HStack gap={3}>
          <Checkbox
            checked={allSelectableSelected}
            indeterminate={someSelectableSelected && !allSelectableSelected}
            onCheckedChange={(e) => handleSelectAll(e.checked)}
            colorPalette="green"
            size="sm"
            disabled={selectableTestIds.size === 0}
          >
            Select all
          </Checkbox>
          <Button
            size="sm"
            colorPalette="green"
            onClick={handleBatchImplement}
            disabled={selectedReadyCount === 0 || !onImplementBatchTests}
            loading={isBatchImplementing}
            loadingText="Queueing"
          >
            <Check size={14} />
            {selectedReadyCount > 0
              ? `Implement (${selectedReadyCount})`
              : "Implement selected"}
          </Button>
        </HStack>
      </HStack>

      {/* Unit Tests Accordion */}
      {unitTests.length > 0 && (
        <TestTypeAccordion
          title="Unit Tests"
          tests={unitTests}
          colorPalette="purple"
          changeType={getGroupChangeType(unitTests)}
          defaultOpen={true}
        >
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader width="40px"></Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">ID</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Priority</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader width="100px">Status</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Change</Table.ColumnHeader>
                  <Table.ColumnHeader width="44px"></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {unitTests.map((test) => renderTestRow(test))}
              </Table.Body>
            </Table.Root>
          </Box>
        </TestTypeAccordion>
      )}

      {/* Integration Tests Accordion */}
      {integrationTests.length > 0 && (
        <TestTypeAccordion
          title="Integration Tests"
          tests={integrationTests}
          colorPalette="blue"
          changeType={getGroupChangeType(integrationTests)}
          defaultOpen={true}
        >
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader width="40px"></Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">ID</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Priority</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader width="100px">Status</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Change</Table.ColumnHeader>
                  <Table.ColumnHeader width="44px"></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {integrationTests.map((test) => renderTestRow(test))}
              </Table.Body>
            </Table.Root>
          </Box>
        </TestTypeAccordion>
      )}

      {/* E2E Tests Accordion */}
      {e2eTests.length > 0 && (
        <TestTypeAccordion
          title="End-to-End Tests"
          tests={e2eTests}
          colorPalette="green"
          changeType={getGroupChangeType(e2eTests)}
          defaultOpen={true}
        >
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader width="40px"></Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">ID</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Priority</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader width="100px">Status</Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">Change</Table.ColumnHeader>
                  <Table.ColumnHeader width="44px"></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {e2eTests.map((test) => renderTestRow(test))}
              </Table.Body>
            </Table.Root>
          </Box>
        </TestTypeAccordion>
      )}
    </VStack>
  );
}
