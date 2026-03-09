import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  Bug,
  Pencil,
  Save,
  ScanSearch,
  Shield,
  TestTube,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toaster } from "../ui/toaster";
import { useCodebaseStore } from "../../store/useCodebaseStore";
import { useLogsStore } from "../../store/useLogsStore";

export function ModulesSection() {
  const navigate = useNavigate();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const { toggleDashboardLogs } = useLogsStore();
  const {
    analysis,
    analyzingCodebase,
    analyzeCodebase,
    cancelCodebaseAnalysis,
    saveCodebaseSummary,
  } = useCodebaseStore();

  const handleCancelReanalysis = async () => {
    const result = await cancelCodebaseAnalysis();
    if (!result.success) {
      toaster.create({
        title: "Failed to cancel analysis",
        description: result.error,
        type: "error",
      });
    }
  };

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
    <>
      {!analyzingCodebase && domains.length === 0 && (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="calc(100vh - 52px)"
          overflow="hidden"
          bg="white"
        >
          <VStack gap={6} px={4} textAlign="center">
            {/* Icon */}
            <Box
              p={3}
              bg="blue.50"
              borderRadius="full"
              color="blue.500"
              display="inline-flex"
            >
              <ScanSearch size={36} strokeWidth={1.5} />
            </Box>

            {/* Headline */}
            <VStack gap={2}>
              <Heading size="xl" color="gray.800" fontWeight="bold">
                AI-Powered Code Analysis
              </Heading>
              <Text
                fontSize="md"
                color="gray.500"
                maxW="520px"
                lineHeight="tall"
              >
                Let AI automatically audit your codebase — discovering
                functional domains, surfacing bugs, flagging security
                vulnerabilities, and identifying missing test coverage.
              </Text>
            </VStack>

            {/* Feature cards */}
            <SimpleGrid columns={3} gap={4} w="full" maxW="640px">
              <VStack
                gap={2}
                p={3}
                bg="red.50"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="red.100"
              >
                <Box color="red.500">
                  <Bug size={22} strokeWidth={1.5} />
                </Box>
                <Text fontWeight="semibold" color="gray.700" fontSize="sm">
                  Bug Detection
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Logic errors, race conditions & edge cases
                </Text>
              </VStack>

              <VStack
                gap={2}
                p={3}
                bg="orange.50"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="orange.100"
              >
                <Box color="orange.500">
                  <Shield size={22} strokeWidth={1.5} />
                </Box>
                <Text fontWeight="semibold" color="gray.700" fontSize="sm">
                  Security Scan
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Injections, XSS, auth flaws & data exposure
                </Text>
              </VStack>

              <VStack
                gap={2}
                p={3}
                bg="green.50"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="green.100"
              >
                <Box color="green.500">
                  <TestTube size={22} strokeWidth={1.5} />
                </Box>
                <Text fontWeight="semibold" color="gray.700" fontSize="sm">
                  Test Coverage
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Missing tests, gaps & actionable suggestions
                </Text>
              </VStack>
            </SimpleGrid>

            {/* CTA button */}
            <Button
              size="lg"
              colorPalette="blue"
              px={8}
              fontWeight="semibold"
              borderRadius="xl"
              onClick={analyzeCodebase}
              shadow="md"
              _hover={{ shadow: "lg", transform: "translateY(-1px)" }}
              transition="all 0.15s ease"
            >
              <ScanSearch size={18} />
              Analyze Codebase
            </Button>

            <Text fontSize="xs" color="gray.400">
              Runs in the background — results appear automatically when
              complete. Want to follow along?{" "}
              <Text
                as="span"
                color="blue.400"
                cursor="pointer"
                textDecoration="underline"
                _hover={{ color: "blue.500" }}
                onClick={toggleDashboardLogs}
              >
                Open Logs
              </Text>
              .
            </Text>
          </VStack>
        </Box>
      )}

      {domains.length > 0 && (
        <Box p={6}>
          <VStack align="stretch" gap={4}>
            {analyzingCodebase ? (
              <HStack
                px={4}
                py={3}
                bg="blue.50"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="blue.100"
                gap={3}
              >
                <Spinner size="xs" color="blue.500" />
                <Text fontSize="sm" color="blue.700" flex="1">
                  Re-analyzing codebase in the background…
                </Text>
                <Button
                  variant="ghost"
                  size="xs"
                  colorPalette="blue"
                  onClick={toggleDashboardLogs}
                >
                  View Logs
                </Button>
                <IconButton
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={handleCancelReanalysis}
                  aria-label="Cancel re-analysis"
                >
                  <X size={12} />
                </IconButton>
              </HStack>
            ) : (
              <HStack justify="flex-end">
                <Button
                  colorPalette="blue"
                  variant="outline"
                  size="sm"
                  onClick={analyzeCodebase}
                >
                  Re-analyze Codebase
                </Button>
              </HStack>
            )}
            <Box p={4} bg="blue.50" borderRadius="md" mt={2}>
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
                            View details
                          </Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </VStack>
        </Box>
      )}
    </>
  );
}
