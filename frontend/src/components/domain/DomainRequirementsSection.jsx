import { useState, useMemo, useEffect } from "react";
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
  Grid,
  Code,
  Separator,
} from "@chakra-ui/react";
import {
  Pencil,
  X,
  Save,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle,
  AlertCircle,
  Code2,
  FileCode,
} from "lucide-react";
import { Card } from "../ui/card";
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

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

const PRIORITY_COLORS = {
  P0: "red",
  P1: "orange",
  P2: "blue",
  P3: "gray",
};

const CATEGORY_ICONS = {
  validation: Shield,
  "business-rule": CheckCircle,
  security: AlertCircle,
  other: Code2,
};

const CONFIDENCE_COLORS = {
  HIGH: "green",
  MEDIUM: "yellow",
  LOW: "gray",
};

const PRIORITY_LIST = ["P0", "P1", "P2", "P3"];

function normalizePriority(value) {
  const upper = String(value || "").toUpperCase();
  return PRIORITY_LIST.includes(upper) ? upper : "P2";
}

function sortRequirementsByPriority(requirements = []) {
  return [...requirements].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] ?? 999;
    const priorityB = PRIORITY_ORDER[b.priority] ?? 999;
    return priorityA - priorityB;
  });
}

function buildDraftFromRequirements(requirements = []) {
  return requirements.map((req, index) => ({
    id: req.id || `REQ-${String(index + 1).padStart(3, "0")}`,
    description: req.description || "",
    priority: normalizePriority(req.priority),
    category: req.category || "other",
    confidence: req.confidence || "MEDIUM",
    source: req.source || "",
    relatedCode: req.relatedCode || "",
  }));
}

function buildDraftFromText(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\d+\.\s*/, "");
    const priorityMatch = cleaned.match(/^\[(P[0-3])\]\s*/i);
    const priority = normalizePriority(priorityMatch?.[1]);
    const description = cleaned.replace(/^\[(P[0-3])\]\s*/i, "").trim();

    return {
      id: `REQ-${String(index + 1).padStart(3, "0")}`,
      description,
      priority,
      category: "other",
      confidence: "MEDIUM",
      source: "",
      relatedCode: "",
    };
  });
}

function draftToEditableText(requirements = []) {
  return requirements
    .map((req, index) => {
      const priority = normalizePriority(req.priority);
      return `${index + 1}. [${priority}] ${req.description || ""}`.trim();
    })
    .join("\n");
}

