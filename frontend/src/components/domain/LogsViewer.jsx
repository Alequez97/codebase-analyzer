import { formatIsoUtcTimestampsInText } from "../../utils/date-time";

/**
 * Unified logs viewer component for displaying real-time agent logs
 * Used across documentation, requirements, and testing sections
 */
export default function LogsViewer({ logs = "", loading = false }) {
  return (
    <Box
      bg="gray.900"
      color="green.300"
      p={4}
      borderRadius="md"
      fontFamily="mono"
      fontSize="xs"
      maxH="500px"
      overflowY="auto"
      whiteSpace="pre-wrap"
      wordBreak="break-word"
    >
      {loading ? (
        <Text color="gray.500">Loading logs...</Text>
      ) : logs ? (
        <Text as="pre" color="green.300" fontFamily="mono" fontSize="xs">
          {formatIsoUtcTimestampsInText(logs)}
        </Text>
      ) : (
        <Text color="gray.500">
          No logs available. Run analysis to see logs.
        </Text>
      )}
    </Box>
  );
}
