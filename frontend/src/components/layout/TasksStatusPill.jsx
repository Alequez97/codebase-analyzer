import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Popover,
  Separator,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown, X, Check } from "lucide-react";
import { useCodebaseStore } from "../../store/useCodebaseStore";
import { useTaskProgressStore } from "../../store/useTaskProgressStore";
import api from "../../api";
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
  [TASK_TYPES.EDIT_DOCUMENTATION]: "Edit Docs",
  [TASK_TYPES.EDIT_DIAGRAMS]: "Edit Diagrams",
  [TASK_TYPES.EDIT_REQUIREMENTS]: "Edit Requirements",
  [TASK_TYPES.EDIT_BUGS_SECURITY]: "Edit Bugs & Security",
  [TASK_TYPES.EDIT_REFACTORING_AND_TESTING]: "Edit Refactoring",
  [TASK_TYPES.CUSTOM_CODEBASE_TASK]: "Custom Task",
};

function taskLabel(type) {
  return TASK_TYPE_LABELS[type] ?? type;
}

function useDomainName(domainId) {
  const analysis = useCodebaseStore((s) => s.analysis);
  if (!domainId) return null;
  if (!analysis?.domains) return domainId;
  const domain = analysis.domains.find((d) => d.id === domainId);
  return domain?.name ?? domainId;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <Text
      px={3}
      pt={2}
      pb={1}
      fontSize="10px"
      fontWeight="700"
      textTransform="uppercase"
      letterSpacing="wider"
      color="gray.500"
    >
      {children}
    </Text>
  );
}

function RunningTaskRow({ taskId, entry }) {
  const domainName = useDomainName(entry.domainId);
  const { clearProgress } = useTaskProgressStore();

  const handleCancel = async () => {
    // Optimistically remove from map; TASK_FAILED socket will also fire
    clearProgress(taskId);
    try {
      await api.cancelTask(taskId);
    } catch {
      // ignore
    }
  };

  return (
    <HStack px={3} py={2} gap={2} align="flex-start" _hover={{ bg: "gray.50" }}>
      <Box
        w="26px"
        h="26px"
        borderRadius="md"
        bg="blue.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        mt="1px"
      >
        <Spinner size="xs" color="blue.500" />
      </Box>

      <Box flex={1} minW={0}>
        {domainName && (
          <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
            {domainName}
          </Text>
        )}
        <Text fontSize="11px" color="gray.500">
          {taskLabel(entry.type)}
        </Text>
        {entry.message && (
          <Text
            fontSize="11px"
            color="gray.600"
            fontStyle="italic"
            truncate
            mt="2px"
          >
            {entry.message}
          </Text>
        )}
        {/* animated progress bar */}
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
        variant="outline"
        colorPalette="gray"
        flexShrink={0}
        mt="2px"
        onClick={handleCancel}
      >
        Cancel
      </Button>
    </HStack>
  );
}

function PendingTaskRow({ taskId, entry }) {
  const domainName = useDomainName(entry.domainId);
  const { clearProgress } = useTaskProgressStore();

  const handleDelete = async () => {
    // Optimistically remove; backend will also clean up
    clearProgress(taskId);
    try {
      await api.deleteTask(taskId);
    } catch {
      // ignore
    }
  };

  return (
    <HStack px={3} py={2} gap={2} align="flex-start" _hover={{ bg: "gray.50" }}>
      <Box
        w="26px"
        h="26px"
        borderRadius="md"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        mt="1px"
      >
        <Text fontSize="11px" color="gray.500" fontWeight="bold">
          ↑
        </Text>
      </Box>

      <Box flex={1} minW={0}>
        {domainName && (
          <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
            {domainName}
          </Text>
        )}
        <Text fontSize="11px" color="gray.500">
          {taskLabel(entry.type)}
        </Text>
        <Text fontSize="11px" color="gray.400" mt="2px">
          Queued — waiting for a free slot
        </Text>
      </Box>

      <Button
        size="xs"
        variant="outline"
        colorPalette="gray"
        flexShrink={0}
        mt="2px"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </HStack>
  );
}

