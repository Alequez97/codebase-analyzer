import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Badge,
  Text,
  VStack,
  Heading,
} from "@chakra-ui/react";
import { useAppStore } from "../../store/useAppStore";
import { SOCKET_EVENTS, TASK_TYPES } from "../../constants/socket-events";
import { Card } from "../ui/card";

/**
 * Real-time task execution log viewer
 * Displays streaming output from agent tasks
 */
export function TaskLogs() {
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState("logs"); // "logs" | "results"
  const [lastCompletedTask, setLastCompletedTask] = useState(null);
  const logEndRef = useRef(null);
  const socket = useAppStore((state) => state.socket);
  const analysis = useAppStore((state) => state.analysis);

  const domains = analysis?.domains || [];

  useEffect(() => {
    if (!socket) return;

    const handleTaskLog = ({ taskId, type, stream, data }) => {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          taskId,
          type,
          stream,
          data,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleTaskCompleted = ({ taskId, type, moduleId }) => {
      setLastCompletedTask({ taskId, type, moduleId });

      // Auto-switch to results view for codebase analysis tasks
      if (type === TASK_TYPES.CODEBASE_ANALYSIS) {
        setViewMode("results");
      }
    };

    socket.on(SOCKET_EVENTS.TASK_LOG, handleTaskLog);
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, handleTaskCompleted);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_LOG, handleTaskLog);
      socket.off(SOCKET_EVENTS.TASK_COMPLETED, handleTaskCompleted);
    };
  }, [socket]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (logs.length === 0 && !lastCompletedTask) {
    return null;
  }

  const renderLogs = () => (
    <Box
      bg="gray.900"
      color="green.300"
      p={4}
      borderRadius="md"
      fontFamily="monospace"
      fontSize="sm"
      maxH="400px"
      overflowY="auto"
      whiteSpace="pre-wrap"
      wordBreak="break-all"
    >
      <Box fontWeight="bold" mb={2} color="green.400">
        🤖 Agent Execution Logs
      </Box>
      {logs.map((log) => (
        <Box
          key={log.id}
          color={log.stream === "stderr" ? "red.400" : "green.300"}
          opacity={log.stream === "stderr" ? 1 : 0.9}
        >
          {log.data}
        </Box>
      ))}
      <div ref={logEndRef} />
    </Box>
  );

  const renderResults = () => {
    if (
      !lastCompletedTask ||
      lastCompletedTask.type !== TASK_TYPES.CODEBASE_ANALYSIS
    ) {
      return (
        <Box p={4} textAlign="center" color="gray.500">
          <Text>No codebase analysis results available</Text>
        </Box>
      );
    }

    return (
      <Box p={4}>
        <VStack align="stretch" gap={4}>
          {analysis?.summary && (
            <Card.Root variant="outline" colorPalette="green">
              <Card.Body>
                <Heading size="sm" mb={2}>
                  📋 Summary
                </Heading>
                <Text fontSize="sm">{analysis.summary}</Text>
              </Card.Body>
            </Card.Root>
          )}

          <Box>
            <HStack justify="space-between" mb={3}>
              <Heading size="sm">Discovered Domains</Heading>
              <Badge colorPalette="green" size="lg">
                {domains.length} domain{domains.length !== 1 ? "s" : ""}
              </Badge>
            </HStack>

            {domains.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                No domains discovered
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {domains.slice(0, 5).map((domain) => (
                  <Card.Root key={domain.id} variant="subtle" size="sm">
                    <Card.Body>
                      <HStack justify="space-between">
                        <Box>
                          <HStack gap={2} mb={1}>
                            <Text fontWeight="semibold" fontSize="sm">
                              {domain.name}
                            </Text>
                            <Badge
                              size="sm"
                              colorPalette={
                                domain.priority === "P0"
                                  ? "red"
                                  : domain.priority === "P1"
                                    ? "orange"
                                    : domain.priority === "P2"
                                      ? "yellow"
                                      : "gray"
                              }
                            >
                              {domain.priority}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {domain.businessPurpose}
                          </Text>
                        </Box>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                ))}
                {domains.length > 5 && (
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    + {domains.length - 5} more domain
                    {domains.length - 5 !== 1 ? "s" : ""} (scroll up to see all)
                  </Text>
                )}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    );
  };

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">
            {viewMode === "logs" ? "🤖 Agent Logs" : "✅ Analysis Results"}
          </Heading>
          {lastCompletedTask?.type === TASK_TYPES.CODEBASE_ANALYSIS && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setViewMode(viewMode === "logs" ? "results" : "logs")
              }
            >
              {viewMode === "logs" ? "Show Results" : "Show Logs"}
            </Button>
          )}
        </HStack>
      </Card.Header>
      <Card.Body p={0}>
        {viewMode === "logs" ? renderLogs() : renderResults()}
      </Card.Body>
    </Card.Root>
  );
}
