import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  NativeSelect,
  Popover,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown, X, Check, RotateCw, Trash2 } from "lucide-react";
import { useCodebaseStore } from "../../store/useCodebaseStore";
import { useTaskProgressStore } from "../../store/useTaskProgressStore";
import { useGitBranchesStore } from "../../store/useGitBranchesStore";
import { useLogsStore } from "../../store/useLogsStore";
import { toaster } from "../ui/toaster";
import api from "../../api";
import { reviewChanges } from "../../api/review-changes";
import { TASK_TYPES } from "../../constants/task-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TASK_TYPE_LABELS = {
  [TASK_TYPES.CODEBASE_ANALYSIS]: "Codebase Analysis",
  [TASK_TYPES.DOCUMENTATION]: "Documentation",
  [TASK_TYPES.DIAGRAMS]: "Diagrams",
  [TASK_TYPES.REQUIREMENTS]: "Requirements",
  [TASK_TYPES.BUGS_SECURITY]: "Bugs & Security",
  [TASK_TYPES.REFACTORING_AND_TESTING]: "Refactoring & Testing",
  [TASK_TYPES.IMPLEMENT_FIX]: "Implement Fix",
  [TASK_TYPES.IMPLEMENT_TEST]: "Implement Test",
  [TASK_TYPES.APPLY_REFACTORING]: "Apply Refactoring",
  [TASK_TYPES.EDIT_CODEBASE_ANALYSIS]: "Edit Codebase Analysis",
  [TASK_TYPES.EDIT_DOCUMENTATION]: "Edit Docs",
  [TASK_TYPES.EDIT_DIAGRAMS]: "Edit Diagrams",
  [TASK_TYPES.EDIT_REQUIREMENTS]: "Edit Requirements",
  [TASK_TYPES.EDIT_BUGS_SECURITY]: "Edit Bugs & Security",
  [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]: "Edit Refactoring",
  [TASK_TYPES.CUSTOM_CODEBASE_TASK]: "Custom Task",
  [TASK_TYPES.REVIEW_CHANGES]: "Review Changes",
  [TASK_TYPES.DESIGN_BRAINSTORM]: "Design Brainstorm",
  [TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE]:
    "Design Plan & Style System",
  [TASK_TYPES.DESIGN_GENERATE_PAGE]: "Design Page",
};

function taskLabel(type) {
  return TASK_TYPE_LABELS[type] ?? type;
}

const TASK_TYPE_LABELS_SHORT = {
  [TASK_TYPES.EDIT_CODEBASE_ANALYSIS]: "Edit Codebase",
  [TASK_TYPES.EDIT_DOCUMENTATION]: "Edit Docs",
  [TASK_TYPES.EDIT_DIAGRAMS]: "Edit Diagrams",
  [TASK_TYPES.EDIT_REQUIREMENTS]: "Edit Requirements",
  [TASK_TYPES.EDIT_BUGS_SECURITY]: "Edit Bugs & Security",
  [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]: "Edit Refactoring",
  [TASK_TYPES.REVIEW_CHANGES]: "Review Changes",
  [TASK_TYPES.DESIGN_BRAINSTORM]: "Design Brainstorm",
  [TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE]: "Design Plan",
  [TASK_TYPES.DESIGN_GENERATE_PAGE]: "Design Page",
};

function useDomainName(domainId) {
  const analysis = useCodebaseStore((s) => s.analysis);
  if (!domainId) return null;
  if (!analysis?.domains) return domainId;
  const domain = analysis.domains.find((d) => d.id === domainId);
  return domain?.name ?? domainId;
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ hasBorderTop = false, children }) {
  return (
    <HStack
      px={4}
      pt="10px"
      pb="6px"
      gap={1.5}
      borderTop={hasBorderTop ? "1px solid" : undefined}
      borderColor="gray.100"
    >
      {children}
    </HStack>
  );
}

function SectionLabel({ color = "gray.400", children }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      textTransform="uppercase"
      letterSpacing="wider"
      color={color}
      lineHeight={1}
    >
      {children}
    </Text>
  );
}

