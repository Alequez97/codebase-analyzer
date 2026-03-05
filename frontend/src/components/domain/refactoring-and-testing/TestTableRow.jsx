import { Fragment, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, ChevronDown, ChevronRight, Edit2, X } from "lucide-react";
import { useRefactoringAndTestingEditorStore as useTestingEditorStore } from "../../../store/useRefactoringAndTestingEditorStore";
import { TESTING_ACTION_STATUS } from "../../../constants/testing-actions";
import { TestCaseDetails } from "./TestCaseDetails";
import { TestCaseInlineEditorComponent } from "./TestCaseInlineEditor";
import { getPriorityColor } from "./utils";
import { InfoTooltip } from "../../ui/info-tooltip";

export function TestTableRow({
  test,
  typeLabel,
  typePalette,
  domainId,
  applyingTests,
  applyLogs,
  onApplyTest,
  onApplyTestEdits,
  sourceFiles = [],
  refactoringTargetFunction,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef(null);

  const {
    editingTestId,
    updateTestInMissingTests,
    markPendingEditedTest,
    hasPendingEditedTest,
    setEditingTest,
    clearEditingTest,
  } = useTestingEditorStore();

  const isApplied = test.actionStatus === TESTING_ACTION_STATUS.COMPLETED;
  const isApplying = !!applyingTests[test.id];
  const hasPendingEdits = hasPendingEditedTest(domainId, test.id);
  const isBlocked = !!test.blockedBy;

  const handleSaveTestCases = (updatedTest) => {
    updateTestInMissingTests(domainId, updatedTest);
    if (test.actionStatus === TESTING_ACTION_STATUS.COMPLETED) {
      markPendingEditedTest(domainId, updatedTest.id);
    }
  };

  const renderActionButton = () => {
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
        <Button size="xs" colorPalette="orange" variant="subtle" disabled>
          Blocked
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

  return (
    <Fragment>
      <Table.Row
        id={test.id}
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
        onClick={() => setIsExpanded((prev) => !prev)}
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
          <Badge colorPalette={typePalette} size="sm">
            {typeLabel}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <Badge colorPalette={getPriorityColor(test.priority)} size="sm">
            {test.priority}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <HStack gap={1.5} align="center">
            <Text fontSize="sm">{test.description}</Text>
            {test.reason && <InfoTooltip label={test.reason} />}
          </HStack>
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
        <Table.Cell>
          {isBlocked ? (
            <Text
              as="span"
              fontSize="xs"
              fontFamily="mono"
              fontWeight="semibold"
              color="orange.600"
              cursor="pointer"
              textDecoration="underline"
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById(test.blockedBy)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              {test.blockedBy}
            </Text>
          ) : null}
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
            {renderActionButton()}
          </HStack>
        </Table.Cell>
      </Table.Row>

      {isExpanded && (
        <Table.Row key={`${test.id}-details`}>
          <Table.Cell colSpan={8} bg="gray.50" p={4}>
            {editingTestId === test.id ? (
              <TestCaseInlineEditorComponent
                ref={editorRef}
                test={test}
                onSave={(updatedTest) => {
                  handleSaveTestCases(updatedTest);
                  clearEditingTest();
                }}
                onCancel={() => clearEditingTest()}
              />
            ) : (
              <VStack align="stretch" gap={3}>
                {sourceFiles.length > 0 && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="gray.50"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.600"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Files being tested
                    </Text>
                    <VStack align="stretch" gap={1}>
                      {sourceFiles.map((file) => (
                        <HStack key={file} gap={2}>
                          <Text
                            fontSize="xs"
                            fontFamily="mono"
                            color="blue.700"
                            bg="blue.50"
                            px={2}
                            py={0.5}
                            borderRadius="sm"
                            borderWidth="1px"
                            borderColor="blue.200"
                          >
                            {file}
                          </Text>
                          {refactoringTargetFunction && (
                            <Badge
                              colorPalette="blue"
                              size="sm"
                              variant="outline"
                            >
                              {refactoringTargetFunction}()
                            </Badge>
                          )}
                        </HStack>
                      ))}
                    </VStack>
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

                {applyLogs?.[test.id] && (
                  <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontSize="xs" fontWeight="semibold" mb={2}>
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
}
