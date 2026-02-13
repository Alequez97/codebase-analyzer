import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Badge,
  Button,
} from "@chakra-ui/react";
import { Card } from "../ui/card";
import { Alert } from "../ui/alert";
import { useAppStore } from "../../store/useAppStore";

export function ModulesSection() {
  const { status, analysis, analyzingCodebase, startCodebaseAnalysis } =
    useAppStore();

  const domains = analysis?.domains || [];

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="lg">
            Code Domains{status?.target ? ` - ${status.target.name}` : ""}
          </Heading>
          <Button
            colorPalette="blue"
            onClick={startCodebaseAnalysis}
            loading={analyzingCodebase}
            loadingText="Analyzing..."
          >
            {domains.length > 0 ? "Re-analyze Codebase" : "Analyze Codebase"}
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {analyzingCodebase && (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Title>Analysis in progress...</Alert.Title>
            <Alert.Description>
              Analyzing your codebase. This may take a few minutes.
            </Alert.Description>
          </Alert.Root>
        )}

        {!analyzingCodebase && domains.length === 0 && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="lg">
              No completed codebase analysis found. Click "Analyze Codebase" to
              generate and load domains.
            </Text>
          </Box>
        )}

        {!analyzingCodebase && domains.length > 0 && (
          <VStack align="stretch" gap={4}>
            {analysis?.summary && (
              <Box p={3} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="gray.700">
                  {analysis.summary}
                </Text>
              </Box>
            )}
            <Text color="gray.600">
              Found {domains.length} domain{domains.length !== 1 ? "s" : ""}
            </Text>
            {domains.map((domain) => (
              <Card.Root key={domain.id} variant="outline">
                <Card.Body>
                  <HStack justify="space-between">
                    <Box flex={1}>
                      <HStack mb={2}>
                        <Heading size="md">{domain.name}</Heading>
                        <Badge
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
                        {domain.hasAnalysis && (
                          <Badge colorPalette="green">Analyzed</Badge>
                        )}
                      </HStack>
                      <Text color="gray.600" mb={2}>
                        {domain.businessPurpose}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {domain.files?.length || 0} file
                        {domain.files?.length !== 1 ? "s" : ""}
                      </Text>
                    </Box>
                    <Button
                      colorPalette={domain.hasAnalysis ? "green" : "blue"}
                      variant={domain.hasAnalysis ? "outline" : "solid"}
                    >
                      {domain.hasAnalysis ? "View Analysis" : "Analyze"}
                    </Button>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
