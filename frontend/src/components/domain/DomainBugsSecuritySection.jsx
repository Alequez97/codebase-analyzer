import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Heading,
  HStack,
  IconButton,
  Separator,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Lightbulb,
  MessageSquare,
  Shield,
  Sparkles,
} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import { EmptyState } from "../ui/empty-state";
import { toaster } from "../ui/toaster";
import { Card } from "../ui/card";
import LogsViewer from "./LogsViewer";
import SectionProgressBanner from "./SectionProgressBanner";
import AnalyzeWithContextDialog from "./AnalyzeWithContextDialog";
import api from "../../api";
import { useDomainBugsSecurityStore } from "../../store/useDomainBugsSecurityStore";

const CategoryIcon = FileText;

const SEVERITY_COLORS = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "gray",
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const FINDING_STATUS = {
  OPEN: "open",
  APPLIED: "apply",
  WONT_FIX: "wont-fix",
  FIXED_MANUALLY: "fixed-manually",
};

const TYPE_COLORS = {
  security: "red",
  bug: "orange",
  quality: "blue",
};

function normalizeSeverity(value) {
  return String(value || "").toLowerCase();
}

function sortFindingsBySeverity(findings = []) {
  return [...findings].sort((a, b) => {
    const severityA = SEVERITY_ORDER[normalizeSeverity(a.severity)] ?? 999;
    const severityB = SEVERITY_ORDER[normalizeSeverity(b.severity)] ?? 999;
    return severityA - severityB;
  });
}

