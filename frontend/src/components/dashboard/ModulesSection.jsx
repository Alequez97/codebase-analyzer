import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../ui/dialog";
import {
  Bug,
  ChevronDown,
  ChevronRight,
  FileEdit,
  GripVertical,
  Pencil,
  Save,
  ScanSearch,
  Search,
  Shield,
  Sparkles,
  TestTube,
  X,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { toaster } from "../ui/toaster";
import { useCodebaseStore } from "../../store/useCodebaseStore";
import { useLogsStore } from "../../store/useLogsStore";
import {
  useTaskProgressStore,
  selectDomainProgress,
} from "../../store/useTaskProgressStore";
import { GROUPED_TASK_TYPES } from "../../utils/grouped-task-types";
import { useDomainDocumentationStore } from "../../store/useDomainDocumentationStore";
import { useDomainRequirementsStore } from "../../store/useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "../../store/useDomainBugsSecurityStore";
import { useDomainRefactoringAndTestingStore } from "../../store/useDomainRefactoringAndTestingStore";

const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];

const PRIORITY_CONFIG = {
  P0: {
    label: "Critical",
    color: "#991b1b",
    bg: "#fff5f5",
    headerBorder: "#f9c6c6",
    dot: "#ef4444",
    badgePalette: "red",
  },
  P1: {
    label: "High",
    color: "#9a3412",
    bg: "#fff8f2",
    headerBorder: "#fddcb5",
    dot: "#f97316",
    badgePalette: "orange",
  },
  P2: {
    label: "Medium",
    color: "#854d0e",
    bg: "#fefce8",
    headerBorder: "#fde68a",
    dot: "#eab308",
    badgePalette: "yellow",
  },
  P3: {
    label: "Low",
    color: "#4b5563",
    bg: "#f9fafb",
    headerBorder: "#e5e7eb",
    dot: "#9ca3af",
    badgePalette: "gray",
  },
};

const DOMAIN_SECTIONS = [
  { key: "documentation", label: "Docs" },
  { key: "requirements", label: "Reqs" },
  { key: "bugsSecurity", label: "Bugs" },
  { key: "testing", label: "Tests" },
];

