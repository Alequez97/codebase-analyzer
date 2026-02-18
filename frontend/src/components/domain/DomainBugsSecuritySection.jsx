import { useState } from "react";
import {
  Button,
  Heading,
  HStack,
  Text,
  Textarea,
  Box,
  IconButton,
  Badge,
  VStack,
  Separator,
  Skeleton,
  Code,
} from "@chakra-ui/react";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  Bug,
  AlertCircle,
  CheckCircle,
  FileCode,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { EmptyState } from "../ui/empty-state";
import LogsViewer from "./LogsViewer";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
} from "../ui/dialog";
import MarkdownRenderer from "../MarkdownRenderer";
import { toaster } from "../ui/toaster";

const SEVERITY_COLORS = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "gray",
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const CATEGORY_ICONS = {
  security: Shield,
  bug: Bug,
  quality: AlertCircle,
};

const FINDING_STATUS = {
  OPEN: "open",
  APPLIED: "applied",
  WONT_FIX: "wont-fix",
};

function sortFindingsBySeverity(findings = []) {
  return [...findings].sort((a, b) => {
    const severityA = SEVERITY_ORDER[a.severity] ?? 999;
    const severityB = SEVERITY_ORDER[b.severity] ?? 999;
    return severityA - severityB;
  });
}

