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
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileCode,
  FileText,
  Lightbulb,
  Shield,
  Sparkles,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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

/**
 * Parses a source string like "path/to/file.js:42-58,77" into
 * { filePath, from, to } for the first location.
 */
function parseSourceLocation(source) {
  if (!source || typeof source !== "string") return null;
  const firstRef = source.split(";")[0].trim();
  const colonIdx = firstRef.lastIndexOf(":");
  if (colonIdx === -1) return null;
  const filePath = firstRef.slice(0, colonIdx).trim();
  const lineSpec = firstRef.slice(colonIdx + 1).trim();
  if (!filePath || !lineSpec) return null;
  const firstRange = lineSpec.split(",")[0];
  const dashIdx = firstRange.indexOf("-");
  if (dashIdx !== -1) {
    const from = parseInt(firstRange.slice(0, dashIdx), 10);
    const to = parseInt(firstRange.slice(dashIdx + 1), 10);
    if (Number.isFinite(from)) {
      return { filePath, from, to: Number.isFinite(to) ? to : from };
    }
  } else {
    const from = parseInt(firstRange, 10);
    if (Number.isFinite(from)) return { filePath, from, to: from };
  }
  return null;
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
}) {
  const updateBugsSecurityFindingAction = useDomainBugsSecurityStore(
    (state) => state.updateFindingAction,
  );
  const implementFix = useDomainBugsSecurityStore(
    (state) => state.implementFix,
  );
  const implementingFixById = useDomainBugsSecurityStore(
    (state) => state.implementingFixById,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState(new Set());
  const [expandedSnippets, setExpandedSnippets] = useState(new Set());
  const [snippetCache, setSnippetCache] = useState(new Map());

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

  const handleOpenLocation = async (location) => {
    if (!location?.file) {
      return;
    }

    try {
      await api.openFileInEditor(location.file, location.line, location.column);
      toaster.create({
        title: "Opened in VS Code",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Failed to open file",
        description:
          error?.response?.data?.message ||
          "Make sure VS Code is installed and accessible via the 'code' command.",
        type: "error",
      });
    }
  };

  const fetchSnippetForFinding = async (findingId, finding) => {
    if (snippetCache.has(findingId)) return;
    const sourceStr = finding.location
      ? `${finding.location.file}:${finding.location.line}`
      : finding.source;
    const loc = parseSourceLocation(sourceStr);
    if (!loc) return;
    setSnippetCache((prev) =>
      new Map(prev).set(findingId, {
        loading: true,
        snippet: null,
        language: null,
        from: loc.from,
        to: loc.to,
      }),
    );
    try {
      const response = await api.getFileSnippet(loc.filePath, loc.from, loc.to);
      setSnippetCache((prev) =>
        new Map(prev).set(findingId, {
          loading: false,
          snippet: response.data.snippet,
          language: response.data.language,
          from: response.data.from,
          to: response.data.to,
        }),
      );
    } catch {
      setSnippetCache((prev) =>
        new Map(prev).set(findingId, {
          loading: false,
          snippet: null,
          language: null,
          from: null,
          to: null,
        }),
      );
    }
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

  const toggleSnippet = (findingId, finding) => {
    setExpandedSnippets((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
        fetchSnippetForFinding(findingId, finding);
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

  const handleImplementFix = async (findingId) => {
    await implementFix(domainId, findingId);
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
              {!hasData && !showLogs && (
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
                          const implementingEntry = implementingFixById.get(
                            finding.id,
                          );
                          const isImplementing = !!implementingEntry;

                          return (
                            <Card.Root
                              key={finding.id}
                              size="sm"
                              borderLeftWidth="4px"
                              borderLeftColor={
                                isImplementing
                                  ? "blue.400"
                                  : `${SEVERITY_COLORS[normalizedSeverity] || "gray"}.500`
                              }
                              bg={isImplementing ? "blue.50" : undefined}
                              transition="background 0.3s ease, border-color 0.3s ease"
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
                                      {isImplementing ? (
                                        <HStack
                                          gap={2}
                                          px={3}
                                          py={1}
                                          bg="blue.100"
                                          borderRadius="md"
                                          borderWidth="1px"
                                          borderColor="blue.200"
                                        >
                                          <Spinner
                                            size="xs"
                                            color="blue.500"
                                            borderWidth="2px"
                                          />
                                          <Text
                                            fontSize="xs"
                                            fontWeight="medium"
                                            color="blue.700"
                                            maxW="380px"
                                            truncate
                                          >
                                            {implementingEntry?.message ||
                                              "AI is starting…"}
                                          </Text>
                                        </HStack>
                                      ) : (
                                        <>
                                          {findingStatus ===
                                            FINDING_STATUS.APPLIED && (
                                            <Badge
                                              colorPalette="green"
                                              size="sm"
                                            >
                                              Applied
                                            </Badge>
                                          )}
                                          {findingStatus ===
                                            FINDING_STATUS.WONT_FIX && (
                                            <Badge
                                              colorPalette="gray"
                                              size="sm"
                                            >
                                              Won't fix
                                            </Badge>
                                          )}
                                          {findingStatus ===
                                            FINDING_STATUS.FIXED_MANUALLY && (
                                            <Badge
                                              colorPalette="purple"
                                              size="sm"
                                            >
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
                                              handleImplementFix(finding.id);
                                            }}
                                          >
                                            <Sparkles size={14} />
                                            Implement Fix
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
                                        </>
                                      )}
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
                                          <HStack gap={1}>
                                            <Code
                                              fontSize="sm"
                                              p={2}
                                              display="block"
                                              flex={1}
                                              cursor="pointer"
                                              userSelect="none"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                toggleSnippet(
                                                  finding.id,
                                                  finding,
                                                );
                                              }}
                                            >
                                              <HStack gap={1}>
                                                {expandedSnippets.has(
                                                  finding.id,
                                                ) ? (
                                                  <ChevronDown size={12} />
                                                ) : (
                                                  <ChevronRight size={12} />
                                                )}
                                                <Text
                                                  as="span"
                                                  fontSize="sm"
                                                  fontFamily="mono"
                                                >
                                                  {source}
                                                </Text>
                                              </HStack>
                                            </Code>
                                            {(() => {
                                              const loc = finding.location?.file
                                                ? finding.location
                                                : (() => {
                                                    const parsed =
                                                      parseSourceLocation(
                                                        source,
                                                      );
                                                    return parsed
                                                      ? {
                                                          file: parsed.filePath,
                                                          line: parsed.from,
                                                        }
                                                      : null;
                                                  })();
                                              return loc ? (
                                                <Button
                                                  size="xs"
                                                  variant="outline"
                                                  colorPalette="blue"
                                                  flexShrink={0}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenLocation(loc);
                                                  }}
                                                >
                                                  <ExternalLink size={12} />
                                                  Open in editor
                                                </Button>
                                              ) : null;
                                            })()}
                                          </HStack>
                                          {expandedSnippets.has(finding.id) &&
                                            (() => {
                                              const cached = snippetCache.get(
                                                finding.id,
                                              );
                                              if (cached?.loading) {
                                                return (
                                                  <Box mt={2}>
                                                    <Skeleton
                                                      height="120px"
                                                      borderRadius="md"
                                                    />
                                                  </Box>
                                                );
                                              }
                                              if (cached?.snippet) {
                                                return (
                                                  <Box mt={2}>
                                                    <Text
                                                      fontSize="xs"
                                                      color="gray.500"
                                                      mb={1}
                                                    >
                                                      Lines {cached.from}–
                                                      {cached.to}
                                                    </Text>
                                                    <Box
                                                      borderRadius="md"
                                                      overflow="hidden"
                                                    >
                                                      <SyntaxHighlighter
                                                        language={
                                                          cached.language ||
                                                          "javascript"
                                                        }
                                                        style={vscDarkPlus}
                                                        customStyle={{
                                                          margin: 0,
                                                          borderRadius: "6px",
                                                          fontSize: "14px",
                                                        }}
                                                        showLineNumbers={true}
                                                        startingLineNumber={
                                                          cached.from
                                                        }
                                                        lineNumberStyle={{
                                                          minWidth: "3em",
                                                          paddingRight: "1em",
                                                          color: "#858585",
                                                          textAlign: "right",
                                                        }}
                                                      >
                                                        {cached.snippet.replace(
                                                          /\n$/,
                                                          "",
                                                        )}
                                                      </SyntaxHighlighter>
                                                    </Box>
                                                  </Box>
                                                );
                                              }
                                              if (finding.location?.snippet) {
                                                return (
                                                  <Box mt={2}>
                                                    <MarkdownRenderer
                                                      content={`\`\`\`javascript\n${finding.location.snippet}\n\`\`\``}
                                                    />
                                                  </Box>
                                                );
                                              }
                                              return null;
                                            })()}
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

                                      {finding.suggestedFix && (
                                        <Box>
                                          <HStack gap={1} mb={1}>
                                            <Lightbulb size={14} />
                                            <Text
                                              fontSize="sm"
                                              fontWeight="semibold"
                                            >
                                              Suggested Fix:
                                            </Text>
                                          </HStack>
                                          <MarkdownRenderer
                                            content={`\`\`\`javascript\n${finding.suggestedFix}\n\`\`\``}
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