function SectionCount({ bg = "gray.100", color = "gray.500", children }) {
  return (
    <Box
      px="6px"
      py="1px"
      borderRadius="full"
      bg={bg}
      fontSize="10px"
      fontWeight="700"
      color={color}
      lineHeight="16px"
    >
      {children}
    </Box>
  );
}

// ── Shared task icon ──────────────────────────────────────────────────────────

function TaskIcon({ bg, children }) {
  return (
    <Box
      w="28px"
      h="28px"
      borderRadius="md"
      bg={bg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      mt="1px"
    >
      {children}
    </Box>
  );
}

// When a task has a domain: domain name is the primary title and task type is the
// subtitle. When there's no domain (e.g. review-changes), the task label is the
// primary title and there is no subtitle.
function useTaskTitles(entry) {
  const domainName = useDomainName(entry.domainId);
  const primary = domainName ?? entry.pageName ?? taskLabel(entry.type);
  const hasContext = Boolean(domainName || entry.pageName);
  return {
    primary,
    subtitle: hasContext ? taskLabel(entry.type) : null,
  };
}

function DelegatedByBadge({ delegatedByTaskId, progressByTaskId }) {
  if (!delegatedByTaskId) return null;
  const origin = progressByTaskId.get(delegatedByTaskId);
  const originLabel = origin
    ? (TASK_TYPE_LABELS_SHORT[origin.type] ?? origin.type)
    : "Review Changes";
  return (
    <Text fontSize="10px" color="blue.400" mt="2px">
      ↳ delegated by {originLabel}
    </Text>
  );
}

function formatElapsedTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function RunningTaskRow({ taskId, entry }) {
  const { primary, subtitle } = useTaskTitles(entry);
  const { clearProgress } = useTaskProgressStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!entry.startTime) return;

    const updateElapsed = () => {
      setElapsedTime(Date.now() - entry.startTime);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [entry.startTime]);

  const handleCancel = async () => {
    clearProgress(taskId);
    try {
      await api.cancelTask(taskId);
    } catch {
      // ignore
    }
  };

  return (
    <HStack
      px={4}
      py="8px"
      gap={2.5}
      align="flex-start"
      _hover={{ bg: "gray.50" }}
    >
      <TaskIcon bg="blue.50">
        <Spinner size="xs" color="blue.500" />
      </TaskIcon>

      <Box flex={1} minW={0}>
        <HStack gap={2} align="baseline">
          <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
            {primary}
          </Text>
          {elapsedTime > 0 && (
            <Badge
              bg="blue.50"
              color="blue.700"
              borderRadius="full"
              px={2}
              py={0.5}
              fontSize="10px"
              fontWeight="600"
              flexShrink={0}
            >
              {formatElapsedTime(elapsedTime)}
            </Badge>
          )}
        </HStack>
        {subtitle && (
          <Text fontSize="11px" color="gray.500" mt="1px">
            {subtitle}
          </Text>
        )}
        {entry.message && (
          <Text
            fontSize="11px"
            color="gray.600"
            fontStyle="italic"
            truncate
            mt="3px"
          >
            {entry.message}
          </Text>
        )}
        <Box
          mt="5px"
          h="2px"
          borderRadius="full"
          bg="blue.100"
          overflow="hidden"
        >
          <Box
            h="100%"
            w="40%"
            bg="blue.400"
            borderRadius="full"
            style={{ animation: "ca-progress 1.4s ease-in-out infinite" }}
          />
        </Box>
      </Box>

      <Button
        size="xs"
        variant="ghost"
        colorPalette="gray"
        px={2}
        flexShrink={0}
        mt="2px"
        onClick={handleCancel}
        title="Cancel task"
      >
        <X size={14} />
      </Button>
    </HStack>
  );
}

