import { Box, Heading, Text } from "@chakra-ui/react";
import { useAnalysisStore } from "../../store/useAnalysisStore";

export function DashboardHeader() {
  const { status } = useAnalysisStore();

  return (
    <Box textAlign="center">
      <Heading size="2xl" mb={2}>
        Codebase Analyzer
      </Heading>
      <Text color="gray.600" fontSize="lg">
        AI-powered code analysis and insights
      </Text>
      {status?.target && (
        <Text color="blue.600" fontSize="md" mt={2} fontWeight="medium">
          📁 {status.target.name}
        </Text>
      )}
    </Box>
  );
}
