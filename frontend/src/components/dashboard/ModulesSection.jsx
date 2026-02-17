import { useEffect, useState } from "react";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Badge,
  Button,
  Table,
  Textarea,
  IconButton,
} from "@chakra-ui/react";
import { Pencil, X, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/card";
import { Alert } from "../ui/alert";
import { toaster } from "../ui/toaster";
import { useConfigStore } from "../../store/useConfigStore";
import { useAnalysisStore } from "../../store/useAnalysisStore";

export function ModulesSection() {
  const navigate = useNavigate();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const { config } = useConfigStore();
  const {
    analysis,
    analyzingCodebase,
    pendingCodebaseTask,
    analyzeCodebase,
    domainAnalyzeLoadingById,
    saveCodebaseSummary,
  } = useAnalysisStore();

  const domains = analysis?.domains || [];

  useEffect(() => {
    if (!isEditingSummary) {
      setEditedSummary(analysis?.summary || "");
    }
  }, [analysis?.summary, isEditingSummary]);

  const handleEnterSummaryEdit = () => {
    setEditedSummary(analysis?.summary || "");
    setIsEditingSummary(true);
  };

  const handleCancelSummaryEdit = () => {
    setEditedSummary(analysis?.summary || "");
    setIsEditingSummary(false);
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    const result = await saveCodebaseSummary(editedSummary);
    setSavingSummary(false);

    if (result.success) {
      toaster.create({
        title: "Platform description saved successfully",
        type: "success",
      });
      setIsEditingSummary(false);
      return;
    }

    toaster.create({
      title: "Failed to save platform description",
      description: result.error,
      type: "error",
    });
  };

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
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Heading size="sm" color="blue.800">
                    Platform Description
                  </Heading>
                  {!isEditingSummary && (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={handleEnterSummaryEdit}
                      title="Edit platform description"
                    >
                      <Pencil size={16} />
                    </IconButton>
                  )}
                  {isEditingSummary && (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelSummaryEdit}
                      title="Cancel editing"
                    >
                      <X size={16} />
                    </IconButton>
                  )}
                </HStack>
                {isEditingSummary && (
                  <Button
                    size="sm"
                    colorPalette="green"
                    onClick={handleSaveSummary}
                    loading={savingSummary}
                  >
                    <Save size={14} />
                    Save
                  </Button>
                )}
              </HStack>
              {isEditingSummary ? (
                <Textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={5}
                  fontSize="sm"
                  placeholder="Describe what this platform does..."
                />
              ) : (
                <Text fontSize="sm" color="gray.700">
                  {analysis?.summary ||
                    "No platform summary available yet. Run codebase analysis to generate it."}
                </Text>
              )}
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
                            View Details
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
