import { useState } from "react";

import { TestTube } from "lucide-react";

export default function DomainTestingSection({
  domainId,
  testing,
  loading,
  progress,
  applyingTests,
  onAnalyze,
  onApplyTest,
  showLogs = false,
  logs = "",
  logsLoading = false,
  onOpenChat,
  isChatOpen = false,
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
                    onClick={onAnalyze}
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
  );
}