export default function DomainBugsSecuritySection({
  domainId,
  bugsSecurity,
  loading = false,
  progress = null,
  onAnalyze,
  showLogs = false,
  logs = "",
  logsLoading = false,
  hasRequirements = false,
  onOpenChat,
  isChatOpen = false,
}) {
  const updateBugsSecurityFindingAction = useDomainBugsSecurityStore(
    (state) => state.updateFindingAction,
  );
  const applyFix = useDomainBugsSecurityStore((state) => state.applyFix);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState(new Set());

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
  const typeSummary = sortedFindings.reduce(
    (acc, finding) => {
      const key = String(finding.type || "").toLowerCase();
      if (key === "security" || key === "bug" || key === "quality") {
        acc[key] += 1;
      }
      return acc;
    },
    { security: 0, bug: 0, quality: 0 },
  );

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

  const getFindingStatus = (finding) => finding.action || FINDING_STATUS.OPEN;

  const handleSetFindingStatus = async (findingId, nextStatus) => {
    if (!domainId) return;

    try {
      await api.recordFindingAction(domainId, findingId, nextStatus);

      // Update UI immediately
      updateBugsSecurityFindingAction(domainId, findingId, nextStatus);

      toaster.create({
        title:
          nextStatus === FINDING_STATUS.APPLIED
            ? "Finding marked as applied"
            : nextStatus === FINDING_STATUS.WONT_FIX
              ? "Finding marked as won't fix"
              : nextStatus === FINDING_STATUS.FIXED_MANUALLY
                ? "Finding marked as fixed manually"
                : "Finding status reset",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Failed to save finding status",
        description: error.response?.data?.error || "Unknown error",
        type: "error",
      });
    }
  };

  const handleApplyFix = async (findingId) => {
    await applyFix(domainId, findingId);
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
                  <Text fontSize="xs" color="gray.500" fontWeight="medium">
                    {summary.total} total
                  </Text>
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
                  {typeSummary.security > 0 && (
                    <Badge colorPalette="red" size="sm" variant="subtle">
                      {typeSummary.security} Security
                    </Badge>
                  )}
                  {typeSummary.bug > 0 && (
                    <Badge colorPalette="orange" size="sm" variant="subtle">
                      {typeSummary.bug} Bugs
                    </Badge>
                  )}
                  {typeSummary.quality > 0 && (
                    <Badge colorPalette="blue" size="sm" variant="subtle">
                      {typeSummary.quality} Quality
                    </Badge>
                  )}
                </HStack>
              )}
            </HStack>
            <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
              {/* Show "Edit with AI" if findings exist, otherwise "Analyze" */}
              {hasData && sortedFindings.length > 0 ? (
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
                  variant="outline"
                  colorPalette="blue"
                  onClick={handleAnalyzeClick}
                  loading={isAnalyzing}
                  disabled={isAnalyzing}
                >
                  <Sparkles size={16} />
                  {isAnalyzing
                    ? "Analyzing..."
                    : "Analyze bugs and security issues"}
                </Button>
              )}
            </HStack>
          </HStack>
        </Card.Header>

        {isExpanded && (
          <Card.Body pt="0">
            {showLogs && <LogsViewer logs={logs} loading={logsLoading} />}

            {!showLogs && (
              <>
                {(loading || progress) && (
                  <SectionProgressBanner
                    progress={progress}
                    fallbackMessage="AI is analyzing domain files and identifying bugs, security vulnerabilities, and quality issues..."
                  />
                )}

                {isAnalyzing && (
                  <VStack align="stretch" gap={3}>
                    <Skeleton height="60px" />
                    <Skeleton height="120px" />
                    <Skeleton height="120px" />
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
                          const findingStatus = getFindingStatus(finding);
                          const normalizedSeverity = normalizeSeverity(
                            finding.severity,
                          );
                          const typeColor =
                            TYPE_COLORS[
                              String(finding.type || "").toLowerCase()
                            ] || "gray";
                          const source = finding.location
                            ? `${finding.location.file}:${finding.location.line}`
                            : finding.source;

                          return (
                            <Card.Root
                              key={finding.id}
                              size="sm"
                              borderLeftWidth="4px"
                              borderLeftColor={`${SEVERITY_COLORS[normalizedSeverity] || "gray"}.500`}
                            >
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
                                          SEVERITY_COLORS[normalizedSeverity] ||
                                          "gray"
                                        }
                                        size="sm"
                                        variant="solid"
                                      >
                                        {getSeverityIcon(normalizedSeverity)}
                                        {normalizedSeverity.toUpperCase()}
                                      </Badge>
                                      <Badge
                                        size="sm"
                                        variant="subtle"
                                        colorPalette={typeColor}
                                      >
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
                                      {findingStatus ===
                                        FINDING_STATUS.FIXED_MANUALLY && (
                                        <Badge colorPalette="purple" size="sm">
                                          Fixed manually
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
                                        disabled={
                                          findingStatus ===
                                          FINDING_STATUS.WONT_FIX
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
                                        colorPalette="purple"
                                        variant={
                                          findingStatus ===
                                          FINDING_STATUS.FIXED_MANUALLY
                                            ? "solid"
                                            : "outline"
                                        }
                                        disabled={
                                          findingStatus ===
                                          FINDING_STATUS.FIXED_MANUALLY
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFindingStatus(
                                            finding.id,
                                            FINDING_STATUS.FIXED_MANUALLY,
                                          );
                                        }}
                                      >
                                        Fixed manually
                                      </Button>
                                      <Button
                                        size="xs"
                                        colorPalette="blue"
                                        variant="outline"
                                        disabled={
                                          findingStatus ===
                                          FINDING_STATUS.APPLIED
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplyFix(finding.id);
                                        }}
                                      >
                                        <Sparkles size={14} />
                                        Apply Fix
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
                                        disabled={
                                          findingStatus ===
                                          FINDING_STATUS.APPLIED
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFindingStatus(
                                            finding.id,
                                            FINDING_STATUS.APPLIED,
                                          );
                                        }}
                                      >
                                        Mark Applied
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
                                      {source && (
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
                                            {source}
                                          </Code>
                                          {finding.location?.snippet && (
                                            <Box mt={2}>
                                              <MarkdownRenderer
                                                content={`\`\`\`javascript\n${finding.location.snippet}\n\`\`\``}
                                              />
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
                                      {finding.relatedCode && (
                                        <Box>
                                          <Text
                                            fontSize="sm"
                                            fontWeight="semibold"
                                            mb={1}
                                          >
                                            Related Code:
                                          </Text>
                                          <MarkdownRenderer
                                            content={`\`\`\`javascript\n${finding.relatedCode}\n\`\`\``}
                                          />
                                        </Box>
                                      )}

                                      {(finding.fixExample ||
                                        finding.suggestedFix) && (
                                        <Box>
                                          <Text
                                            fontSize="sm"
                                            fontWeight="semibold"
                                            mb={1}
                                          >
                                            Fix Example:
                                          </Text>
                                          <MarkdownRenderer
                                            content={`\`\`\`javascript\n${finding.fixExample || finding.suggestedFix}\n\`\`\``}
                                          />
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

      <AnalyzeWithContextDialog
        open={showAnalyzeDialog}
        onClose={handleCancelAnalysis}
        onStart={handleStartAnalysis}
        title="Analyze Bugs & Security"
        description="AI will analyze this domain's code to identify potential bugs, security vulnerabilities, and code quality issues."
        examples={[
          "Focus on authentication and authorization vulnerabilities",
          "Check for SQL injection and XSS vulnerabilities",
          "Identify race conditions and concurrency issues",
          "Look for input validation and error handling gaps",
        ]}
        hasRequirements={hasRequirements}
        includeRequirementsLabel="Include requirements analysis"
        includeRequirementsHelpEnabled="LLM will cross-reference identified bugs with domain requirements for better context"
        includeRequirementsHelpDisabled="Requirements must be generated first before they can be included as context"
      />
    </>
  );
}