export default function DomainBugsSecuritySection({
  bugsSecurity,
  loading = false,
  progress = null,
  onAnalyze,
  showLogs = false,
  logs = "",
  logsLoading = false,
  hasRequirements = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [includeRequirements, setIncludeRequirements] = useState(false);
  const [analysisDescription, setAnalysisDescription] = useState("");
  const [expandedFindings, setExpandedFindings] = useState(new Set());
  const [findingStatusById, setFindingStatusById] = useState(() => new Map());

  const isAnalyzing = loading && !bugsSecurity;
  const hasData = !!bugsSecurity;
  const sortedFindings = hasData
    ? sortFindingsBySeverity(bugsSecurity.findings || [])
    : [];
  const summary = bugsSecurity?.summary || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

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

  const toggleFindingExpanded = (findingId) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle size={16} />;
      case "medium":
        return <AlertCircle size={16} />;
      case "low":
        return <CheckCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getFindingStatus = (findingId) =>
    findingStatusById.get(findingId) || FINDING_STATUS.OPEN;

  const handleSetFindingStatus = (findingId, nextStatus) => {
    const currentStatus = getFindingStatus(findingId);
    const resolvedStatus =
      currentStatus === nextStatus ? FINDING_STATUS.OPEN : nextStatus;

    setFindingStatusById((prev) => {
      const next = new Map(prev);

      if (resolvedStatus === FINDING_STATUS.OPEN) {
        next.delete(findingId);
      } else {
        next.set(findingId, resolvedStatus);
      }

      return next;
    });

    if (resolvedStatus === FINDING_STATUS.APPLIED) {
      toaster.create({
        title: "Finding marked as applied",
        type: "success",
      });
      return;
    }

    if (resolvedStatus === FINDING_STATUS.WONT_FIX) {
      toaster.create({
        title: "Finding marked as won't fix",
        type: "success",
      });
      return;
    }

    toaster.create({
      title: "Finding status reset",
      type: "success",
    });
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
              <Heading size="md">Bugs & Security</Heading>
              {showLogs && (
                <Badge colorPalette="purple" size="sm">
                  Logs View
                </Badge>
              )}
              {hasData && summary.total > 0 && (
                <HStack gap={2}>
                  {summary.critical > 0 && (
                    <Badge colorPalette="red" size="sm">
                      {summary.critical} Critical
                    </Badge>
                  )}
                  {summary.high > 0 && (
                    <Badge colorPalette="orange" size="sm">
                      {summary.high} High
                    </Badge>
                  )}
                  {summary.medium > 0 && (
                    <Badge colorPalette="yellow" size="sm">
                      {summary.medium} Medium
                    </Badge>
                  )}
                  {summary.low > 0 && (
                    <Badge colorPalette="gray" size="sm">
                      {summary.low} Low
                    </Badge>
                  )}
                </HStack>
              )}
            </HStack>
            <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
              <Button
                size="sm"
                variant="outline"
                colorPalette="purple"
                onClick={handleAnalyzeClick}
                loading={isAnalyzing}
                disabled={isAnalyzing}
              >
                <Sparkles size={16} />
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </HStack>
          </HStack>
        </Card.Header>

        {isExpanded && (
          <Card.Body pt="0">
            {showLogs && <LogsViewer logs={logs} loading={logsLoading} />}

            {!showLogs && (
              <>
                {isAnalyzing && (
                  <VStack align="stretch" gap={3}>
                    <Skeleton height="60px" />
                    <Skeleton height="120px" />
                    <Skeleton height="120px" />
                    {progress && (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.600">
                          {progress.message}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                )}

                {!isAnalyzing && !hasData && (
                  <EmptyState
                    icon={Shield}
                    title="No bugs or security findings yet"
                    description="Click 'Analyze' to scan this domain for potential bugs, security vulnerabilities, and code quality issues."
                    variant="simple"
                  />
                )}

                {hasData && (
                  <VStack align="stretch" gap={4}>
                    {/* Findings List */}
                    {sortedFindings.length > 0 && (
                      <VStack align="stretch" gap={3}>
                        <Heading size="sm">
                          Findings ({sortedFindings.length})
                        </Heading>
                        {sortedFindings.map((finding) => {
                          const isExpanded = expandedFindings.has(finding.id);
                          const CategoryIcon =
                            CATEGORY_ICONS[finding.category] || Bug;
                          const findingStatus = getFindingStatus(finding.id);

                          return (
                            <Card.Root key={finding.id} size="sm">
                              <Card.Body>
                                <VStack align="stretch" gap={2}>
                                  {/* Header */}
                                  <HStack
                                    justify="space-between"
                                    cursor="pointer"
                                    onClick={() =>
                                      toggleFindingExpanded(finding.id)
                                    }
                                  >
                                    <HStack gap={2} flex={1}>
                                      <IconButton
                                        size="xs"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFindingExpanded(finding.id);
                                        }}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown size={14} />
                                        ) : (
                                          <ChevronRight size={14} />
                                        )}
                                      </IconButton>
                                      <CategoryIcon size={16} />
                                      <Text fontWeight="semibold">
                                        {finding.title}
                                      </Text>
                                      <Badge
                                        colorPalette={
                                          SEVERITY_COLORS[finding.severity]
                                        }
                                        size="sm"
                                      >
                                        {getSeverityIcon(finding.severity)}
                                        {finding.severity.toUpperCase()}
                                      </Badge>
                                      <Badge size="sm" variant="subtle">
                                        {finding.type}
                                      </Badge>
                                    </HStack>
                                    <HStack gap={2}>
                                      {findingStatus ===
                                        FINDING_STATUS.APPLIED && (
                                        <Badge colorPalette="green" size="sm">
                                          Applied
                                        </Badge>
                                      )}
                                      {findingStatus ===
                                        FINDING_STATUS.WONT_FIX && (
                                        <Badge colorPalette="gray" size="sm">
                                          Won't fix
                                        </Badge>
                                      )}
                                      <Button
                                        size="xs"
                                        colorPalette="gray"
                                        variant={
                                          findingStatus ===
                                          FINDING_STATUS.WONT_FIX
                                            ? "solid"
                                            : "outline"
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFindingStatus(
                                            finding.id,
                                            FINDING_STATUS.WONT_FIX,
                                          );
                                        }}
                                      >
                                        Won't fix
                                      </Button>
                                      <Button
                                        size="xs"
                                        colorPalette="green"
                                        variant={
                                          findingStatus ===
                                          FINDING_STATUS.APPLIED
                                            ? "solid"
                                            : "outline"
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFindingStatus(
                                            finding.id,
                                            FINDING_STATUS.APPLIED,
                                          );
                                        }}
                                      >
                                        Apply
                                      </Button>
                                    </HStack>
                                  </HStack>

                                  {/* Expanded Details */}
                                  {isExpanded && (
                                    <VStack align="stretch" gap={3} pt={2}>
                                      <Separator />

                                      {/* Description */}
                                      <Box>
                                        <Text fontSize="sm" color="gray.700">
                                          {finding.description}
                                        </Text>
                                      </Box>

                                      {/* Location */}
                                      {finding.location && (
                                        <Box>
                                          <HStack gap={1} mb={1}>
                                            <FileCode size={14} />
                                            <Text
                                              fontSize="sm"
                                              fontWeight="semibold"
                                            >
                                              Location:
                                            </Text>
                                          </HStack>
                                          <Code
                                            fontSize="sm"
                                            p={2}
                                            display="block"
                                          >
                                            {finding.location.file}:
                                            {finding.location.line}
                                          </Code>
                                          {finding.location.snippet && (
                                            <Box
                                              mt={1}
                                              p={2}
                                              bg="gray.800"
                                              color="white"
                                              borderRadius="md"
                                              fontSize="xs"
                                              fontFamily="mono"
                                            >
                                              <pre>
                                                {finding.location.snippet}
                                              </pre>
                                            </Box>
                                          )}
                                        </Box>
                                      )}

                                      {/* Impact */}
                                      {finding.impact && (
                                        <Box>
                                          <HStack gap={1} mb={1}>
                                            <AlertTriangle size={14} />
                                            <Text
                                              fontSize="sm"
                                              fontWeight="semibold"
                                            >
                                              Impact:
                                            </Text>
                                          </HStack>
                                          <Text fontSize="sm" color="gray.700">
                                            {finding.impact}
                                          </Text>
                                        </Box>
                                      )}

                                      {/* Recommendation */}
                                      {finding.recommendation && (
                                        <Box>
                                          <HStack gap={1} mb={1}>
                                            <Lightbulb size={14} />
                                            <Text
                                              fontSize="sm"
                                              fontWeight="semibold"
                                            >
                                              Recommendation:
                                            </Text>
                                          </HStack>
                                          <Text fontSize="sm" color="gray.700">
                                            {finding.recommendation}
                                          </Text>
                                        </Box>
                                      )}

                                      {/* Suggested Fix */}
                                      {finding.suggestedFix && (
                                        <Box>
                                          <Text
                                            fontSize="sm"
                                            fontWeight="semibold"
                                            mb={1}
                                          >
                                            Suggested Fix:
                                          </Text>
                                          <Box
                                            p={2}
                                            bg="gray.800"
                                            color="white"
                                            borderRadius="md"
                                            fontSize="xs"
                                            fontFamily="mono"
                                          >
                                            <pre>{finding.suggestedFix}</pre>
                                          </Box>
                                        </Box>
                                      )}

                                      {/* Related Requirements */}
                                      {finding.relatedRequirements &&
                                        finding.relatedRequirements.length >
                                          0 && (
                                          <Box>
                                            <Text
                                              fontSize="sm"
                                              fontWeight="semibold"
                                              mb={1}
                                            >
                                              Related Requirements:
                                            </Text>
                                            <HStack gap={1} flexWrap="wrap">
                                              {finding.relatedRequirements.map(
                                                (reqId) => (
                                                  <Badge
                                                    key={reqId}
                                                    size="sm"
                                                    variant="outline"
                                                  >
                                                    {reqId}
                                                  </Badge>
                                                ),
                                              )}
                                            </HStack>
                                          </Box>
                                        )}

                                      {/* Confidence */}
                                      {finding.confidence && (
                                        <HStack justify="flex-end">
                                          <Text fontSize="xs" color="gray.500">
                                            Confidence: {finding.confidence}
                                          </Text>
                                        </HStack>
                                      )}
                                    </VStack>
                                  )}
                                </VStack>
                              </Card.Body>
                            </Card.Root>
                          );
                        })}
                      </VStack>
                    )}

                    {sortedFindings.length === 0 && (
                      <Box
                        p={6}
                        textAlign="center"
                        bg="green.50"
                        borderRadius="md"
                      >
                        <CheckCircle
                          size={48}
                          style={{ margin: "0 auto 16px", color: "green" }}
                        />
                        <Text color="green.700" fontWeight="semibold">
                          No issues found!
                        </Text>
                        <Text fontSize="sm" color="green.600">
                          This domain appears to be free of bugs and security
                          vulnerabilities.
                        </Text>
                      </Box>
                    )}
                  </VStack>
                )}
              </>
            )}
          </Card.Body>
        )}
      </Card.Root>

      {/* Analyze Dialog */}
      <DialogRoot
        open={showAnalyzeDialog}
        onOpenChange={(e) => !e.open && handleCancelAnalysis()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyze Bugs & Security</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="gray.600">
                AI will analyze this domain's code to identify potential bugs,
                security vulnerabilities, and code quality issues.
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
                  <Text>
                    • Focus on authentication and authorization vulnerabilities
                  </Text>
                  <Text>• Check for SQL injection and XSS vulnerabilities</Text>
                  <Text>• Identify race conditions and concurrency issues</Text>
                  <Text>
                    • Look for input validation and error handling gaps
                  </Text>
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
                  ? "LLM will cross-reference identified bugs with domain requirements for better context"
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
