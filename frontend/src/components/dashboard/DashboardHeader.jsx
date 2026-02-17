import { Box, Heading, Text } from "@chakra-ui/react";
import { useConfigStore } from "../../store/useConfigStore";

export function DashboardHeader() {
  const { config } = useConfigStore();

  return (
    <Box textAlign="center">
      <Heading size="2xl" mb={2}>
        Codebase Analyzer
      </Heading>
      <Text color="gray.600" fontSize="lg">
        AI-powered code analysis and insights
      </Text>
      {config?.target && (
        <Text color="blue.600" fontSize="md" mt={2} fontWeight="medium">
          📁 {config.target.name}
        </Text>
      )}
    </Box>
  );
}
