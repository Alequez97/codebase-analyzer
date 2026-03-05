import {
  Badge,
  Box,
  Grid,
  HStack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Alert } from "../../ui/alert";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "../../../store/useRefactoringAndTestingEditorStore";
import { sortByPriority } from "./utils";
import { TestTableRow } from "./TestTableRow";

const TEST_TYPES = [
  { key: "unit", label: "Unit", palette: "purple" },
  { key: "integration", label: "Integration", palette: "blue" },
  { key: "e2e", label: "E2E", palette: "green" },
];

export function MissingTestsSection({
  missingTests,
  applyingTests,
  applyLogs,
  onApplyTest,
  onApplyTestEdits,
  domainId,
}) {
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
          All critical tests are in place! 🎉
        </Alert.Description>
      </Alert.Root>
    );
  }

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
            {TEST_TYPES.map(({ key, label, palette }) =>
              sortByPriority(editedMissingTests[key])?.map((test) => (
                <TestTableRow
                  key={test.id}
                  test={test}
                  typeLabel={label}
                  typePalette={palette}
                  domainId={domainId}
                  applyingTests={applyingTests}
                  applyLogs={applyLogs}
                  onApplyTest={onApplyTest}
                  onApplyTestEdits={onApplyTestEdits}
                />
              )),
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
}

