import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCheck } from "lucide-react";
import { Alert } from "../../ui/alert";
import { Checkbox } from "../../ui/checkbox";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "../../../store/useRefactoringAndTestingEditorStore";
import { TestTableRow } from "./TestTableRow";
import { TESTING_ACTION_STATUS } from "../../../constants/testing-actions";

const TEST_TYPES = [
  { key: "unit", label: "Unit", palette: "purple" },
  { key: "integration", label: "Integration", palette: "blue" },
  { key: "e2e", label: "E2E", palette: "green" },
];

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function MissingTestsSection({
  missingTests,
  refactoringRecommendations = [],
  implementingTests,
  implementLogs,
  onImplementTest,
  onImplementTestEdits,
  domainId,
}) {
  const refactoringById = new Map(
    refactoringRecommendations.map((r) => [r.id, r]),
  );
  const { setEditedMissingTests, getEditedMissingTests } =
    useTestingEditorStore();

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

  const hasTests =
    editedMissingTests?.unit?.length > 0 ||
    editedMissingTests?.integration?.length > 0 ||
    editedMissingTests?.e2e?.length > 0;

  if (!hasTests) {
    return (
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Description>
          All critical tests are in place! ??
        </Alert.Description>
      </Alert.Root>
    );
  }

  // Flatten all tests with type annotation, then sort: ready first, blocked last;
  // within each group sort by priority.
  const allTests = TEST_TYPES.flatMap(({ key, label, palette }) =>
    (editedMissingTests[key] || []).map((test) => ({
      test,
      typeLabel: label,
      typePalette: palette,
    })),
  );

  const sortedTests = [...allTests].sort((a, b) => {
    const aBlocked = a.test.blockedBy ? 1 : 0;
    const bBlocked = b.test.blockedBy ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return (
      (PRIORITY_ORDER[a.test.priority] ?? 99) -
      (PRIORITY_ORDER[b.test.priority] ?? 99)
    );
  });

  const readyTests = sortedTests.filter(
    ({ test }) =>
      !test.blockedBy &&
      test.actionStatus !== TESTING_ACTION_STATUS.COMPLETED &&
      !implementingTests[test.id],
  );

  const readyTestIdSet = new Set(readyTests.map(({ test }) => test.id));

  const [selectedTestIds, setSelectedTestIds] = useState(
    () => new Set(readyTests.map(({ test }) => test.id)),
  );

  const validSelectedIds = new Set(
    [...selectedTestIds].filter((id) => readyTestIdSet.has(id)),
  );

  const allReady =
    readyTests.length > 0 &&
    readyTests.every(({ test }) => validSelectedIds.has(test.id));
  const someReady = readyTests.some(({ test }) =>
    validSelectedIds.has(test.id),
  );

  const toggleSelectAll = () => {
    if (allReady) {
      setSelectedTestIds(new Set());
    } else {
      setSelectedTestIds(new Set(readyTests.map(({ test }) => test.id)));
    }
  };

  const toggleSelectTest = (testId) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  return (
    <VStack align="stretch" gap={3}>
      {/* Summary Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={3}>
        {TEST_TYPES.map(({ key, label, palette }) => {
          const count = editedMissingTests[key]?.length;
          if (!count) return null;
          return (
            <Box
              key={key}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg={`${palette}.50`}
              borderColor={`${palette}.200`}
            >
              <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="medium">
                  {label} Tests
                </Text>
                <Badge colorPalette={palette} size="sm">
                  {count}
                </Badge>
              </HStack>
            </Box>
          );
        })}
      </Grid>

      {/* Implement toolbar */}
      {readyTests.length > 0 && (
        <HStack justify="flex-end">
          <Button
            size="sm"
            colorPalette="green"
            variant="solid"
            disabled={validSelectedIds.size === 0}
            onClick={() =>
              [...validSelectedIds].forEach((id) => onImplementTest?.(id))
            }
          >
            <CheckCheck size={14} />
            Implement ({validSelectedIds.size})
          </Button>
        </HStack>
      )}

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
              <Table.ColumnHeader width="120px">Blocked By</Table.ColumnHeader>
              <Table.ColumnHeader width="140px" textAlign="center">
                Actions
              </Table.ColumnHeader>
              <Table.ColumnHeader width="50px" textAlign="center">
                <Checkbox
                  checked={
                    allReady ? true : someReady ? "indeterminate" : false
                  }
                  onChange={toggleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                />
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedTests.map(({ test, typeLabel, typePalette }) => {
              const refactoring = test.blockedBy
                ? refactoringById.get(test.blockedBy)
                : null;
              const sourceFiles =
                test.sourceFiles ||
                (refactoring?.targetFile ? [refactoring.targetFile] : []);
              return (
                <TestTableRow
                  key={test.id}
                  test={test}
                  typeLabel={typeLabel}
                  typePalette={typePalette}
                  domainId={domainId}
                  implementingTests={implementingTests}
                  implementLogs={implementLogs}
                  onImplementTest={onImplementTest}
                  onImplementTestEdits={onImplementTestEdits}
                  sourceFiles={sourceFiles}
                  refactoringTargetFunction={refactoring?.targetFunction}
                  isSelected={validSelectedIds.has(test.id)}
                  onToggleSelect={toggleSelectTest}
                />
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
}
