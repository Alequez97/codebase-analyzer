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
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Sparkles,
  TestTube,
} from "lucide-react";
import { ExistingTestsTable, MissingTestsSection } from "./testing";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";
import SectionProgressBanner from "./SectionProgressBanner";
import AnalyzeWithContextDialog from "./AnalyzeWithContextDialog";

export default function DomainTestingSection({
  domainId,
  testing,
  loading,
  progress,
  applyingTests,
  onAnalyze,
  onApplyTest,
  hasRequirements = false,
  showLogs = false,
  logs = "",
  logsLoading = false,
  onOpenChat,
  isChatOpen = false,
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
              <Heading size="md">Testing</Heading>
              {showLogs && (
                <Badge colorPalette="purple" size="sm">
                  Logs View
                </Badge>
              )}
            </HStack>
            <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
              {!showLogs && (
                <>
                  {/* Show "Edit with AI" if testing data exists, otherwise "Analyze tests" */}
                  {testing ? (
                    <Button
                      size="sm"
                      colorPalette="purple"
                      variant={isChatOpen ? "solid" : "outline"}
                      onClick={onOpenChat}
                    >
                      <MessageSquare size={14} />
                      Edit with AI
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      colorPalette="blue"
                      variant="outline"
                      onClick={handleAnalyzeClick}
                      loading={loading}
                      loadingText="Analyzing"
                    >
                      <Sparkles size={14} />
                      Analyze tests
                    </Button>
                  )}
                </>
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
                      domainId={domainId}
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

      <AnalyzeWithContextDialog
        open={showAnalyzeDialog}
        onClose={handleCancelAnalysis}
        onStart={handleStartAnalysis}
        title="Analyze Tests"
        description="AI will analyze this domain's tests and identify coverage gaps, missing scenarios, and test quality improvements."
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