function PendingTaskRow({ taskId, entry }) {
  const { primary, subtitle } = useTaskTitles(entry);
  const { clearProgress, progressByTaskId } = useTaskProgressStore();

  const handleDelete = async () => {
    try {
      await api.deleteTask(taskId);
      clearProgress(taskId);
      toaster.create({
        title: "Task deleted",
        type: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "Failed to delete task";
      toaster.create({
        title: "Failed to delete task",
        description: message,
        type: "error",
      });
    }
  };

  return (
    <HStack
      px={4}
      py="8px"
      gap={2.5}
      align="flex-start"
      _hover={{ bg: "gray.50" }}
    >
      <TaskIcon bg="gray.100">
        <Text fontSize="12px" color="gray.500" fontWeight="bold" lineHeight={1}>
          ↑
        </Text>
      </TaskIcon>

      <Box flex={1} minW={0}>
        <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
          {primary}
        </Text>
        {subtitle && (
          <Text fontSize="11px" color="gray.500" mt="1px">
            {subtitle}
          </Text>
        )}
        <Text fontSize="11px" color="gray.400" mt="3px">
          Queued — waiting for a free slot
        </Text>
        <DelegatedByBadge
          delegatedByTaskId={entry.delegatedByTaskId}
          progressByTaskId={progressByTaskId}
        />
      </Box>

      <Button
        size="xs"
        variant="ghost"
        colorPalette="red"
        px={2}
        flexShrink={0}
        mt="2px"
        onClick={handleDelete}
        title="Delete task"
      >
        <Trash2 size={14} />
      </Button>
    </HStack>
  );
}

function FailedTaskRow({ taskId, entry }) {
  const { primary, subtitle } = useTaskTitles(entry);
  const { dismissFailed, markPendingRestart, progressByTaskId } =
    useTaskProgressStore();

  const handleRestart = async () => {
    try {
      await api.restartTask(taskId);
      markPendingRestart(taskId);
      toaster.create({
        title: "Task restarted",
        description: "Task moved back to pending queue",
        type: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "Failed to restart task";
      toaster.create({
        title: "Failed to restart task",
        description: message,
        type: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteTask(taskId);
      dismissFailed(taskId);
      toaster.create({
        title: "Task deleted",
        type: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "Failed to delete task";
      toaster.create({
        title: "Failed to delete task",
        description: message,
        type: "error",
      });
    }
  };

  return (
    <HStack
      px={4}
      py="8px"
      gap={2.5}
      align="flex-start"
      _hover={{ bg: "gray.50" }}
    >
      <TaskIcon bg="red.50">
        <X size={12} color="var(--chakra-colors-red-500)" />
      </TaskIcon>

      <Box flex={1} minW={0}>
        <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
          {primary}
        </Text>
        {subtitle && (
          <Text fontSize="11px" color="gray.500" mt="1px">
            {subtitle}
          </Text>
        )}
        {entry.error && (
          <Text fontSize="11px" color="red.500" mt="3px" truncate>
            {entry.error}
          </Text>
        )}
        <DelegatedByBadge
          delegatedByTaskId={entry.delegatedByTaskId}
          progressByTaskId={progressByTaskId}
        />
      </Box>

      <HStack gap={1} flexShrink={0} mt="2px">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="blue"
          px={2}
          onClick={handleRestart}
          title="Restart task"
        >
          <RotateCw size={14} />
        </Button>
        <Button
          size="xs"
          variant="ghost"
          colorPalette="red"
          px={2}
          onClick={handleDelete}
          title="Delete task"
        >
          <Trash2 size={14} />
        </Button>
      </HStack>
    </HStack>
  );
}

function CanceledTaskRow({ taskId, entry }) {
  const { primary, subtitle } = useTaskTitles(entry);
  const { dismissFailed, markPendingRestart, progressByTaskId } =
    useTaskProgressStore();

  const handleRestart = async () => {
    try {
      await api.restartTask(taskId);
      markPendingRestart(taskId);
      toaster.create({
        title: "Task restarted",
        description: "Task moved back to pending queue",
        type: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "Failed to restart task";
      toaster.create({
        title: "Failed to restart task",
        description: message,
        type: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteTask(taskId);
      dismissFailed(taskId);
      toaster.create({
        title: "Task deleted",
        type: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "Failed to delete task";
      toaster.create({
        title: "Failed to delete task",
        description: message,
        type: "error",
      });
    }
  };

  return (
    <HStack
      px={4}
      py="8px"
      gap={2.5}
      align="flex-start"
      _hover={{ bg: "gray.50" }}
    >
      <TaskIcon bg="orange.50">
        <Text
          fontSize="12px"
          color="orange.500"
          fontWeight="bold"
          lineHeight={1}
        >
          ∅
        </Text>
      </TaskIcon>

      <Box flex={1} minW={0}>
        <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
          {primary}
        </Text>
        {subtitle && (
          <Text fontSize="11px" color="gray.500" mt="1px">
            {subtitle}
          </Text>
        )}
        <Text fontSize="11px" color="orange.500" mt="3px">
          Canceled
        </Text>
        <DelegatedByBadge
          delegatedByTaskId={entry.delegatedByTaskId}
          progressByTaskId={progressByTaskId}
        />
      </Box>

      <HStack gap={1} flexShrink={0} mt="2px">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="blue"
          px={2}
          onClick={handleRestart}
          title="Restart task"
        >
          <RotateCw size={14} />
        </Button>
        <Button
          size="xs"
          variant="ghost"
          colorPalette="red"
          px={2}
          onClick={handleDelete}
          title="Delete task"
        >
          <Trash2 size={14} />
        </Button>
      </HStack>
    </HStack>
  );
}

function CompletedTaskRow({ taskId, entry }) {
  const { primary, subtitle } = useTaskTitles(entry);
  const { clearProgress, progressByTaskId } = useTaskProgressStore();

  return (
    <HStack
      px={4}
      py="8px"
      gap={2.5}
      align="flex-start"
      _hover={{ bg: "gray.50" }}
    >
      <TaskIcon bg="green.50">
        <Check size={12} color="var(--chakra-colors-green-600)" />
      </TaskIcon>

      <Box flex={1} minW={0}>
        <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
          {primary}
        </Text>
        {subtitle && (
          <Text fontSize="11px" color="gray.500" mt="1px">
            {subtitle}
          </Text>
        )}
        <Text fontSize="11px" color="green.600" mt="3px">
          Completed
        </Text>
        <DelegatedByBadge
          delegatedByTaskId={entry.delegatedByTaskId}
          progressByTaskId={progressByTaskId}
        />
      </Box>

      <Button
        size="xs"
        variant="ghost"
        colorPalette="gray"
        flexShrink={0}
        mt="2px"
        onClick={() => clearProgress(taskId)}
      >
        Clear
      </Button>
    </HStack>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TIME_FILTER_OPTIONS = [
  { value: "1", label: "Last hour" },
  { value: "24", label: "Last 24 hours" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function TasksStatusPill() {
  const { progressByTaskId, loadingTasks, timeFilter, setTimeFilter } =
    useTaskProgressStore();
  const { toggleDashboardLogs } = useLogsStore();
  const { baseBranch, setBaseBranch, branches, currentBranch, fetchBranches } =
    useGitBranchesStore();

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // useState is fine here — purely local UI state
  const [isOpen, setIsOpen] = useState(false);

  const allEntries = Array.from(progressByTaskId.entries());

  const isReviewRunning = allEntries.some(
    ([, e]) =>
      e.type === TASK_TYPES.REVIEW_CHANGES &&
      (e.status === "running" || e.status === "pending"),
  );

  const handleStartReview = async () => {
    setIsSubmittingReview(true);
    try {
      await reviewChanges({ baseBranch });
    } catch {
      // task errors surface via socket
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePopoverOpen = (open) => {
    setIsOpen(open);
    if (open) fetchBranches();
  };

  const runningEntries = allEntries.filter(([, e]) => e.status === "running");
  const pendingEntries = allEntries.filter(([, e]) => e.status === "pending");
  const failedEntries = allEntries.filter(([, e]) => e.status === "failed");
  const canceledEntries = allEntries.filter(([, e]) => e.status === "canceled");
  const completedEntries = allEntries.filter(
    ([, e]) => e.status === "completed",
  );

  const runningCount = runningEntries.length;
  const pendingCount = pendingEntries.length;
  const failedCount = failedEntries.length;
  const canceledCount = canceledEntries.length;
  const completedCount = completedEntries.length;
  const totalCount =
    runningCount + pendingCount + failedCount + canceledCount + completedCount;

  const hasFailed = failedCount > 0;
  const hasRunning = runningCount > 0;

  const pillColorPalette = hasFailed ? "red" : hasRunning ? "blue" : "gray";
  const pillVariant = hasFailed || hasRunning ? "subtle" : "outline";

  return (
    <>
      <style>{`
        @keyframes ca-progress {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

      <Popover.Root
        positioning={{ placement: "bottom-end" }}
        open={isOpen}
        onOpenChange={(e) => handlePopoverOpen(e.open)}
      >
        <Popover.Trigger asChild>
          <Button
            size="sm"
            variant={pillVariant}
            colorPalette={pillColorPalette}
            gap={1.5}
            px={2.5}
          >
            {loadingTasks && <Spinner size="xs" />}
            {loadingTasks && <Text fontSize="xs">Loading tasks...</Text>}
            {!loadingTasks && hasRunning && <Spinner size="xs" />}
            {!loadingTasks && hasRunning && (
              <Text fontSize="xs">{runningCount} running</Text>
            )}
            {!loadingTasks && hasRunning && hasFailed && (
              <Box
                w="1px"
                h="12px"
                bg="currentColor"
                opacity={0.25}
                flexShrink={0}
              />
            )}
            {!loadingTasks && hasFailed && (
              <Badge colorPalette="red" size="sm" variant="solid">
                ✕ {failedCount} failed
              </Badge>
            )}
            {!loadingTasks && !hasRunning && !hasFailed && pendingCount > 0 && (
              <Text fontSize="xs">↑ {pendingCount} queued</Text>
            )}
            {!loadingTasks &&
              !hasRunning &&
              !hasFailed &&
              pendingCount === 0 &&
              canceledCount > 0 &&
              completedCount === 0 && (
                <Text fontSize="xs">∅ {canceledCount} canceled</Text>
              )}
            {!loadingTasks &&
              !hasRunning &&
              !hasFailed &&
              pendingCount === 0 &&
              completedCount > 0 && (
                <Text fontSize="xs">✓ {completedCount} completed</Text>
              )}
            {!loadingTasks && totalCount === 0 && (
              <Text fontSize="xs">No recent tasks</Text>
            )}
            <ChevronDown size={12} />
          </Button>
        </Popover.Trigger>

        <Popover.Positioner>
          <Popover.Content
            width="380px"
            p={0}
            boxShadow="0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="xl"
            overflow="hidden"
          >
            {/* Header */}
            <HStack
              px={4}
              py="10px"
              justify="space-between"
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Text fontSize="13px" fontWeight="700" color="gray.900">
                Tasks
              </Text>
              <NativeSelect.Root size="xs" width="auto" minWidth="120px">
                <NativeSelect.Field
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  fontSize="11px"
                  color="gray.600"
                  borderColor="gray.200"
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                >
                  {TIME_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            {/* Review Changes */}
            <Box
              px={4}
              py={3}
              style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              }}
              borderBottom="2px solid"
              borderColor="blue.100"
              opacity={isReviewRunning ? 0.55 : 1}
              pointerEvents={isReviewRunning ? "none" : "auto"}
            >
              <HStack justify="space-between" mb={2} align="baseline">
                <Text fontSize="12px" fontWeight="700" color="blue.900">
                  🌿 Review Changes
                </Text>
                {currentBranch && (
                  <Text fontSize="11px" color="blue.600">
                    Current:{" "}
                    <Text as="span" fontWeight="600">
                      {currentBranch}
                    </Text>
                  </Text>
                )}
              </HStack>
              <HStack gap={2}>
                <Text
                  fontSize="11px"
                  color="blue.700"
                  fontWeight="600"
                  flexShrink={0}
                  whiteSpace="nowrap"
                >
                  Compare against:
                </Text>
                <NativeSelect.Root size="xs" flex={1}>
                  <NativeSelect.Field
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    borderColor="blue.200"
                    bg="white"
                    color="blue.900"
                    _focus={{
                      borderColor: "#0ea5e9",
                      boxShadow: "0 0 0 2px rgba(14,165,233,0.12)",
                    }}
                  >
                    {branches.length === 0 ? (
                      <option value={baseBranch}>{baseBranch}</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))
                    )}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Button
                  size="xs"
                  colorPalette="blue"
                  loading={isSubmittingReview}
                  loadingText="Analyzing…"
                  onClick={handleStartReview}
                  flexShrink={0}
                  fontWeight="600"
                >
                  Analyze
                </Button>
              </HStack>
            </Box>

            {/* Task lists */}
            <VStack gap={0} align="stretch" maxH="400px" overflowY="auto">
              {runningCount > 0 && (
                <Box>
                  <SectionHeading>
                    <Spinner size="xs" color="blue.400" />
                    <SectionLabel color="blue.500">Running</SectionLabel>
                    <SectionCount bg="blue.50" color="blue.700">
                      {runningCount}
                    </SectionCount>
                  </SectionHeading>
                  {runningEntries.map(([taskId, entry]) => (
                    <RunningTaskRow
                      key={taskId}
                      taskId={taskId}
                      entry={entry}
                    />
                  ))}
                </Box>
              )}

              {pendingCount > 0 && (
                <Box>
                  <SectionHeading hasBorderTop={runningCount > 0}>
                    <SectionLabel>↑ Pending</SectionLabel>
                    <SectionCount>{pendingCount}</SectionCount>
                  </SectionHeading>
                  {pendingEntries.map(([taskId, entry]) => (
                    <PendingTaskRow
                      key={taskId}
                      taskId={taskId}
                      entry={entry}
                    />
                  ))}
                </Box>
              )}

              {failedCount > 0 && (
                <Box>
                  <SectionHeading
                    hasBorderTop={runningCount > 0 || pendingCount > 0}
                  >
                    <SectionLabel color="red.400">✕ Failed</SectionLabel>
                    <SectionCount bg="red.50" color="red.600">
                      {failedCount}
                    </SectionCount>
                  </SectionHeading>
                  {failedEntries.map(([taskId, entry]) => (
                    <FailedTaskRow key={taskId} taskId={taskId} entry={entry} />
                  ))}
                </Box>
              )}

              {canceledCount > 0 && (
                <Box>
                  <SectionHeading
                    hasBorderTop={
                      runningCount > 0 || pendingCount > 0 || failedCount > 0
                    }
                  >
                    <SectionLabel color="orange.400">∅ Canceled</SectionLabel>
                    <SectionCount bg="orange.50" color="orange.600">
                      {canceledCount}
                    </SectionCount>
                  </SectionHeading>
                  {canceledEntries.map(([taskId, entry]) => (
                    <CanceledTaskRow
                      key={taskId}
                      taskId={taskId}
                      entry={entry}
                    />
                  ))}
                </Box>
              )}

              {completedCount > 0 && (
                <Box>
                  <SectionHeading
                    hasBorderTop={
                      runningCount > 0 ||
                      pendingCount > 0 ||
                      failedCount > 0 ||
                      canceledCount > 0
                    }
                  >
                    <SectionLabel color="green.500">✓ Completed</SectionLabel>
                    <SectionCount bg="green.50" color="green.700">
                      {completedCount}
                    </SectionCount>
                  </SectionHeading>
                  {completedEntries.map(([taskId, entry]) => (
                    <CompletedTaskRow
                      key={taskId}
                      taskId={taskId}
                      entry={entry}
                    />
                  ))}
                </Box>
              )}
            </VStack>

            {/* Footer */}
            <Box
              px={4}
              py="10px"
              borderTop="1px solid"
              borderColor="gray.100"
              textAlign="center"
            >
              <Text
                as="button"
                fontSize="11px"
                color="gray.400"
                _hover={{ color: "gray.600" }}
                textDecoration="underline"
                textDecorationOffset="2px"
                cursor="pointer"
                bg="none"
                border="none"
                onClick={toggleDashboardLogs}
              >
                View full task logs →
              </Text>
            </Box>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </>
  );
}
