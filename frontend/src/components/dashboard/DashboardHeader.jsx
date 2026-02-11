import { Box, Heading, Text } from '@chakra-ui/react';

export function DashboardHeader() {
  return (
    <Box textAlign="center">
      <Heading size="2xl" mb={2}>
        Codebase Analyzer
      </Heading>
      <Text color="gray.600" fontSize="lg">
        AI-powered code analysis and insights
      </Text>
    </Box>
  );
}
