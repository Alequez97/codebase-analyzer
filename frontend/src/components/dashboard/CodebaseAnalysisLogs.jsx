import { Box, Heading } from "@chakra-ui/react";
import { useLogsStore } from "../../store/useLogsStore";
import { Card } from "../ui/card";
import LogsViewer from "../domain/LogsViewer";

/**
 * Codebase analysis logs viewer - displays logs from full codebase analysis task
 */
export function CodebaseAnalysisLogs() {
  const logs = useLogsStore((state) => state.codebaseAnalysisLogs);
  const loading = useLogsStore((state) => state.codebaseLogsLoading);
  const error = useLogsStore((state) => state.codebaseLogsError);

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Agent Logs</Heading>
      </Card.Header>
      <Card.Body p={0}>
        {error ? (
          <Box p={8} color="red.500" fontSize="sm">
            Failed to load logs: {error}
          </Box>
        ) : (
          <LogsViewer logs={logs} loading={loading} />
        )}
      </Card.Body>
    </Card.Root>
  );
}
