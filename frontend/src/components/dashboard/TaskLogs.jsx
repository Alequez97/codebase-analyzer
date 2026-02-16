import { useEffect, useRef, useState } from "react";
import { Box, HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { useSocketStore } from "../../store/useSocketStore";
import { SOCKET_EVENTS } from "../../constants/socket-events";
import { Card } from "../ui/card";

/**
 * Real-time task execution log viewer
 * Displays streaming output from agent tasks
 */
export function TaskLogs() {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const socket = useSocketStore((state) => state.socket);

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

    socket.on(SOCKET_EVENTS.TASK_LOG, handleTaskLog);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_LOG, handleTaskLog);
    };
  }, [socket]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">🤖 Agent Logs</Heading>
      </Card.Header>
      <Card.Body p={0}>
        {logs.length === 0 ? (
          <Box p={8}>
            <VStack gap={3} color="gray.500">
              <Text fontSize="lg">💤 No logs yet</Text>
              <Text fontSize="sm" textAlign="center">
                Agent logs will appear here when analysis tasks are running
              </Text>
            </VStack>
          </Box>
        ) : (
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
        )}
      </Card.Body>
    </Card.Root>
  );
}
