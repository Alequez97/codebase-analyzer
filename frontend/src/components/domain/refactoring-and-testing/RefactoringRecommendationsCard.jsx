import {
  Badge,
  Box,
  Button,
  Code,
  Heading,
  HStack,
  List,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertTriangle, CheckCircle, Clock, Code2 } from "lucide-react";
import { Card } from "../../ui/card";
import { Alert } from "../../ui/alert";
import { kebabCaseToDisplayName } from "../../../utils/domain-utils";
import { REFACTORING_STATUS } from "../../../constants/refactoring-status";

export function RefactoringRecommendationsCard({
  refactorings = [],
  onApplyRefactoring,
  onMarkCompleted,
  applyingRefactoringId = null,
  completedRefactoringId = null,
}) {
  if (!refactorings || refactorings.length === 0) {
    return (
      <Alert.Root status="success">
        <Alert.Indicator>
          <CheckCircle />
        </Alert.Indicator>
        <Alert.Description>
          <Text fontWeight="medium">Architecture is ready for testing</Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            No refactoring needed. Business logic is properly separated and
            ready for unit testing.
          </Text>
        </Alert.Description>
      </Alert.Root>
    );
  }

  const pendingRefactorings = refactorings.filter(
    (r) => r.status === REFACTORING_STATUS.PENDING,
  );
  const readyForReviewRefactorings = refactorings.filter(
    (r) => r.status === REFACTORING_STATUS.READY_FOR_REVIEW,
  );
  const completedRefactorings = refactorings.filter(
    (r) => r.status === REFACTORING_STATUS.COMPLETED,
  );

  return (
    <VStack gap={4} align="stretch">
      {/* Warning banner — only shown when there are pending refactorings */}
      {pendingRefactorings.length > 0 && (
        <Alert.Root status="warning">
          <Alert.Indicator>
            <AlertTriangle />
          </Alert.Indicator>
          <Alert.Description>
            <Text fontWeight="medium">
              {pendingRefactorings.length} refactoring
              {pendingRefactorings.length === 1 ? "" : "s"} needed before
              testing
            </Text>
            <Text fontSize="sm" color="gray.600" mt={1}>
              Apply recommended refactorings below to improve code testability
              and unblock pending tests.
            </Text>
          </Alert.Description>
        </Alert.Root>
      )}

      {/* Pending refactorings — orange */}
      {pendingRefactorings.length > 0 && (
        <VStack gap={3} align="stretch">
          {pendingRefactorings.map((refactoring) => (
            <RefactoringCard
              key={refactoring.id}
              refactoring={refactoring}
              onApply={onApplyRefactoring}
              isApplying={applyingRefactoringId === refactoring.id}
              isJustCompleted={completedRefactoringId === refactoring.id}
            />
          ))}
        </VStack>
      )}

      {/* Ready for review refactorings — blue */}
      {readyForReviewRefactorings.length > 0 && (
        <Box>
          <Heading size="sm" mb={2} color="blue.600">
            🔍 Ready for Review ({readyForReviewRefactorings.length})
          </Heading>
          <VStack gap={3} align="stretch">
            {readyForReviewRefactorings.map((refactoring) => (
              <ReadyForReviewCard
                key={refactoring.id}
                refactoring={refactoring}
                onMarkCompleted={onMarkCompleted}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Completed refactorings — green */}
      {completedRefactorings.length > 0 && (
        <Box>
          <Heading size="sm" mb={2} color="green.600">
            ✅ Completed ({completedRefactorings.length})
          </Heading>
          <VStack gap={2} align="stretch">
            {completedRefactorings.map((refactoring) => (
              <Card.Root
                key={refactoring.id}
                variant="subtle"
                bg="green.50"
                borderColor="green.200"
              >
                <Card.Body py={2} px={3}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium">
                      {refactoring.title}
                    </Text>
                    <Badge colorPalette="green" size="sm">
                      Completed
                    </Badge>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case "P0":
      return "red";
    case "P1":
      return "orange";
    case "P2":
      return "yellow";
    default:
      return "gray";
  }
}

function RefactoringCardBody({ refactoring }) {
  return (
    <VStack align="stretch" gap={3}>
      {/* Issue description */}
      <Alert.Root status="info" size="sm">
        <Alert.Indicator />
        <Alert.Description>
          <Text fontSize="sm">{refactoring.issue}</Text>
        </Alert.Description>
      </Alert.Root>

      {/* Target location */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          📁 Target:
        </Text>
        <Code fontSize="xs" display="block" p={2} borderRadius="md">
          {refactoring.targetFile}
          {refactoring.targetFunction && ` → ${refactoring.targetFunction}()`}
          {refactoring.startLine && (
            <Text as="span" color="gray.500" ml={2}>
              (lines {refactoring.startLine}-{refactoring.endLine})
            </Text>
          )}
        </Code>
      </Box>

      {/* Extraction plan */}
      {refactoring.extractionPlan && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            🔧 Extraction Plan:
          </Text>
          <Box bg="white" p={3} borderRadius="md" borderWidth="1px">
            <VStack align="stretch" gap={2}>
              <HStack gap={2}>
                <Code2 size={14} />
                <Text fontSize="sm">
                  Create{" "}
                  <Code fontSize="xs">
                    {refactoring.extractionPlan.newServiceFile}
                  </Code>
                </Text>
              </HStack>
              {refactoring.extractionPlan.extractedFunctions?.map(
                (func, idx) => (
                  <Box
                    key={idx}
                    pl={4}
                    borderLeftWidth="2px"
                    borderLeftColor="purple.200"
                  >
                    <Text fontSize="sm" fontWeight="medium">
                      {func.name}()
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {func.purpose}
                    </Text>
                  </Box>
                ),
              )}
            </VStack>
          </Box>
        </Box>
      )}

      {/* Benefits */}
      {refactoring.benefits && refactoring.benefits.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            ✨ Benefits:
          </Text>
          <List.Root as="ul" fontSize="sm" color="gray.700" gap={1}>
            {refactoring.benefits.map((benefit, idx) => (
              <List.Item key={idx}>{benefit}</List.Item>
            ))}
          </List.Root>
        </Box>
      )}

      {/* Unblocks tests */}
      {refactoring.unblocks && refactoring.unblocks.length > 0 && (
        <Box>
          <HStack fontSize="sm" color="purple.700">
            <Text fontWeight="medium">
              🔓 Unblocks {refactoring.unblocks.length} test
              {refactoring.unblocks.length === 1 ? "" : "s"}:
            </Text>
            <HStack gap={1} wrap="wrap">
              {refactoring.unblocks.map((testId, i) => (
                <Text
                  key={testId}
                  as="span"
                  fontFamily="mono"
                  fontWeight="semibold"
                  color="purple.600"
                  cursor="pointer"
                  textDecoration="underline"
                  onClick={() =>
                    document
                      .getElementById(testId)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  {testId}
                  {i < refactoring.unblocks.length - 1 ? "," : ""}
                </Text>
              ))}
            </HStack>
          </HStack>
        </Box>
      )}
    </VStack>
  );
}

/** Orange card — pending, not yet applied */
function RefactoringCard({
  refactoring,
  onApply,
  isApplying,
  isJustCompleted,
}) {
  return (
    <Card.Root
      id={refactoring.id}
      variant="outline"
      borderColor={isApplying || isJustCompleted ? "blue.200" : "orange.200"}
      bg={isApplying || isJustCompleted ? "blue.50" : "orange.50"}
    >
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Header */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1} flex={1}>
              <HStack>
                <Badge colorPalette="gray" variant="outline" fontFamily="mono">
                  {refactoring.id}
                </Badge>
                <Badge colorPalette={getPriorityColor(refactoring.priority)}>
                  {refactoring.priority}
                </Badge>
                <Badge colorPalette="purple" variant="subtle">
                  {kebabCaseToDisplayName(refactoring.category)}
                </Badge>
                {isApplying && (
                  <Badge colorPalette="blue" variant="subtle">
                    <HStack gap={1}>
                      <Spinner size="xs" />
                      <Text>Task running</Text>
                    </HStack>
                  </Badge>
                )}
                {isJustCompleted && (
                  <Badge colorPalette="teal" variant="subtle">
                    Task completed
                  </Badge>
                )}
              </HStack>
              <Heading size="sm">{refactoring.title}</Heading>
            </VStack>
          </HStack>

          <RefactoringCardBody refactoring={refactoring} />

          {/* Footer */}
          <HStack justify="space-between" pt={2}>
            <HStack fontSize="xs" color="gray.500">
              <Clock size={12} />
              <Text>Est. {refactoring.estimatedEffort || "30 min"}</Text>
            </HStack>
            {isApplying ? (
              <Button colorPalette="blue" size="sm" disabled loading>
                Applying...
              </Button>
            ) : (
              <Button
                colorPalette="orange"
                size="sm"
                onClick={() => onApply?.(refactoring.id)}
              >
                Apply Refactoring
              </Button>
            )}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

/** Blue card — AI has completed the refactoring, awaiting user review */
function ReadyForReviewCard({ refactoring, onMarkCompleted }) {
  return (
    <Card.Root
      id={refactoring.id}
      variant="outline"
      borderColor="blue.200"
      bg="blue.50"
    >
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Header */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1} flex={1}>
              <HStack>
                <Badge colorPalette="gray" variant="outline" fontFamily="mono">
                  {refactoring.id}
                </Badge>
                <Badge colorPalette={getPriorityColor(refactoring.priority)}>
                  {refactoring.priority}
                </Badge>
                <Badge colorPalette="purple" variant="subtle">
                  {kebabCaseToDisplayName(refactoring.category)}
                </Badge>
                <Badge colorPalette="blue" variant="subtle">
                  Ready for Review
                </Badge>
              </HStack>
              <Heading size="sm">{refactoring.title}</Heading>
            </VStack>
          </HStack>

          <RefactoringCardBody refactoring={refactoring} />

          {/* Footer */}
          <HStack justify="space-between" pt={2}>
            <HStack fontSize="xs" color="gray.500">
              <Clock size={12} />
              <Text>Est. {refactoring.estimatedEffort || "30 min"}</Text>
            </HStack>
            <Button
              colorPalette="blue"
              size="sm"
              onClick={() => onMarkCompleted?.(refactoring.id)}
            >
              ✓ Mark as Complete
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
