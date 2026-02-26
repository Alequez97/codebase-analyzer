import { Box, Heading, HStack, Spinner, Text } from "@chakra-ui/react";
import { useConfigStore } from "../../store/useConfigStore";

export function DashboardHeader() {
  const { config, configLoading } = useConfigStore();

  return (
    <Box textAlign="center">
      <Heading size="2xl" mb={2}>
        Codebase Analyzer
      </Heading>
      <Text color="gray.600" fontSize="lg">
        AI-powered code analysis and insights
      </Text>
      {configLoading ? (
        <HStack justify="center" mt={2} gap={2}>
          <Spinner size="sm" color="blue.500" />
          <Text color="gray.500" fontSize="md" fontWeight="medium">
            Loading project...
          </Text>
        </HStack>
      ) : (
        config?.target && (
          <Text color="blue.600" fontSize="md" mt={2} fontWeight="medium">
            📁 {config.target.name}
          </Text>
        )
      )}
    </Box>
  );
}