export default function DomainRequirementsSection({
  requirements = null, // New: structured requirements data
  requirementsText,
  loading,
  progress,
  onRequirementsChange,
  onRequirementsStructuredChange,
  onAnalyze,
  onSave,
  onReset,
  showLogs = false,
  logs = "",
  logsLoading = false,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [userContext, setUserContext] = useState("");
  const [expandedRequirements, setExpandedRequirements] = useState(new Set());
  const [draftRequirements, setDraftRequirements] = useState([]);

  // Sort requirements by priority
  const sortedRequirements = useMemo(() => {
    if (!requirements?.requirements) return [];
    return sortRequirementsByPriority(requirements.requirements);
  }, [requirements]);

  // Group requirements by priority for better organization
  const groupedRequirements = useMemo(() => {
    const groups = { P0: [], P1: [], P2: [], P3: [] };
    sortedRequirements.forEach((req) => {
      const priority = req.priority || "P3";
      if (groups[priority]) {
        groups[priority].push(req);
      }
    });
    return groups;
  }, [sortedRequirements]);

  const sortedDraftRequirements = useMemo(() => {
    if (!draftRequirements.length) return [];
    return sortRequirementsByPriority(draftRequirements);
  }, [draftRequirements]);

  const groupedDraftRequirements = useMemo(() => {
    const groups = { P0: [], P1: [], P2: [], P3: [] };
    sortedDraftRequirements.forEach((req) => {
      const priority = normalizePriority(req.priority);
      if (groups[priority]) {
        groups[priority].push(req);
      }
    });
    return groups;
  }, [sortedDraftRequirements]);

  useEffect(() => {
    if (!isEditMode) return;
    if (requirements?.requirements?.length) {
      setDraftRequirements(
        buildDraftFromRequirements(requirements.requirements),
      );
      return;
    }
    if (requirementsText) {
      setDraftRequirements(buildDraftFromText(requirementsText));
      return;
    }
    setDraftRequirements([]);
  }, [isEditMode, requirements, requirementsText]);

  const toggleRequirement = (reqId) => {
    setExpandedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setDraftRequirements([]);
    onReset?.();
  };

  const handleSave = async () => {
    if (draftRequirements.length > 0) {
      onRequirementsChange?.(draftToEditableText(sortedDraftRequirements));
      onRequirementsStructuredChange?.(sortedDraftRequirements);
    }
    await onSave?.();
    setIsEditMode(false);
    setDraftRequirements([]);
  };

  const handleAnalyzeClick = () => {
    // Show context dialog before analyzing
    setShowContextDialog(true);
  };

  const handleStartAnalysis = () => {
    setShowContextDialog(false);
    onAnalyze?.(userContext);
    setUserContext(""); // Reset for next time
  };

  const handleCancelContext = () => {
    setShowContextDialog(false);
    setUserContext("");
  };

  const handleDraftChange = (reqId, patch) => {
    setDraftRequirements((prev) =>
      prev.map((req) => (req.id === reqId ? { ...req, ...patch } : req)),
    );
  };

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <HStack gap={2}>
              <Heading size="md">Requirements</Heading>
              {!isEditMode && !showLogs && sortedRequirements.length > 0 && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={handleEnterEditMode}
                  title="Edit requirements"
                >
                  <Pencil size={16} />
                </IconButton>
              )}
              {isEditMode && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  title="Cancel editing"
                >
                  <X size={16} />
                </IconButton>
              )}
              {showLogs && (
                <Badge colorPalette="purple" size="sm">
                  Logs View
                </Badge>
              )}
            </HStack>
            <HStack>
              {!isEditMode && !showLogs && (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={handleAnalyzeClick}
                  loading={loading}
                  loadingText="Analyzing"
                >
                  <Sparkles size={14} />
                  {sortedRequirements.length > 0
                    ? "Re-analyze"
                    : "Analyze requirements"}
                </Button>
              )}
              {isEditMode && (
                <Button
                  size="sm"
                  colorPalette="green"
                  onClick={handleSave}
                  leftIcon={<Save size={14} />}
                >
                  Save
                </Button>
              )}
            </HStack>
          </HStack>
        </Card.Header>
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
                    "AI is analyzing domain files and extracting requirements..."}
                </Text>
              </HStack>
            </Box>
          )}
          {showLogs ? (
            <LogsViewer logs={logs} loading={logsLoading} />
          ) : isEditMode ? (
            <VStack align="stretch" gap={5}>
              <Box
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="gray.700" fontWeight="medium">
                  Edit requirements in-place. Change priority or text directly.
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Drag-and-drop priority grouping can be added later if needed.
                </Text>
              </Box>

              {sortedDraftRequirements.length > 0 ? (
                <VStack align="stretch" gap={3}>
                  {Object.entries(groupedDraftRequirements).map(
                    ([priority, reqs]) =>
                      reqs.length > 0 && (
                        <Box key={priority}>
                          <Heading size="sm" mb={3} color="gray.700">
                            {priority === "P0" && "🔴 Critical (P0)"}
                            {priority === "P1" && "🟠 High Priority (P1)"}
                            {priority === "P2" && "🔵 Medium Priority (P2)"}
                            {priority === "P3" && "⚪ Low Priority (P3)"}
                          </Heading>

                          <VStack align="stretch" gap={2}>
                            {reqs.map((req) => {
                              const CategoryIcon =
                                CATEGORY_ICONS[req.category] ||
                                CATEGORY_ICONS.other;
                              const isExpanded = expandedRequirements.has(
                                req.id,
                              );

                              return (
                                <Card.Root
                                  key={req.id}
                                  size="sm"
                                  variant="outline"
                                  borderLeftWidth="4px"
                                  borderLeftColor={`${PRIORITY_COLORS[normalizePriority(req.priority)]}.500`}
                                >
                                  <Card.Body p={4}>
                                    <VStack align="stretch" gap={3}>
                                      <HStack
                                        justify="space-between"
                                        align="start"
                                      >
                                        <HStack flex={1} align="start" gap={3}>
                                          <CategoryIcon
                                            size={18}
                                            style={{
                                              marginTop: "2px",
                                              flexShrink: 0,
                                            }}
                                          />
                                          <VStack
                                            align="start"
                                            gap={2}
                                            flex={1}
                                          >
                                            <HStack gap={2} flexWrap="wrap">
                                              <Code
                                                fontSize="xs"
                                                colorPalette="gray"
                                                fontWeight="semibold"
                                              >
                                                {req.id}
                                              </Code>
                                              <Badge
                                                colorPalette={
                                                  PRIORITY_COLORS[
                                                    normalizePriority(
                                                      req.priority,
                                                    )
                                                  ]
                                                }
                                                size="sm"
                                                variant="solid"
                                              >
                                                {normalizePriority(
                                                  req.priority,
                                                )}
                                              </Badge>
                                              <Badge
                                                colorPalette="purple"
                                                size="sm"
                                                variant="subtle"
                                              >
                                                {req.category}
                                              </Badge>
                                              <Badge
                                                colorPalette={
                                                  CONFIDENCE_COLORS[
                                                    req.confidence
                                                  ]
                                                }
                                                size="sm"
                                                variant="outline"
                                              >
                                                {req.confidence} confidence
                                              </Badge>
                                            </HStack>

                                            <HStack gap={3} w="full">
                                              <Box
                                                as="select"
                                                value={normalizePriority(
                                                  req.priority,
                                                )}
                                                onChange={(event) =>
                                                  handleDraftChange(req.id, {
                                                    priority:
                                                      event.target.value,
                                                  })
                                                }
                                                borderWidth="1px"
                                                borderColor="gray.300"
                                                borderRadius="md"
                                                px={2}
                                                py={1}
                                                fontSize="sm"
                                                bg="white"
                                              >
                                                {PRIORITY_LIST.map((value) => (
                                                  <option
                                                    key={value}
                                                    value={value}
                                                  >
                                                    {value}
                                                  </option>
                                                ))}
                                              </Box>
                                              <Textarea
                                                value={req.description}
                                                onChange={(event) =>
                                                  handleDraftChange(req.id, {
                                                    description:
                                                      event.target.value,
                                                  })
                                                }
                                                placeholder="Describe the requirement"
                                                size="sm"
                                                minH="80px"
                                              />
                                            </HStack>
                                          </VStack>
                                        </HStack>

                                        {(req.source || req.relatedCode) && (
                                          <IconButton
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              toggleRequirement(req.id)
                                            }
                                          >
                                            {isExpanded ? (
                                              <ChevronDown size={16} />
                                            ) : (
                                              <ChevronRight size={16} />
                                            )}
                                          </IconButton>
                                        )}
                                      </HStack>

                                      {isExpanded && (
                                        <VStack align="stretch" gap={3} mt={2}>
                                          <Separator />

                                          {req.source && (
                                            <Box>
                                              <HStack gap={2} mb={2}>
                                                <FileCode size={14} />
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.600"
                                                >
                                                  Source Location
                                                </Text>
                                              </HStack>
                                              <Code
                                                fontSize="xs"
                                                colorPalette="blue"
                                                display="block"
                                                p={2}
                                                borderRadius="md"
                                              >
                                                {req.source}
                                              </Code>
                                            </Box>
                                          )}

                                          {req.relatedCode && (
                                            <Box>
                                              <HStack gap={2} mb={2}>
                                                <Code2 size={14} />
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.600"
                                                >
                                                  Related Code
                                                </Text>
                                              </HStack>
                                              <Box
                                                bg="gray.50"
                                                p={3}
                                                borderRadius="md"
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                fontSize="xs"
                                                fontFamily="mono"
                                                overflowX="auto"
                                                whiteSpace="pre"
                                              >
                                                {req.relatedCode}
                                              </Box>
                                            </Box>
                                          )}
                                        </VStack>
                                      )}
                                    </VStack>
                                  </Card.Body>
                                </Card.Root>
                              );
                            })}
                          </VStack>
                        </Box>
                      ),
                  )}
                </VStack>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  No requirements available to edit.
                </Text>
              )}
            </VStack>
          ) : sortedRequirements.length > 0 ? (
            <VStack align="stretch" gap={6}>
              {/* Summary Stats */}
              <Grid
                templateColumns="repeat(auto-fit, minmax(200px, 1fr))"
                gap={4}
              >
                <Card.Root size="sm" variant="outline">
                  <Card.Body>
                    <VStack align="start" gap={1}>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium">
                        Total Requirements
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold">
                        {sortedRequirements.length}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {Object.entries(groupedRequirements).map(
                  ([priority, reqs]) =>
                    reqs.length > 0 && (
                      <Card.Root key={priority} size="sm" variant="outline">
                        <Card.Body>
                          <HStack justify="space-between">
                            <VStack align="start" gap={1}>
                              <Text
                                fontSize="xs"
                                color="gray.500"
                                fontWeight="medium"
                              >
                                Priority {priority}
                              </Text>
                              <Text fontSize="2xl" fontWeight="bold">
                                {reqs.length}
                              </Text>
                            </VStack>
                            <Badge
                              colorPalette={PRIORITY_COLORS[priority]}
                              size="lg"
                              variant="solid"
                            >
                              {priority}
                            </Badge>
                          </HStack>
                        </Card.Body>
                      </Card.Root>
                    ),
                )}
              </Grid>

              {/* Requirements List */}
              <VStack align="stretch" gap={3}>
                {Object.entries(groupedRequirements).map(
                  ([priority, reqs]) =>
                    reqs.length > 0 && (
                      <Box key={priority}>
                        <Heading size="sm" mb={3} color="gray.700">
                          {priority === "P0" && "🔴 Critical (P0)"}
                          {priority === "P1" && "🟠 High Priority (P1)"}
                          {priority === "P2" && "🔵 Medium Priority (P2)"}
                          {priority === "P3" && "⚪ Low Priority (P3)"}
                        </Heading>

                        <VStack align="stretch" gap={2}>
                          {reqs.map((req) => {
                            const CategoryIcon =
                              CATEGORY_ICONS[req.category] ||
                              CATEGORY_ICONS.other;
                            const isExpanded = expandedRequirements.has(req.id);

                            return (
                              <Card.Root
                                key={req.id}
                                size="sm"
                                variant="outline"
                                borderLeftWidth="4px"
                                borderLeftColor={`${PRIORITY_COLORS[priority]}.500`}
                              >
                                <Card.Body p={4}>
                                  <VStack align="stretch" gap={3}>
                                    {/* Header Row */}
                                    <HStack
                                      justify="space-between"
                                      align="start"
                                    >
                                      <HStack flex={1} align="start" gap={3}>
                                        <CategoryIcon
                                          size={18}
                                          style={{
                                            marginTop: "2px",
                                            flexShrink: 0,
                                          }}
                                        />
                                        <VStack align="start" gap={2} flex={1}>
                                          <HStack gap={2} flexWrap="wrap">
                                            <Code
                                              fontSize="xs"
                                              colorPalette="gray"
                                              fontWeight="semibold"
                                            >
                                              {req.id}
                                            </Code>
                                            <Badge
                                              colorPalette={
                                                PRIORITY_COLORS[priority]
                                              }
                                              size="sm"
                                              variant="solid"
                                            >
                                              {priority}
                                            </Badge>
                                            <Badge
                                              colorPalette="purple"
                                              size="sm"
                                              variant="subtle"
                                            >
                                              {req.category}
                                            </Badge>
                                            <Badge
                                              colorPalette={
                                                CONFIDENCE_COLORS[
                                                  req.confidence
                                                ]
                                              }
                                              size="sm"
                                              variant="outline"
                                            >
                                              {req.confidence} confidence
                                            </Badge>
                                          </HStack>
                                          <Text fontSize="sm" lineHeight="tall">
                                            {req.description}
                                          </Text>
                                        </VStack>
                                      </HStack>

                                      {(req.source || req.relatedCode) && (
                                        <IconButton
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            toggleRequirement(req.id)
                                          }
                                        >
                                          {isExpanded ? (
                                            <ChevronDown size={16} />
                                          ) : (
                                            <ChevronRight size={16} />
                                          )}
                                        </IconButton>
                                      )}
                                    </HStack>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                      <VStack align="stretch" gap={3} mt={2}>
                                        <Separator />

                                        {req.source && (
                                          <Box>
                                            <HStack gap={2} mb={2}>
                                              <FileCode size={14} />
                                              <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.600"
                                              >
                                                Source Location
                                              </Text>
                                            </HStack>
                                            <Code
                                              fontSize="xs"
                                              colorPalette="blue"
                                              display="block"
                                              p={2}
                                              borderRadius="md"
                                            >
                                              {req.source}
                                            </Code>
                                          </Box>
                                        )}

                                        {req.relatedCode && (
                                          <Box>
                                            <HStack gap={2} mb={2}>
                                              <Code2 size={14} />
                                              <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.600"
                                              >
                                                Related Code
                                              </Text>
                                            </HStack>
                                            <Box
                                              bg="gray.50"
                                              p={3}
                                              borderRadius="md"
                                              borderWidth="1px"
                                              borderColor="gray.200"
                                              fontSize="xs"
                                              fontFamily="mono"
                                              overflowX="auto"
                                              whiteSpace="pre"
                                            >
                                              {req.relatedCode}
                                            </Box>
                                          </Box>
                                        )}
                                      </VStack>
                                    )}
                                  </VStack>
                                </Card.Body>
                              </Card.Root>
                            );
                          })}
                        </VStack>
                      </Box>
                    ),
                )}
              </VStack>
            </VStack>
          ) : (
            <Box
              textAlign="center"
              py={8}
              px={4}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="gray.300"
              borderRadius="md"
              color="gray.500"
            >
              <FileText size={32} style={{ margin: "0 auto 12px" }} />
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                No requirements analyzed yet
              </Text>
              <Text fontSize="xs">
                Click <strong>Analyze requirements</strong> to extract business
                rules from code
              </Text>
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      {/* Context Input Dialog */}
      <DialogRoot
        open={showContextDialog}
        onOpenChange={(e) => setShowContextDialog(e.open)}
        size="lg"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <HStack gap={2}>
                <Sparkles size={20} />
                <Text>Provide Additional Context (Optional)</Text>
              </HStack>
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="gray.600">
                Help the AI generate better requirements by providing additional
                context about what you're looking for:
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
                  borderColor="blue.200"
                >
                  <Text>
                    • Focus on security and authentication requirements
                  </Text>
                  <Text>• Include validation rules for user inputs</Text>
                  <Text>• Identify integration points with payment APIs</Text>
                  <Text>• Extract error handling requirements</Text>
                </Box>
              </VStack>
              <Textarea
                placeholder="Enter additional context here (optional)..."
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                minHeight="150px"
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500">
                Leave empty to generate requirements without additional
                guidance.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" onClick={handleCancelContext}>
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button colorPalette="blue" onClick={handleStartAnalysis}>
              <Sparkles size={14} />
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
