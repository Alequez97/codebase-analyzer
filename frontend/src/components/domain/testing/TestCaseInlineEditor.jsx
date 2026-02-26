import { useState, forwardRef, useImperativeHandle, useEffect } from "react";


import { useTestingEditorStore } from "../../../store/useTestingEditorStore";
import { ASSERTION_TYPES } from "./utils";

function TestCaseInlineEditor({ test, onSave, onCancel }, ref) {
  const { setEditedTestCases, getEditedTestCases } = useTestingEditorStore();

  const normalizedTestCases = (test.scenarios || []).map((scenario) => ({
    ...scenario,
    cases: (scenario.checks || []).map((check) => ({
      ...check,
      input: Array.isArray(check.input)
        ? check.input
        : [{ field: "", value: "" }],
    })),
  }));

  // Get edited test cases from store or use normalized
  const storedTestCases = getEditedTestCases(test.id);
  const initialTestCases = storedTestCases || normalizedTestCases;

  const [editedTestCases, setLocalEditedTestCases] = useState(initialTestCases);
  const [activeTab, setActiveTab] = useState(0);

  // Sync local state to store immediately (auto-save)
  useEffect(() => {
    setEditedTestCases(test.id, editedTestCases);
  }, [editedTestCases, test.id]);

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
    setLocalEditedTestCases(newTestCases);
    setActiveTab(newTestCases.length - 1); // Switch to the newly created tab
  };

  const removeTestCase = (index) => {
    const newTestCases = editedTestCases.filter((_, i) => i !== index);
    setLocalEditedTestCases(newTestCases);
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
    setLocalEditedTestCases(updated);
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
    setLocalEditedTestCases(updated);
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
    setLocalEditedTestCases(updated);
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
    setLocalEditedTestCases(updated);
  };

  // Input field management
  const addInputField = (testCaseIndex, caseIndex) => {
    const updated = [...editedTestCases];
    const currentCase = updated[testCaseIndex].cases[caseIndex];
    currentCase.input = [
      ...(Array.isArray(currentCase.input) ? currentCase.input : []),
      { field: "", value: "" },
    ];
    setLocalEditedTestCases(updated);
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
    setLocalEditedTestCases(updated);
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
    setLocalEditedTestCases(updated);
  };

  const handleSave = () => {
    const scenarios = editedTestCases.map((scenario) => ({
      ...scenario,
      checks: scenario.cases || [],
    }));
    onSave({ ...test, scenarios });
  };

  // Expose save and cancel methods to parent
  useImperativeHandle(ref, () => ({
    save: handleSave,
    cancel: onCancel,
  }));

  return (
    <Box>
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
                      Checks ({(testCase.cases || []).length})
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
                                <HStack
                                  key={inputIndex}
                                  gap={2}
                                  p={2}
                                  bg="white"
                                  borderWidth="1px"
                                  borderColor="gray.200"
                                  borderRadius="sm"
                                >
                                  <Input
                                    size="xs"
                                    placeholder="Field name"
                                    value={inputField.field || ""}
                                    width="33%"
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
                                  <Input
                                    size="xs"
                                    placeholder="Field value"
                                    value={inputField.value || ""}
                                    flex={1}
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
    </Box>
  );
}

export const TestCaseInlineEditorComponent = forwardRef(TestCaseInlineEditor);
