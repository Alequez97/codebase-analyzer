import { useEffect, useRef } from "react";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { useLogsStore } from "../../store/useLogsStore";
import { Card } from "../ui/card";
import { formatIsoUtcTimestampsInText } from "../../utils/date-time";

/**
 * Task execution log viewer for dashboard codebase analysis
 */
export function TaskLogs() {
  const logs = useLogsStore((state) => state.codebaseAnalysisLogs);
  const loading = useLogsStore((state) => state.codebaseLogsLoading);
  const error = useLogsStore((state) => state.codebaseLogsError);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Agent Logs</Heading>
      </Card.Header>
      <Card.Body p={0}>
        {loading ? (
          <Box p={8}>
            <VStack gap={3} color="gray.500">
              <Text fontSize="sm">Loading logs...</Text>
            </VStack>
          </Box>
        ) : error ? (
          <Box p={8}>
            <VStack gap={2} align="stretch">
              <Text fontSize="sm" color="red.500">
                Failed to load logs
              </Text>
              <Text fontSize="xs" color="gray.500">
                {error}
              </Text>
            </VStack>
          </Box>
        ) : logs.length === 0 ? (
          <Box p={8}>
            <VStack gap={3} color="gray.500">
              <Text fontSize="lg">No logs yet</Text>
              <Text fontSize="sm" textAlign="center">
                Click "Analyze Codebase" to start analysis
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
                {formatIsoUtcTimestampsInText(log.data)}
              </Box>
            ))}
            <div ref={logEndRef} />
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