function FailedTaskRow({ taskId, entry }) {
  const domainName = useDomainName(entry.domainId);
  const { dismissFailed } = useTaskProgressStore();

  return (
    <HStack px={3} py={2} gap={2} align="flex-start" _hover={{ bg: "gray.50" }}>
      <Box
        w="26px"
        h="26px"
        borderRadius="md"
        bg="red.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        mt="1px"
      >
        <X size={12} color="var(--chakra-colors-red-500)" />
      </Box>

      <Box flex={1} minW={0}>
        {domainName && (
          <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
            {domainName}
          </Text>
        )}
        <Text fontSize="11px" color="gray.500">
          {taskLabel(entry.type)}
        </Text>
        {entry.error && (
          <Text fontSize="11px" color="red.500" mt="2px" truncate>
            {entry.error}
          </Text>
        )}
      </Box>

      <Button
        size="xs"
        variant="outline"
        colorPalette="red"
        flexShrink={0}
        mt="2px"
        onClick={() => dismissFailed(taskId)}
      >
        Dismiss
      </Button>
    </HStack>
  );
}

function CompletedTaskRow({ taskId, entry }) {
  const domainName = useDomainName(entry.domainId);
  const { clearProgress } = useTaskProgressStore();

  return (
    <HStack px={3} py={2} gap={2} align="flex-start" _hover={{ bg: "gray.50" }}>
      <Box
        w="26px"
        h="26px"
        borderRadius="md"
        bg="green.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        mt="1px"
      >
        <Check size={12} color="var(--chakra-colors-green-600)" />
      </Box>

      <Box flex={1} minW={0}>
        {domainName && (
          <Text fontSize="12px" fontWeight="600" color="gray.800" truncate>
            {domainName}
          </Text>
        )}
        <Text fontSize="11px" color="gray.500">
          {taskLabel(entry.type)}
        </Text>
        <Text fontSize="11px" color="green.600" mt="2px">
          Completed
        </Text>
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

export function TasksStatusPill() {
  const { progressByTaskId, loadingTasks, clearAllFailed } =
    useTaskProgressStore();

  // Filter checkboxes state
  const [showRunning, setShowRunning] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showFailed, setShowFailed] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const allEntries = Array.from(progressByTaskId.entries());
  const runningEntries = allEntries.filter(([, e]) => e.status === "running");
  const pendingEntries = allEntries.filter(([, e]) => e.status === "pending");
  const failedEntries = allEntries.filter(([, e]) => e.status === "failed");
  const completedEntries = allEntries.filter(
    ([, e]) => e.status === "completed",
  );

  const runningCount = runningEntries.length;
  const pendingCount = pendingEntries.length;
  const failedCount = failedEntries.length;
  const completedCount = completedEntries.length;

  // Hide pill entirely when no tasks at all AND not loading
  if (
    !loadingTasks &&
    runningCount === 0 &&
    pendingCount === 0 &&
    failedCount === 0 &&
    completedCount === 0
  )
    return null;

  const hasFailed = failedCount > 0;
  const hasRunning = runningCount > 0;

  // Pill colour: red > blue > gray
  const pillColorPalette = hasFailed ? "red" : hasRunning ? "blue" : "gray";
  const pillVariant = hasFailed || hasRunning ? "subtle" : "outline";

  return (
    <>
      {/* Keyframe for the running progress bar */}
      <style>{`
        @keyframes ca-progress {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

      <Popover.Root positioning={{ placement: "bottom-end" }}>
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
              completedCount > 0 && (
                <Text fontSize="xs">✓ {completedCount} completed</Text>
              )}
            <ChevronDown size={12} />
          </Button>
        </Popover.Trigger>

        <Popover.Positioner>
          <Popover.Content
            width="360px"
            p={0}
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="xl"
            overflow="hidden"
          >
            {/* Header */}
            <VStack gap={0} align="stretch">
              <HStack
                px={3}
                py={2}
                justify="space-between"
                borderBottom="1px solid"
                borderColor="gray.100"
              >
                <Text fontSize="13px" fontWeight="700" color="gray.800">
                  Tasks
                </Text>
                {hasFailed && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="gray"
                    onClick={clearAllFailed}
                  >
                    Clear failed
                  </Button>
                )}
              </HStack>

              {/* Filter checkboxes */}
              <HStack
                px={3}
                py={2}
                gap={3}
                flexWrap="wrap"
                borderBottom="1px solid"
                borderColor="gray.100"
                bg="gray.50"
              >
                {runningCount > 0 && (
                  <HStack
                    gap={1.5}
                    fontSize="11px"
                    cursor="pointer"
                    onClick={() => setShowRunning(!showRunning)}
                  >
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.300"
                      bg={showRunning ? "blue.500" : "white"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {showRunning && <Check size={10} color="white" />}
                    </Box>
                    <Text color="gray.700">Running ({runningCount})</Text>
                  </HStack>
                )}
                {pendingCount > 0 && (
                  <HStack
                    gap={1.5}
                    fontSize="11px"
                    cursor="pointer"
                    onClick={() => setShowPending(!showPending)}
                  >
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.300"
                      bg={showPending ? "blue.500" : "white"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {showPending && <Check size={10} color="white" />}
                    </Box>
                    <Text color="gray.700">Pending ({pendingCount})</Text>
                  </HStack>
                )}
                {failedCount > 0 && (
                  <HStack
                    gap={1.5}
                    fontSize="11px"
                    cursor="pointer"
                    onClick={() => setShowFailed(!showFailed)}
                  >
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.300"
                      bg={showFailed ? "blue.500" : "white"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {showFailed && <Check size={10} color="white" />}
                    </Box>
                    <Text color="gray.700">Failed ({failedCount})</Text>
                  </HStack>
                )}
                {completedCount > 0 && (
                  <HStack
                    gap={1.5}
                    fontSize="11px"
                    cursor="pointer"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.300"
                      bg={showCompleted ? "blue.500" : "white"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {showCompleted && <Check size={10} color="white" />}
                    </Box>
                    <Text color="gray.700">Completed ({completedCount})</Text>
                  </HStack>
                )}
              </HStack>
            </VStack>

            <VStack gap={0} align="stretch" maxH="420px" overflowY="auto">
              {/* Running */}
              {showRunning && runningCount > 0 && (
                <Box>
                  <SectionHeading>
                    <HStack gap={1.5} as="span" display="inline-flex">
                      <Spinner size="xs" color="blue.500" as="span" />
                      <span>Running</span>
                      <Badge colorPalette="blue" size="sm" variant="subtle">
                        {runningCount}
                      </Badge>
                    </HStack>
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

              {/* Pending */}
              {showPending && pendingCount > 0 && (
                <>
                  {showRunning && runningCount > 0 && <Separator />}
                  <Box>
                    <SectionHeading>
                      <HStack gap={1.5} as="span" display="inline-flex">
                        <span>↑ Pending</span>
                        <Badge colorPalette="gray" size="sm" variant="subtle">
                          {pendingCount}
                        </Badge>
                      </HStack>
                    </SectionHeading>
                    {pendingEntries.map(([taskId, entry]) => (
                      <PendingTaskRow
                        key={taskId}
                        taskId={taskId}
                        entry={entry}
                      />
                    ))}
                  </Box>
                </>
              )}

              {/* Failed */}
              {showFailed && failedCount > 0 && (
                <>
                  {((showRunning && runningCount > 0) ||
                    (showPending && pendingCount > 0)) && <Separator />}
                  <Box>
                    <SectionHeading>
                      <HStack gap={1.5} as="span" display="inline-flex">
                        <span>✕ Failed</span>
                        <Badge colorPalette="red" size="sm" variant="subtle">
                          {failedCount}
                        </Badge>
                      </HStack>
                    </SectionHeading>
                    {failedEntries.map(([taskId, entry]) => (
                      <FailedTaskRow
                        key={taskId}
                        taskId={taskId}
                        entry={entry}
                      />
                    ))}
                  </Box>
                </>
              )}

              {/* Completed */}
              {showCompleted && completedCount > 0 && (
                <>
                  {((showRunning && runningCount > 0) ||
                    (showPending && pendingCount > 0) ||
                    (showFailed && failedCount > 0)) && <Separator />}
                  <Box>
                    <SectionHeading>
                      <HStack gap={1.5} as="span" display="inline-flex">
                        <span>✓ Completed</span>
                        <Badge colorPalette="green" size="sm" variant="subtle">
                          {completedCount}
                        </Badge>
                      </HStack>
                    </SectionHeading>
                    {completedEntries.map(([taskId, entry]) => (
                      <CompletedTaskRow
                        key={taskId}
                        taskId={taskId}
                        entry={entry}
                      />
                    ))}
                  </Box>
                </>
              )}
            </VStack>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </>
  );
}
