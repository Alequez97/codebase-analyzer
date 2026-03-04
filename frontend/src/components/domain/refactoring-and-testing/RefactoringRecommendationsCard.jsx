import {
  Badge,
  Box,
  Button,
  Code,
  Heading,
  HStack,
  List,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertTriangle, CheckCircle, Clock, Code2 } from "lucide-react";
import { Card } from "../../ui/card";
import { Alert } from "../../ui/alert";
import { kebabCaseToDisplayName } from "../../../utils/domain-utils";

export function RefactoringRecommendationsCard({
  refactorings = [],
  onApplyRefactoring,
  applyingRefactoringId = null,
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
    (r) => r.status === "pending",
  );
  const appliedRefactorings = refactorings.filter(
    (r) => r.status === "applied",
  );

  return (
    <VStack gap={4} align="stretch">
      {/* Warning banner */}
      <Alert.Root status="warning">
        <Alert.Indicator>
          <AlertTriangle />
        </Alert.Indicator>
        <Alert.Description>
          <Text fontWeight="medium">
            {pendingRefactorings.length} refactoring
            {pendingRefactorings.length === 1 ? "" : "s"} needed before testing
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Apply recommended refactorings below to improve code testability and
            unblock pending tests.
          </Text>
        </Alert.Description>
      </Alert.Root>

      {/* Pending refactorings */}
      <VStack gap={3} align="stretch">
        {pendingRefactorings.map((refactoring) => (
          <RefactoringCard
            key={refactoring.id}
            refactoring={refactoring}
            onApply={onApplyRefactoring}
            isApplying={applyingRefactoringId === refactoring.id}
          />
        ))}
      </VStack>

      {/* Applied refactorings */}
      {appliedRefactorings.length > 0 && (
        <Box>
          <Heading size="sm" mb={2} color="green.600">
            ✅ Applied Refactorings ({appliedRefactorings.length})
          </Heading>
          <VStack gap={2} align="stretch">
            {appliedRefactorings.map((refactoring) => (
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
                      Applied
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

function RefactoringCard({ refactoring, onApply, isApplying }) {
  const getPriorityColor = (priority) => {
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
  };

  return (
    <Card.Root variant="outline" borderColor="orange.200" bg="orange.50">
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Header */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1} flex={1}>
              <HStack>
                <Badge colorPalette={getPriorityColor(refactoring.priority)}>
                  {refactoring.priority}
                </Badge>
                <Badge colorPalette="purple" variant="subtle">
                  {kebabCaseToDisplayName(refactoring.category)}
                </Badge>
              </HStack>
              <Heading size="sm">{refactoring.title}</Heading>
            </VStack>
          </HStack>

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
              {refactoring.targetFunction &&
                ` → ${refactoring.targetFunction}()`}
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
                <Text>{refactoring.unblocks.join(", ")}</Text>
              </HStack>
            </Box>
          )}

          {/* Footer */}
          <HStack justify="space-between" pt={2}>
            <HStack fontSize="xs" color="gray.500">
              <Clock size={12} />
              <Text>Est. {refactoring.estimatedEffort || "30 min"}</Text>
            </HStack>
            <Button
              colorPalette="orange"
              size="sm"
              onClick={() => onApply?.(refactoring.id)}
              loading={isApplying}
              disabled={isApplying}
            >
              {isApplying ? "Applying..." : "Apply Refactoring"}
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
