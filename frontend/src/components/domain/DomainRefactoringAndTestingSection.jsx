import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Collapsible,
  Heading,
  HStack,
  IconButton,
  Separator,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight, Sparkles, TestTube } from "lucide-react";
import {
  ExistingTestsTable,
  MissingTestsSection,
  RefactoringRecommendationsCard,
} from "./refactoring-and-testing";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";
import SectionProgressBanner from "./SectionProgressBanner";
import AnalyzeWithContextDialog from "./AnalyzeWithContextDialog";

export default function DomainRefactoringAndTestingSection({
  domainId,
  testing,
  loading,
  progress,
  applyingTests,
  applyLogs,
  onAnalyze,
  onApplyTest,
  onApplyTestEdits,
  onApplyRefactoring,
  onMarkCompleted = null,
  applyingRefactoringId = null,
  completedRefactoringId = null,
  hasRequirements = false,
  showLogs = false,
  logs = "",
  logsLoading = false,
}) {
  const existingTestFiles = testing?.existingTests || [];
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);

  const handleAnalyzeClick = () => {
    setShowAnalyzeDialog(true);
  };

  const handleStartAnalysis = (includeRequirements) => {
    setShowAnalyzeDialog(false);
    onAnalyze?.(includeRequirements);
  };

  const handleCancelAnalysis = () => {
    setShowAnalyzeDialog(false);
  };

  return (
    <>
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
              <Heading size="md">Refactoring & Testing</Heading>
              {testing && !showLogs && (
                <>
                  {testing.refactoringRecommendations?.length > 0 && (
                    <HStack gap={1}>
                      <Text fontSize="xs" color="gray.500">
                        {testing.refactoringRecommendations.length}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Refactoring
                        {testing.refactoringRecommendations.length !== 1
                          ? "s"
                          : ""}
                      </Text>
                    </HStack>
                  )}
                  {testing.missingTests?.unit?.length > 0 && (
                    <HStack gap={1}>
                      <Text
                        fontSize="xs"
                        color="purple.600"
                        fontWeight="semibold"
                      >
                        {testing.missingTests.unit.length}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Unit
                      </Text>
                    </HStack>
                  )}
                  {testing.missingTests?.integration?.length > 0 && (
                    <HStack gap={1}>
                      <Text
                        fontSize="xs"
                        color="blue.600"
                        fontWeight="semibold"
                      >
                        {testing.missingTests.integration.length}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Integration
                      </Text>
                    </HStack>
                  )}
                  {testing.missingTests?.e2e?.length > 0 && (
                    <HStack gap={1}>
                      <Text
                        fontSize="xs"
                        color="green.600"
                        fontWeight="semibold"
                      >
                        {testing.missingTests.e2e.length}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        E2E
                      </Text>
                    </HStack>
                  )}
                </>
              )}
              {showLogs && (
                <Badge colorPalette="purple" size="sm">
                  Logs View
                </Badge>
              )}
            </HStack>
            <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
              {!showLogs && !testing && (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={handleAnalyzeClick}
                  loading={loading}
                  loadingText="Analyzing"
                >
                  <Sparkles size={14} />
                  Analyze refactoring & tests
                </Button>
              )}
            </HStack>
          </HStack>
        </Card.Header>
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Content>
            <Card.Body>
              {(loading || progress) && !showLogs && (
                <SectionProgressBanner
                  progress={progress}
                  fallbackMessage="AI is analyzing domain files and identifying missing tests..."
                />
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
                  description="Click 'Analyze refactoring & tests' to identify refactoring needs, coverage gaps, and test suggestions."
                  variant="simple"
                />
              ) : (
                <VStack align="stretch" gap={6}>
                  {/* Refactoring Recommendations - Show First! */}
                  {testing.refactoringRecommendations &&
                    testing.refactoringRecommendations.length > 0 && (
                      <Box>
                        <Text fontWeight="semibold" mb={3} fontSize="md">
                          ⚠️ Architecture Issues Blocking Tests
                        </Text>
                        <RefactoringRecommendationsCard
                          refactorings={testing.refactoringRecommendations}
                          onApplyRefactoring={onApplyRefactoring}
                          onMarkCompleted={onMarkCompleted}
                          applyingRefactoringId={applyingRefactoringId}
                          completedRefactoringId={completedRefactoringId}
                        />
                      </Box>
                    )}

                  {testing.refactoringRecommendations &&
                    testing.refactoringRecommendations.length > 0 && (
                      <Separator />
                    )}

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
                    <HStack justify="space-between" mb={4}>
                      <Text fontWeight="semibold" fontSize="md">
                        Missing Tests
                      </Text>
                      {testing.summary && (
                        <HStack gap={2} fontSize="sm">
                          {testing.summary.blockedTests > 0 && (
                            <Badge colorPalette="orange">
                              {testing.summary.blockedTests} blocked
                            </Badge>
                          )}
                          {testing.summary.readyTests > 0 && (
                            <Badge colorPalette="green">
                              {testing.summary.readyTests} ready
                            </Badge>
                          )}
                        </HStack>
                      )}
                    </HStack>
                    <MissingTestsSection
                      domainId={domainId}
                      missingTests={testing.missingTests}
                      refactoringRecommendations={
                        testing.refactoringRecommendations || []
                      }
                      applyingTests={applyingTests}
                      applyLogs={applyLogs}
                      onApplyTest={onApplyTest}
                      onApplyTestEdits={onApplyTestEdits}
                    />
                  </Box>
                </VStack>
              )}
            </Card.Body>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>

      <AnalyzeWithContextDialog
        open={showAnalyzeDialog}
        onClose={handleCancelAnalysis}
        onStart={handleStartAnalysis}
        title="Analyze Refactoring & Tests"
        description="AI will analyze this domain's code structure and tests to identify refactoring opportunities, coverage gaps, and missing test scenarios."
        examples={[
          "Focus on auth flows and permission boundaries",
          "Prioritize regression tests for recent bug fixes",
          "Check critical paths and edge-case validation",
          "Emphasize integration scenarios across modules",
        ]}
        hasRequirements={hasRequirements}
        includeRequirementsLabel="Include requirements analysis"
        includeRequirementsHelpEnabled="LLM will cross-reference test coverage against domain requirements"
        includeRequirementsHelpDisabled="Requirements must be generated first before they can be included as context"
      />
    </>
  );
}