function DomainCard({ domain, provided, snapshot }) {
  const navigate = useNavigate();
  const progressByTaskId = useTaskProgressStore((s) => s.progressByTaskId);
  const activeProgress = selectDomainProgress(progressByTaskId, domain.id);
  const docAnalyze = useDomainDocumentationStore((s) => s.analyze);
  const reqAnalyze = useDomainRequirementsStore((s) => s.analyze);
  const bugsAnalyze = useDomainBugsSecurityStore((s) => s.analyze);
  const testAnalyze = useDomainRefactoringAndTestingStore((s) => s.analyze);

  const docDataById = useDomainDocumentationStore((s) => s.dataById);
  const reqDataById = useDomainRequirementsStore((s) => s.dataById);
  const bugsDataById = useDomainBugsSecurityStore((s) => s.dataById);
  const testDataById = useDomainRefactoringAndTestingStore((s) => s.dataById);

  const sectionData = {
    documentation: docDataById,
    requirements: reqDataById,
    bugsSecurity: bugsDataById,
    testing: testDataById,
  };

  const sectionAnalyzers = {
    documentation: docAnalyze,
    requirements: reqAnalyze,
    bugsSecurity: bugsAnalyze,
    testing: testAnalyze,
  };

  // A section is considered analyzed if either the in-memory store has data for it
  // (fetched this session) OR the backend already reported it as analyzed in domain.sections
  // (persisted on disk, accurate after page reload).
  const isSectionAnalyzed = (key) =>
    sectionData[key]?.has(domain.id) || !!domain.sections?.[key];

  const shouldShowAnalyzeButton = DOMAIN_SECTIONS.some(({ key }) => {
    const isRunning = GROUPED_TASK_TYPES[key]?.some((t) =>
      activeProgress.has(t),
    );
    return !isSectionAnalyzed(key) && !isRunning;
  });

  const handleAnalyze = () => {
    DOMAIN_SECTIONS.forEach(({ key }) => {
      const isRunning = GROUPED_TASK_TYPES[key]?.some((t) =>
        activeProgress.has(t),
      );
      if (!isSectionAnalyzed(key) && !isRunning) {
        sectionAnalyzers[key](domain);
      }
    });
  };

  return (
    <Box
      ref={provided.innerRef}
      {...provided.draggableProps}
      bg={snapshot.isDragging ? "blue.50" : "white"}
      borderWidth="1.5px"
      borderColor={
        snapshot.isDragging
          ? "blue.300"
          : domain.hasAnalysis
            ? "green.200"
            : "gray.200"
      }
      borderLeftWidth={domain.hasAnalysis ? "3px" : "1.5px"}
      borderLeftColor={domain.hasAnalysis ? "green.400" : "gray.200"}
      borderRadius="lg"
      boxShadow={
        snapshot.isDragging
          ? "0 8px 24px rgba(59,130,246,.25)"
          : "0 1px 3px rgba(0,0,0,.06)"
      }
      transition="box-shadow 0.15s, border-color 0.15s"
      _hover={{
        boxShadow: "0 3px 10px rgba(0,0,0,.1)",
        borderColor: "gray.300",
      }}
      overflow="hidden"
    >
      <HStack align="stretch" gap={0}>
        {/* Drag handle */}
        <Box
          {...provided.dragHandleProps}
          px={2}
          display="flex"
          alignItems="center"
          color="gray.300"
          _hover={{ color: "gray.500", bg: "gray.50" }}
          cursor="grab"
          borderRightWidth="1px"
          borderRightColor="gray.100"
          flexShrink={0}
        >
          <GripVertical size={14} />
        </Box>

        {/* Card body */}
        <Box p={3} flex="1" minW={0}>
          <Text
            fontWeight="700"
            fontSize="sm"
            color="gray.800"
            lineHeight="short"
            mb={1}
            noOfLines={1}
          >
            {domain.name}
          </Text>
          <Text fontSize="xs" color="gray.500" lineHeight="tall" mb={2}>
            {domain.businessPurpose}
          </Text>
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              {DOMAIN_SECTIONS.map(({ key, label }) => {
                const isRunning = GROUPED_TASK_TYPES[key]?.some((t) =>
                  activeProgress.has(t),
                );
                return (
                  <HStack key={key} gap={1} title={label}>
                    <Box
                      w="6px"
                      h="6px"
                      borderRadius="full"
                      flexShrink={0}
                      bg={
                        isRunning
                          ? "blue.400"
                          : isSectionAnalyzed(key)
                            ? "green.400"
                            : "gray.300"
                      }
                      style={
                        isRunning
                          ? {
                              animation: "dotBounce 0.7s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />
                    <Text
                      fontSize="9px"
                      fontWeight="500"
                      color={
                        isRunning
                          ? "blue.500"
                          : isSectionAnalyzed(key)
                            ? "green.600"
                            : "gray.400"
                      }
                    >
                      {label}
                    </Text>
                  </HStack>
                );
              })}
            </HStack>
            <HStack gap={1.5}>
              <Button
                size="xs"
                colorPalette="blue"
                variant="subtle"
                borderRadius="md"
                onClick={handleAnalyze}
                disabled={!shouldShowAnalyzeButton}
                fontSize="11px"
                h="22px"
                px={2.5}
              >
                <Sparkles size={11} /> Analyze
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                borderRadius="md"
                onClick={() => navigate(`/domains/${domain.id}`)}
                fontSize="11px"
                h="22px"
                px={2.5}
              >
                View →
              </Button>
            </HStack>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
}

function PrioritySection({ priority, domains, isExpanded, onToggle }) {
  const cfg = PRIORITY_CONFIG[priority];

  return (
    <Droppable droppableId={priority}>
      {(provided, snapshot) => (
        <Box
          borderWidth="1.5px"
          borderColor={snapshot.isDraggingOver ? "blue.300" : cfg.headerBorder}
          borderRadius="xl"
          overflow="hidden"
          transition="border-color 0.15s"
          boxShadow={
            snapshot.isDraggingOver ? "0 0 0 3px rgba(59,130,246,.15)" : "none"
          }
        >
          {/* Section header */}
          <HStack
            px={4}
            py={3}
            bg={snapshot.isDraggingOver ? "#f0f6ff" : cfg.bg}
            borderBottomWidth={isExpanded ? "1px" : "0"}
            borderBottomColor={cfg.headerBorder}
            cursor="pointer"
            onClick={onToggle}
            _hover={{ filter: "brightness(0.97)" }}
            transition="background 0.15s"
            gap={3}
            userSelect="none"
          >
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={cfg.dot}
              flexShrink={0}
            />
            <Text fontWeight="700" fontSize="sm" color={cfg.color} flex="1">
              {priority} · {cfg.label}
            </Text>
            <HStack gap={2}>
              <Badge
                fontSize="10px"
                fontWeight="700"
                colorPalette={cfg.badgePalette}
                borderRadius="full"
                px={2}
              >
                {domains.length}
              </Badge>
              <Box color="gray.400">
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </Box>
            </HStack>
          </HStack>

          {/* Drop zone — always rendered for DnD to work */}
          <Box ref={provided.innerRef} {...provided.droppableProps}>
            {isExpanded ? (
              <Box
                px={3}
                pt={3}
                pb={1}
                bg="white"
                display="grid"
                gridTemplateColumns="repeat(3, 1fr)"
                gap={3}
              >
                {domains.length === 0 ? (
                  <Box
                    gridColumn="1 / -1"
                    py={6}
                    textAlign="center"
                    color="gray.400"
                    fontSize="xs"
                    fontStyle="italic"
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor={
                      snapshot.isDraggingOver ? "blue.300" : "gray.200"
                    }
                    borderRadius="lg"
                    mb={2}
                    bg={snapshot.isDraggingOver ? "blue.50" : "transparent"}
                    transition="all 0.15s"
                  >
                    {snapshot.isDraggingOver
                      ? `Drop here → assign ${priority}`
                      : "No domains in this group yet"}
                  </Box>
                ) : (
                  domains.map((domain, index) => (
                    <Draggable
                      key={domain.id}
                      draggableId={domain.id}
                      index={index}
                    >
                      {(dp, ds) => (
                        <DomainCard
                          domain={domain}
                          provided={dp}
                          snapshot={ds}
                        />
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </Box>
            ) : (
              /* Collapsed — small drop hint area */
              <Box
                px={3}
                py={snapshot.isDraggingOver ? 3 : 0}
                bg={snapshot.isDraggingOver ? "blue.50" : "transparent"}
                minH={snapshot.isDraggingOver ? "56px" : "0px"}
                transition="all 0.15s"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {snapshot.isDraggingOver && (
                  <Text fontSize="xs" color="blue.500" fontWeight="600">
                    Drop here → assign {priority}
                  </Text>
                )}
                {provided.placeholder}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Droppable>
  );
}

export function ModulesSection() {
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    P0: true,
    P1: true,
    P2: false,
    P3: false,
  });

  const { toggleDashboardLogs } = useLogsStore();
  const {
    analysis,
    analyzingCodebase,
    analyzeCodebase,
    cancelCodebaseAnalysis,
    saveCodebaseSummary,
    editCodebaseAnalysisStructure,
    updateDomainPriority,
  } = useCodebaseStore();

  const domains = analysis?.domains || [];
  const [searchQuery, setSearchQuery] = useState("");

  // Filter domains by search query
  const filteredDomains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.businessPurpose?.toLowerCase().includes(q),
    );
  }, [domains, searchQuery]);

  // Group domains by priority
  const domainsByPriority = useMemo(() => {
    const groups = { P0: [], P1: [], P2: [], P3: [] };
    filteredDomains.forEach((d) => {
      if (groups[d.priority]) groups[d.priority].push(d);
      else groups.P3.push(d);
    });
    return groups;
  }, [filteredDomains]);

  useEffect(() => {
    if (!isEditingSummary) setEditedSummary(analysis?.summary || "");
  }, [analysis?.summary, isEditingSummary]);

  const handleEnterSummaryEdit = () => {
    setEditedSummary(analysis?.summary || "");
    setIsEditingSummary(true);
  };

  const handleCancelSummaryEdit = () => {
    setEditedSummary(analysis?.summary || "");
    setIsEditingSummary(false);
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    const result = await saveCodebaseSummary(editedSummary);
    setSavingSummary(false);

    if (result.success) {
      toaster.create({ title: "Platform description saved", type: "success" });
      setIsEditingSummary(false);
      return;
    }
    toaster.create({
      title: "Failed to save platform description",
      description: result.error,
      type: "error",
    });
  };

  const handleCancelReanalysis = async () => {
    const result = await cancelCodebaseAnalysis();
    if (!result.success) {
      toaster.create({
        title: "Failed to cancel analysis",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleOpenEditDialog = () => {
    setEditInstructions("");
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditInstructions("");
  };

  const handleSubmitEdit = async () => {
    if (!editInstructions.trim()) {
      toaster.create({
        title: "Instructions required",
        description: "Please provide instructions for what to change",
        type: "error",
      });
      return;
    }

    setSubmittingEdit(true);
    const result = await editCodebaseAnalysisStructure(editInstructions);
    setSubmittingEdit(false);

    if (result.success) {
      toaster.create({
        title: "Analysis update started",
        description: "AI is updating the codebase analysis structure",
        type: "success",
      });
      handleCloseEditDialog();
      toggleDashboardLogs(); // Open logs to show progress
      return;
    }

    toaster.create({
      title: "Failed to start update",
      description: result.error,
      type: "error",
    });
  };

  const toggleSection = (priority) =>
    setExpandedSections((prev) => ({ ...prev, [priority]: !prev[priority] }));

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newPriority = destination.droppableId;

    // Auto-expand destination so the card is immediately visible
    setExpandedSections((prev) => ({ ...prev, [newPriority]: true }));

    const res = await updateDomainPriority(draggableId, newPriority);
    if (!res.success) {
      toaster.create({
        title: "Failed to update priority",
        description: res.error,
        type: "error",
      });
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!analyzingCodebase && domains.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="calc(100vh - 52px)"
        bg="white"
      >
        <VStack gap={6} px={4} textAlign="center">
          <Box
            p={3}
            bg="blue.50"
            borderRadius="full"
            color="blue.500"
            display="inline-flex"
          >
            <ScanSearch size={36} strokeWidth={1.5} />
          </Box>
          <VStack gap={2}>
            <Heading size="xl" color="gray.800" fontWeight="bold">
              AI-Powered Code Analysis
            </Heading>
            <Text fontSize="md" color="gray.500" maxW="520px" lineHeight="tall">
              Let AI automatically audit your codebase — discovering functional
              domains, surfacing bugs, flagging security vulnerabilities, and
              identifying missing test coverage.
            </Text>
          </VStack>
          <HStack gap={4} w="full" maxW="640px" justify="center">
            {[
              {
                bg: "red.50",
                border: "red.100",
                iconColor: "red.500",
                Icon: Bug,
                label: "Bug Detection",
                desc: "Logic errors, race conditions & edge cases",
              },
              {
                bg: "orange.50",
                border: "orange.100",
                iconColor: "orange.500",
                Icon: Shield,
                label: "Security Scan",
                desc: "Injections, XSS, auth flaws & data exposure",
              },
              {
                bg: "green.50",
                border: "green.100",
                iconColor: "green.500",
                Icon: TestTube,
                label: "Test Coverage",
                desc: "Missing tests, gaps & actionable suggestions",
              },
            ].map(({ bg, border, iconColor, Icon, label, desc }) => (
              <VStack
                key={label}
                gap={2}
                p={3}
                flex="1"
                bg={bg}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={border}
              >
                <Box color={iconColor}>
                  <Icon size={22} strokeWidth={1.5} />
                </Box>
                <Text fontWeight="semibold" color="gray.700" fontSize="sm">
                  {label}
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  {desc}
                </Text>
              </VStack>
            ))}
          </HStack>
          <Button
            size="lg"
            colorPalette="blue"
            px={8}
            fontWeight="semibold"
            borderRadius="xl"
            onClick={analyzeCodebase}
            shadow="md"
            _hover={{ shadow: "lg", transform: "translateY(-1px)" }}
            transition="all 0.15s ease"
          >
            <ScanSearch size={18} /> Analyze Codebase
          </Button>
          <Text fontSize="xs" color="gray.400">
            Runs in the background — results appear automatically when complete.
            Want to follow along?{" "}
            <Text
              as="span"
              color="blue.400"
              cursor="pointer"
              textDecoration="underline"
              _hover={{ color: "blue.500" }}
              onClick={toggleDashboardLogs}
            >
              Open Logs
            </Text>
            .
          </Text>
        </VStack>
      </Box>
    );
  }

  // ── Domain board ─────────────────────────────────────────────────────────
  return (
    <Box p={6} maxW="1200px" mx="auto">
      <style>{`
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-3px); opacity: 0.7; }
        }
      `}</style>
      <VStack align="stretch" gap={4}>
        {/* Re-analyzing banner */}
        {analyzingCodebase && (
          <HStack
            px={4}
            py={3}
            bg="blue.50"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="blue.100"
            gap={3}
          >
            <Spinner size="xs" color="blue.500" />
            <Text fontSize="sm" color="blue.700" flex="1">
              Re-analyzing codebase in the background…
            </Text>
            <Button
              variant="ghost"
              size="xs"
              colorPalette="blue"
              onClick={toggleDashboardLogs}
            >
              View Logs
            </Button>
            <IconButton
              variant="ghost"
              size="xs"
              colorPalette="red"
              onClick={handleCancelReanalysis}
              aria-label="Cancel re-analysis"
            >
              <X size={12} />
            </IconButton>
          </HStack>
        )}

        {/* Platform description */}
        <Box
          p={4}
          bg="blue.50"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="blue.100"
        >
          <HStack justify="space-between" mb={2}>
            <HStack gap={1}>
              <Text
                fontSize="xs"
                fontWeight="700"
                letterSpacing="wider"
                textTransform="uppercase"
                color="blue.700"
              >
                Platform Description
              </Text>
              {!isEditingSummary && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorPalette="blue"
                  onClick={handleEnterSummaryEdit}
                  title="Edit"
                >
                  <Pencil size={13} />
                </IconButton>
              )}
              {isEditingSummary && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorPalette="gray"
                  onClick={handleCancelSummaryEdit}
                  title="Cancel"
                >
                  <X size={13} />
                </IconButton>
              )}
            </HStack>
            <HStack gap={2}>
              {isEditingSummary && (
                <Button
                  size="xs"
                  colorPalette="green"
                  onClick={handleSaveSummary}
                  loading={savingSummary}
                >
                  <Save size={12} /> Save
                </Button>
              )}
            </HStack>
          </HStack>
          {isEditingSummary ? (
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              rows={4}
              fontSize="sm"
              placeholder="Describe what this platform does…"
              bg="white"
            />
          ) : (
            <Text fontSize="sm" color="gray.700" lineHeight="tall">
              {analysis?.summary ||
                "No platform summary available yet. Run codebase analysis to generate it."}
            </Text>
          )}
        </Box>

        {/* Domain count hint + search */}
        <HStack justify="space-between" align="center">
          <HStack gap={2}>
            <Text fontSize="sm" color="gray.500" fontWeight="500">
              Found{" "}
              <Text as="span" fontWeight="700" color="gray.800">
                {filteredDomains.length}
              </Text>
              {filteredDomains.length !== domains.length && (
                <Text as="span" color="gray.400">
                  {" "}
                  of {domains.length}
                </Text>
              )}{" "}
              domains across{" "}
              <Text as="span" fontWeight="700" color="gray.800">
                {
                  PRIORITY_ORDER.filter((p) => domainsByPriority[p]?.length > 0)
                    .length
                }
              </Text>{" "}
              priority groups
            </Text>
            <Text fontSize="xs" color="gray.400">
              — drag cards between groups to reprioritize
            </Text>
          </HStack>
          <HStack gap={2}>
            <Box position="relative">
              <Box
                position="absolute"
                left={2.5}
                top="50%"
                transform="translateY(-50%)"
                color="gray.400"
                pointerEvents="none"
                zIndex={1}
              >
                <Search size={13} />
              </Box>
              <Input
                placeholder="Filter domains…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="xs"
                w="200px"
                pl={7}
                borderRadius="md"
                fontSize="xs"
              />
            </Box>
            <Button
              size="xs"
              variant="outline"
              colorPalette="blue"
              onClick={handleOpenEditDialog}
              title="Edit codebase analysis structure"
            >
              <FileEdit size={12} /> Edit Structure
            </Button>
          </HStack>
        </HStack>

        {/* Priority sections */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <VStack align="stretch" gap={3}>
            {PRIORITY_ORDER.map((priority) => (
              <PrioritySection
                key={priority}
                priority={priority}
                domains={domainsByPriority[priority] || []}
                isExpanded={expandedSections[priority]}
                onToggle={() => toggleSection(priority)}
              />
            ))}
          </VStack>
        </DragDropContext>
      </VStack>

      {/* Edit Codebase Analysis Dialog */}
      <DialogRoot
        open={showEditDialog}
        onOpenChange={(e) => !submittingEdit && setShowEditDialog(e.open)}
        size="lg"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Codebase Analysis Structure</DialogTitle>
            <DialogCloseTrigger disabled={submittingEdit} />
          </DialogHeader>
          <DialogBody pb={6}>
            <VStack align="stretch" gap={3}>
              <Text fontSize="sm" color="gray.600">
                Describe what you want to change about the codebase analysis
                structure:
              </Text>
              <VStack align="stretch" gap={2}>
                <Text fontSize="xs" color="gray.500" fontWeight="500">
                  Examples:
                </Text>
                <Box
                  bg="gray.50"
                  p={3}
                  borderRadius="md"
                  fontSize="xs"
                  color="gray.600"
                  lineHeight="tall"
                >
                  • "Add src/api/gateway.ts to the api-layer domain"
                  <br />
                  • "Remove the old-auth domain as it's been deleted"
                  <br />
                  • "Create a new domain called 'notification-service' with
                  files: src/services/email.ts, src/services/sms.ts"
                  <br />• "Move src/utils/validation.ts from shared-utils to
                  auth domain"
                </Box>
              </VStack>
              <Textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Enter your instructions here..."
                rows={6}
                fontSize="sm"
                disabled={submittingEdit}
              />
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={submittingEdit}
              >
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              colorPalette="blue"
              onClick={handleSubmitEdit}
              loading={submittingEdit}
            >
              Submit Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
