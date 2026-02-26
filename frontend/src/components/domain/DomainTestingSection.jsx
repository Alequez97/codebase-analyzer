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
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  ListChecks,
  MessageSquare,
  Sparkles,
  TestTube,
} from "lucide-react";
import { ExistingTestsTable, MissingTestsSection } from "./testing";
import { Checkbox } from "../ui/checkbox";
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../ui/dialog";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";

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
  const [includeRequirements, setIncludeRequirements] = useState(false);
  const [analysisDescription, setAnalysisDescription] = useState("");

  const handleAnalyzeClick = () => {
    setShowAnalyzeDialog(true);
  };

  const handleStartAnalysis = () => {
    setShowAnalyzeDialog(false);
    onAnalyze?.(includeRequirements);
    setIncludeRequirements(false);
    setAnalysisDescription("");
  };

  const handleCancelAnalysis = () => {
    setShowAnalyzeDialog(false);
    setIncludeRequirements(false);
    setAnalysisDescription("");
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

      <DialogRoot
        open={showAnalyzeDialog}
        onOpenChange={(e) => !e.open && handleCancelAnalysis()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyze Tests</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="gray.600">
                AI will analyze this domain&apos;s tests and identify coverage
                gaps, missing scenarios, and test quality improvements.
              </Text>
              <VStack align="stretch" gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Examples of helpful context:
                </Text>
                <Box
                  fontSize="xs"
                  color="gray.600"
                  pl={4}
                  borderLeft="2px solid"
                  borderColor="purple.200"
                >
                  <Text>• Focus on auth flows and permission boundaries</Text>
                  <Text>
                    • Prioritize regression tests for recent bug fixes
                  </Text>
                  <Text>• Check critical paths and edge-case validation</Text>
                  <Text>• Emphasize integration scenarios across modules</Text>
                </Box>
              </VStack>
              <Textarea
                value={analysisDescription}
                onChange={(e) => setAnalysisDescription(e.target.value)}
                placeholder="Enter additional context here (optional)..."
                minHeight="150px"
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500">
                Leave empty to analyze without additional guidance.
              </Text>
              <Separator />
              <Checkbox
                checked={includeRequirements}
                onCheckedChange={(e) => setIncludeRequirements(e.checked)}
                disabled={!hasRequirements}
              >
                <HStack gap={2}>
                  <ListChecks size={16} />
                  <Text fontSize="sm" fontWeight="medium">
                    Include requirements analysis
                  </Text>
                </HStack>
              </Checkbox>
              <Text fontSize="xs" color="gray.500" pl={6}>
                {hasRequirements
                  ? "LLM will cross-reference test coverage against domain requirements"
                  : "Requirements must be generated first before they can be included as context"}
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              colorPalette="purple"
              size="sm"
              onClick={handleStartAnalysis}
            >
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
