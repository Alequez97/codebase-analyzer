import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Badge,
  Button,
  Table,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/card";
import { Alert } from "../ui/alert";
import { useConfigStore } from "../../store/useConfigStore";
import { useAnalysisStore } from "../../store/useAnalysisStore";

export function ModulesSection() {
  const navigate = useNavigate();
  const { config } = useConfigStore();
  const {
    analysis,
    analyzingCodebase,
    pendingCodebaseTask,
    analyzeCodebase,
    analyzeDomain,
    domainAnalyzeLoadingById,
  } = useAnalysisStore();

  const domains = analysis?.domains || [];

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="lg">
            Code Domains{config?.target ? ` - ${config.target.name}` : ""}
          </Heading>
          <Button
            colorPalette="blue"
            onClick={analyzeCodebase}
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
              {pendingCodebaseTask
                ? `Task ID: ${pendingCodebaseTask.id} - Analyzing your codebase. This may take a few minutes.`
                : "Analyzing your codebase. This may take a few minutes."}
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
            <Box p={4} bg="blue.50" borderRadius="md">
              <Heading size="sm" mb={2} color="blue.800">
                Platform Description
              </Heading>
              <Text fontSize="sm" color="gray.700">
                {analysis?.summary ||
                  "No platform summary available yet. Run codebase analysis to generate it."}
              </Text>
            </Box>

            <HStack justify="space-between">
              <Text color="gray.600">
                Found {domains.length} domain{domains.length !== 1 ? "s" : ""}
              </Text>
            </HStack>

            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Domain</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">
                    Actions
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {domains.map((domain) => {
                  const isAnalyzing = !!domainAnalyzeLoadingById.get(domain.id);
                  return (
                    <Table.Row key={domain.id}>
                      <Table.Cell>
                        <VStack align="start" gap={1}>
                          <HStack>
                            <Text fontWeight="semibold">{domain.name}</Text>
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
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {domain.id}
                          </Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text color="gray.700">{domain.businessPurpose}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={domain.hasAnalysis ? "green" : "gray"}
                        >
                          {domain.hasAnalysis ? "Analyzed" : "Not analyzed"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <HStack justify="flex-end">
                          <Button
                            size="sm"
                            colorPalette="blue"
                            variant="outline"
                            onClick={() => navigate(`/domains/${domain.id}`)}
                          >
                            Detailed analysis
                          </Button>
                          <Button
                            size="sm"
                            colorPalette="blue"
                            onClick={() => analyzeDomain(domain)}
                            loading={isAnalyzing}
                            loadingText="Analyzing"
                          >
                            Analyze
                          </Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
