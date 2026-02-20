import { useState, Fragment } from "react";
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
  Input,
  Textarea,
  Tabs,
  NativeSelectRoot,
  NativeSelectField,
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
  Edit2,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "../ui/card";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "../ui/dialog";
import { Alert } from "../ui/alert";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";

// Essential assertion types for common testing scenarios
const ASSERTION_TYPES = [
  { value: "toBe", label: "To Be (===)" },
  { value: "toEqual", label: "To Equal (deep)" },
  { value: "toBeTruthy", label: "To Be Truthy" },
  { value: "resolves", label: "Resolves" },
  { value: "rejects", label: "Rejects" },
  { value: "toThrow", label: "To Throw" },
  { value: "toHaveProperty", label: "To Have Property" },
  { value: "toBeVisible", label: "To Be Visible" },
];

// Utility to format assertion type for display
function formatAssertionType(assertionType) {
  const option = ASSERTION_TYPES.find((opt) => opt.value === assertionType);
  return option ? option.label : assertionType;
}

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
        Test Scenarios ({testCases.length})
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
          <VStack align="stretch" gap={3}>
            <Text fontWeight="semibold" fontSize="sm" color="blue.700">
              {index + 1}. {testCase.scenario}
            </Text>

            {/* Render cases array (new structure) */}
            {Array.isArray(testCase.cases) && testCase.cases.length > 0 ? (
              <VStack align="stretch" gap={2}>
                {testCase.cases.map((testCaseItem, caseIndex) => (
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
                          Case {caseIndex + 1}
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
            ) : /* Legacy format support: inputs array */
            Array.isArray(testCase.inputs) && testCase.inputs.length > 0 ? (
              <VStack align="stretch" gap={2}>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="gray.600"
                    mb={1}
                  >
                    Inputs ({testCase.inputs.length}):
                  </Text>
                  <Stack gap={1}>
                    {testCase.inputs.map((input, inputIndex) => (
                      <Code
                        key={inputIndex}
                        fontSize="xs"
                        p={2}
                        bg="gray.100"
                        borderRadius="sm"
                        display="block"
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                      >
                        • {input}
                      </Code>
                    ))}
                  </Stack>
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
                    {testCase.expectedOutput}
                  </Code>
                </Box>
                <HStack gap={2}>
                  <Badge size="xs" colorPalette="purple">
                    {formatAssertionType(testCase.assertionType)}
                  </Badge>
                </HStack>
              </VStack>
            ) : /* Legacy format support: single input field */
            testCase.input ? (
              <VStack align="stretch" gap={2}>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="gray.600"
                    mb={1}
                  >
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
                    {testCase.expectedOutput}
                  </Code>
                </Box>
                <HStack gap={2}>
                  <Badge size="xs" colorPalette="purple">
                    {formatAssertionType(testCase.assertionType)}
                  </Badge>
                </HStack>
              </VStack>
            ) : (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                No test case details available
              </Text>
            )}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

function TestCaseEditorModal({ test, onSave, onClose }) {
  // Normalize test cases to ensure cases is always an array with structured input
  const normalizedTestCases = (test.testCases || []).map((tc) => {
    // New structure: cases array exists
    if (Array.isArray(tc.cases) && tc.cases.length > 0) {
      return {
        ...tc,
        cases: tc.cases.map((c) => ({
          ...c,
          // Ensure input is an array of field/value objects
          input: Array.isArray(c.input)
            ? c.input
            : typeof c.input === "string"
              ? [{ field: "value", value: c.input }]
              : [{ field: "", value: "" }],
        })),
      };
    }
    // Legacy: inputs array with shared expectedOutput/assertionType
    if (Array.isArray(tc.inputs) && tc.inputs.length > 0) {
      return {
        ...tc,
        cases: tc.inputs.map((input) => ({
          input:
            typeof input === "string"
              ? [{ field: "value", value: input }]
              : [{ field: "", value: "" }],
          expectedOutput: tc.expectedOutput || "",
          assertionType: tc.assertionType || "toBeTruthy",
        })),
      };
    }
    // Legacy: single input field
    if (tc.input) {
      return {
        ...tc,
        cases: [
          {
            input: [{ field: "value", value: tc.input }],
            expectedOutput: tc.expectedOutput || "",
            assertionType: tc.assertionType || "toBeTruthy",
          },
        ],
      };
    }
    // Fallback: empty case
    return {
      ...tc,
      cases: [
        {
          input: [{ field: "", value: "" }],
          expectedOutput: "",
          assertionType: "toBeTruthy",
        },
      ],
    };
  });

  const [editedTestCases, setEditedTestCases] = useState(normalizedTestCases);
  const [activeTab, setActiveTab] = useState(0);

  const addTestCase = () => {
    const newTestCases = [
      ...editedTestCases,
      {
        scenario: "",
        cases: [
          {
            input: [{ field: "", value: "" }],
            expectedOutput: "",
            assertionType: "toBeTruthy",
          },
        ],
      },
    ];
    setEditedTestCases(newTestCases);
    setActiveTab(newTestCases.length - 1); // Switch to the newly created tab
  };

  const removeTestCase = (index) => {
    const newTestCases = editedTestCases.filter((_, i) => i !== index);
    setEditedTestCases(newTestCases);
    // Adjust active tab if needed
    if (activeTab >= newTestCases.length && newTestCases.length > 0) {
      setActiveTab(newTestCases.length - 1);
    } else if (newTestCases.length === 0) {
      setActiveTab(0);
    }
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...editedTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setEditedTestCases(updated);
  };

  const addCase = (testCaseIndex) => {
    const updated = [...editedTestCases];
    updated[testCaseIndex].cases = [
      ...(updated[testCaseIndex].cases || []),
      {
        input: [{ field: "", value: "" }],
        expectedOutput: "",
        assertionType: "toBeTruthy",
      },
    ];
    setEditedTestCases(updated);
  };

  const updateCase = (testCaseIndex, caseIndex, field, value) => {
    const updated = [...editedTestCases];
    if (!updated[testCaseIndex].cases) {
      updated[testCaseIndex].cases = [];
    }
    updated[testCaseIndex].cases[caseIndex] = {
      ...updated[testCaseIndex].cases[caseIndex],
      [field]: value,
    };
    setEditedTestCases(updated);
  };

  const removeCase = (testCaseIndex, caseIndex) => {
    const updated = [...editedTestCases];
    updated[testCaseIndex].cases = (updated[testCaseIndex].cases || []).filter(
      (_, i) => i !== caseIndex,
    );
    // Prevent removing all cases - keep at least one
    if (updated[testCaseIndex].cases.length === 0) {
      updated[testCaseIndex].cases = [
        {
          input: [{ field: "", value: "" }],
          expectedOutput: "",
          assertionType: "toBeTruthy",
        },
      ];
    }
    setEditedTestCases(updated);
  };

  // Input field management
  const addInputField = (testCaseIndex, caseIndex) => {
    const updated = [...editedTestCases];
    const currentCase = updated[testCaseIndex].cases[caseIndex];
    currentCase.input = [
      ...(Array.isArray(currentCase.input) ? currentCase.input : []),
      { field: "", value: "" },
    ];
    setEditedTestCases(updated);
  };

  const updateInputField = (
    testCaseIndex,
    caseIndex,
    inputIndex,
    fieldName,
    value,
  ) => {
    const updated = [...editedTestCases];
    const currentCase = updated[testCaseIndex].cases[caseIndex];
    if (!Array.isArray(currentCase.input)) {
      currentCase.input = [];
    }
    currentCase.input[inputIndex] = {
      ...currentCase.input[inputIndex],
      [fieldName]: value,
    };
    setEditedTestCases(updated);
  };

  const removeInputField = (testCaseIndex, caseIndex, inputIndex) => {
    const updated = [...editedTestCases];
    const currentCase = updated[testCaseIndex].cases[caseIndex];
    currentCase.input = (
      Array.isArray(currentCase.input) ? currentCase.input : []
    ).filter((_, i) => i !== inputIndex);
    // Keep at least one input field
    if (currentCase.input.length === 0) {
      currentCase.input = [{ field: "", value: "" }];
    }
    setEditedTestCases(updated);
  };

  const handleSave = () => {
    onSave({ ...test, testCases: editedTestCases });
    onClose();
  };

  return (
    <DialogContent maxWidth="900px">
      <DialogHeader>
        <DialogTitle>Edit Test Cases - {test.id}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        {editedTestCases.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" mb={4}>
              No scenarios yet. Add your first scenario to get started.
            </Text>
            <Button colorPalette="blue" onClick={addTestCase}>
              <Plus size={16} />
              Add First Scenario
            </Button>
          </Box>
        ) : (
          <Tabs.Root
            value={activeTab.toString()}
            onValueChange={(e) => setActiveTab(parseInt(e.value))}
          >
            <Tabs.List>
              {editedTestCases.map((testCase, tcIndex) => (
                <Tabs.Trigger key={tcIndex} value={tcIndex.toString()}>
                  {testCase.scenario || `Scenario ${tcIndex + 1}`}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {editedTestCases.map((testCase, tcIndex) => (
              <Tabs.Content
                key={tcIndex}
                value={tcIndex.toString()}
                maxHeight="500px"
                overflowY="auto"
                pt={4}
              >
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text fontWeight="semibold" fontSize="sm" color="blue.700">
                      Scenario {tcIndex + 1}
                    </Text>
                    <IconButton
                      size="xs"
                      colorPalette="red"
                      variant="ghost"
                      onClick={() => removeTestCase(tcIndex)}
                      title="Delete Scenario"
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </HStack>

                  <Box>
                    <Text fontSize="xs" fontWeight="medium" mb={1}>
                      Scenario Description
                    </Text>
                    <Input
                      size="sm"
                      placeholder="Description of what this scenario verifies"
                      value={testCase.scenario}
                      onChange={(e) =>
                        updateTestCase(tcIndex, "scenario", e.target.value)
                      }
                    />
                  </Box>

                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="xs" fontWeight="medium" color="gray.700">
                        Test Cases ({(testCase.cases || []).length})
                      </Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="blue"
                        onClick={() => addCase(tcIndex)}
                      >
                        <Plus size={12} />
                        Add Case
                      </Button>
                    </HStack>
                    <VStack align="stretch" gap={3}>
                      {(testCase.cases || []).map((testCaseItem, caseIndex) => (
                        <Box
                          key={caseIndex}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.300"
                        >
                          <VStack align="stretch" gap={2}>
                            <HStack justify="space-between" align="center">
                              <Text
                                fontSize="xs"
                                fontWeight="semibold"
                                color="gray.600"
                              >
                                Case {caseIndex + 1}
                              </Text>
                              {(testCase.cases || []).length > 1 && (
                                <IconButton
                                  size="xs"
                                  colorPalette="red"
                                  variant="ghost"
                                  onClick={() => removeCase(tcIndex, caseIndex)}
                                >
                                  <Trash2 size={12} />
                                </IconButton>
                              )}
                            </HStack>

                            <Box>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="xs" fontWeight="medium">
                                  Input Fields
                                </Text>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  colorPalette="blue"
                                  onClick={() =>
                                    addInputField(tcIndex, caseIndex)
                                  }
                                >
                                  <Plus size={10} />
                                  Add Field
                                </Button>
                              </HStack>
                              <VStack align="stretch" gap={2}>
                                {(Array.isArray(testCaseItem.input)
                                  ? testCaseItem.input
                                  : []
                                ).map((inputField, inputIndex) => (
                                  <Box
                                    key={inputIndex}
                                    p={2}
                                    bg="white"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    borderRadius="sm"
                                  >
                                    <VStack align="stretch" gap={2}>
                                      <HStack gap={2} align="start">
                                        <Box flex={1}>
                                          <Text
                                            fontSize="xs"
                                            fontWeight="medium"
                                            mb={1}
                                          >
                                            Field Name
                                          </Text>
                                          <Input
                                            size="xs"
                                            placeholder="e.g., password, email, token"
                                            value={inputField.field || ""}
                                            onChange={(e) =>
                                              updateInputField(
                                                tcIndex,
                                                caseIndex,
                                                inputIndex,
                                                "field",
                                                e.target.value,
                                              )
                                            }
                                          />
                                        </Box>
                                        {(Array.isArray(testCaseItem.input)
                                          ? testCaseItem.input
                                          : []
                                        ).length > 1 && (
                                          <IconButton
                                            size="xs"
                                            colorPalette="red"
                                            variant="ghost"
                                            onClick={() =>
                                              removeInputField(
                                                tcIndex,
                                                caseIndex,
                                                inputIndex,
                                              )
                                            }
                                          >
                                            <Trash2 size={10} />
                                          </IconButton>
                                        )}
                                      </HStack>
                                      <Box>
                                        <Text
                                          fontSize="xs"
                                          fontWeight="medium"
                                          mb={1}
                                        >
                                          Value
                                        </Text>
                                        <Textarea
                                          size="xs"
                                          rows={2}
                                          placeholder="Field value to test"
                                          value={inputField.value || ""}
                                          onChange={(e) =>
                                            updateInputField(
                                              tcIndex,
                                              caseIndex,
                                              inputIndex,
                                              "value",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </Box>
                                    </VStack>
                                  </Box>
                                ))}
                              </VStack>
                            </Box>

                            <Box>
                              <Text fontSize="xs" fontWeight="medium" mb={1}>
                                Expected Output
                              </Text>
                              <Textarea
                                size="sm"
                                rows={2}
                                placeholder="What should happen for this input"
                                value={testCaseItem.expectedOutput}
                                onChange={(e) =>
                                  updateCase(
                                    tcIndex,
                                    caseIndex,
                                    "expectedOutput",
                                    e.target.value,
                                  )
                                }
                              />
                            </Box>

                            <Box>
                              <Text fontSize="xs" fontWeight="medium" mb={1}>
                                Assertion Type
                              </Text>
                              <NativeSelectRoot size="sm">
                                <NativeSelectField
                                  value={testCaseItem.assertionType}
                                  onChange={(e) =>
                                    updateCase(
                                      tcIndex,
                                      caseIndex,
                                      "assertionType",
                                      e.target.value,
                                    )
                                  }
                                >
                                  {ASSERTION_TYPES.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </NativeSelectField>
                              </NativeSelectRoot>
                            </Box>
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        )}

        {editedTestCases.length > 0 && (
          <Box mt={4}>
            <Button
              variant="outline"
              colorPalette="blue"
              onClick={addTestCase}
              width="full"
            >
              <Plus size={16} />
              Add Scenario
            </Button>
          </Box>
        )}
      </DialogBody>
      <DialogFooter>
        <HStack gap={2}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button colorPalette="blue" onClick={handleSave}>
            Save Changes
          </Button>
        </HStack>
      </DialogFooter>
    </DialogContent>
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
  const [editingTest, setEditingTest] = useState(null);
  const [editedMissingTests, setEditedMissingTests] = useState(missingTests);

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

  const handleSaveTestCases = (updatedTest) => {
    // Update the test in the appropriate category
    const updated = { ...editedMissingTests };
    ["unit", "integration", "e2e"].forEach((type) => {
      if (updated[type]) {
        updated[type] = updated[type].map((t) =>
          t.id === updatedTest.id ? updatedTest : t,
        );
      }
    });
    setEditedMissingTests(updated);
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
                        <IconButton
                          size="xs"
                          colorPalette="blue"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTest(test);
                          }}
                          title="Edit test cases"
                        >
                          <Edit2 size={14} />
                        </IconButton>
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
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}

            {/* Integration Tests */}
            {editedMissingTests.integration?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
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
                        <IconButton
                          size="xs"
                          colorPalette="blue"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTest(test);
                          }}
                          title="Edit test cases"
                        >
                          <Edit2 size={14} />
                        </IconButton>
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
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}

            {/* E2E Tests */}
            {editedMissingTests.e2e?.map((test) => {
              const isExpanded = expandedTests.has(test.id);
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
                        <IconButton
                          size="xs"
                          colorPalette="blue"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTest(test);
                          }}
                          title="Edit test cases"
                        >
                          <Edit2 size={14} />
                        </IconButton>
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
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && test.testCases && (
                    <Table.Row key={`${test.id}-details`}>
                      <Table.Cell colSpan={7} bg="gray.50" p={4}>
                        <TestCaseDetails testCases={test.testCases} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Test Case Editor Dialog */}
      <DialogRoot
        open={!!editingTest}
        onOpenChange={(e) => !e.open && setEditingTest(null)}
      >
        {editingTest && (
          <TestCaseEditorModal
            test={editingTest}
            onSave={handleSaveTestCases}
            onClose={() => setEditingTest(null)}
          />
        )}
      </DialogRoot>
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
