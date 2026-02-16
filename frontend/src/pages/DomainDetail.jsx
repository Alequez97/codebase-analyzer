import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  Textarea,
  List,
  Separator,
  Grid,
  Table,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { useDomainEditorStore } from "../store/useDomainEditorStore";
import { useTestingStore } from "../store/useTestingStore";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Save } from "lucide-react";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

export default function DomainDetail() {
  const navigate = useNavigate();
  const { domainId } = useParams();

  // Analysis store
  const {
    analysis,
    fetchDomainAnalysis,
    analyzeDomain,
    analyzeDomainDocumentation,
    analyzeDomainRequirements,
    analyzeDomainTesting,
    domainAnalysisById,
    domainLoadingById,
    domainErrorById,
    domainAnalyzeLoadingById,
    domainDocumentationLoadingById,
    domainRequirementsLoadingById,
    domainTestingLoadingById,
  } = useAnalysisStore();

  // Domain editor store
  const {
    editedRequirementsByDomainId,
    updateEditedRequirements,
    resetEditedRequirements,
    editedFilesByDomainId,
    updateEditedFiles,
    resetEditedFiles,
    saveRequirements,
    initializeEditorsForDomain,
  } = useDomainEditorStore();

  // Testing store
  const { applyingTestsByDomainId, applyTest } = useTestingStore();

  const domain = (analysis?.domains || []).find((item) => item.id === domainId);
  const detail = domainAnalysisById[domainId];
  const loading = !!domainLoadingById[domainId];
  const analyzing = !!domainAnalyzeLoadingById[domainId];
  const error = domainErrorById[domainId];

  // Loading states for individual sections
  const documentationLoading = !!domainDocumentationLoadingById[domainId];
  const requirementsLoading = !!domainRequirementsLoadingById[domainId];
  const testingLoading = !!domainTestingLoadingById[domainId];

  // Test application states
  const applyingTests = applyingTestsByDomainId[domainId] || {};

  useEffect(() => {
    if (domainId) {
      fetchDomainAnalysis(domainId).then(() => {
        initializeEditorsForDomain(domainId);
      });
    }
  }, [domainId, fetchDomainAnalysis, initializeEditorsForDomain]);

  const requirementsText = editedRequirementsByDomainId[domainId] || "";
  const filesText =
    editedFilesByDomainId[domainId] || (domain?.files || []).join("\n");

  const existingTestFiles = useMemo(() => {
    const testing = detail?.testing;
    if (!testing?.existingTests) {
      return [];
    }
    return testing.existingTests;
  }, [detail?.testing]);

  const handleSaveRequirements = async () => {
    const result = await saveRequirements(domainId);
    if (result.success) {
      alert("Requirements saved successfully!");
    } else {
      alert(`Failed to save requirements: ${result.error}`);
    }
  };

  const handleApplyTest = async (testId) => {
    const result = await applyTest(domainId, testId);
    if (result.success) {
      alert(result.message || "Test applied successfully!");
    } else {
      alert(`Failed to apply test: ${result.error}`);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <HStack>
              <Heading size="lg">{domain?.name || domainId}</Heading>
              {domain?.priority && (
                <Badge colorPalette={getPriorityColor(domain.priority)}>
                  {domain.priority}
                </Badge>
              )}
            </HStack>
            <Text color="gray.600">
              {domain?.businessPurpose || "No domain summary available."}
            </Text>
          </VStack>
          <HStack>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back
            </Button>
            <Button
              colorPalette="blue"
              onClick={() => domain && analyzeDomain(domain)}
              loading={analyzing}
              loadingText="Analyzing"
            >
              Analyze domain
            </Button>
          </HStack>
        </HStack>

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>Domain analysis unavailable</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}

        {loading && (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Title>Loading domain analysis...</Alert.Title>
          </Alert.Root>
        )}

        <Card.Root>
          <Card.Header>
            <Heading size="md">Files</Heading>
          </Card.Header>
          <Card.Body>
            <Text mb={3} color="gray.600" fontSize="sm">
              These files define this domain. Edit to refine scope before
              running analysis.
            </Text>
            <HStack align="start" gap={2}>
              <Textarea
                minH="180px"
                flex="1"
                fontFamily="mono"
                fontSize="sm"
                value={filesText}
                onChange={(event) =>
                  updateEditedFiles(domainId, event.target.value)
                }
                placeholder="backend/services/domain/file.js\nfrontend/src/pages/DomainPage.jsx"
              />
              <VStack gap={2}>
                <IconButton
                  size="sm"
                  colorPalette="green"
                  title="Save files (updates domain scope)"
                >
                  <Save size={16} />
                </IconButton>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resetEditedFiles(domainId)}
                >
                  Reset
                </Button>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <Heading size="md">Documentation</Heading>
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={() => domain && analyzeDomainDocumentation(domain)}
                loading={documentationLoading}
                loadingText="Analyzing"
              >
                {detail?.documentation
                  ? "Re-analyze documentation"
                  : "Analyze documentation"}
              </Button>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Box
              color="gray.800"
              fontSize="sm"
              lineHeight="1.8"
              sx={{
                "& h1": { fontSize: "xl", fontWeight: "bold", mt: 4, mb: 2 },
                "& h2": { fontSize: "lg", fontWeight: "bold", mt: 3, mb: 2 },
                "& h3": {
                  fontSize: "md",
                  fontWeight: "semibold",
                  mt: 2,
                  mb: 1,
                },
                "& p": { mb: 2 },
                "& ul": { pl: 4, mb: 2 },
                "& li": { mb: 1 },
                "& code": {
                  bg: "gray.100",
                  px: 1,
                  py: 0.5,
                  borderRadius: "sm",
                  fontSize: "xs",
                  fontFamily: "mono",
                },
                "& pre": {
                  bg: "gray.50",
                  p: 3,
                  borderRadius: "md",
                  overflowX: "auto",
                  mb: 2,
                },
              }}
            >
              <ReactMarkdown>
                {detail?.documentation?.businessPurpose ||
                  "Click **Analyze documentation** to generate deep analysis. All files listed above will be analyzed to understand business purpose, responsibilities, and architecture."}
              </ReactMarkdown>
            </Box>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <Heading size="md">Requirements</Heading>
              <HStack>
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={() => domain && analyzeDomainRequirements(domain)}
                  loading={requirementsLoading}
                  loadingText="Analyzing"
                >
                  {detail?.requirements
                    ? "Re-analyze requirements"
                    : "Analyze requirements"}
                </Button>
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Text mb={3} color="gray.600" fontSize="sm">
              Edit business rules here. Click save icon to persist changes.
            </Text>
            <HStack align="start" gap={2}>
              <Textarea
                minH="220px"
                flex="1"
                value={requirementsText}
                onChange={(event) =>
                  updateEditedRequirements(domainId, event.target.value)
                }
                placeholder="1. [P0] Describe domain requirement"
              />
              <VStack gap={2}>
                <IconButton
                  size="sm"
                  colorPalette="green"
                  onClick={handleSaveRequirements}
                  title="Save requirements"
                >
                  <Save size={16} />
                </IconButton>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resetEditedRequirements(domainId)}
                >
                  Reset
                </Button>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <Heading size="md">Testing</Heading>
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={() => domain && analyzeDomainTesting(domain)}
                loading={testingLoading}
                loadingText="Analyzing"
              >
                {detail?.testing ? "Re-analyze tests" : "Analyze tests"}
              </Button>
            </HStack>
          </Card.Header>
          <Card.Body>
            {!detail?.testing && (
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Title>No test analysis yet</Alert.Title>
                <Alert.Description>
                  Click "Analyze tests" to get detailed coverage analysis and
                  test suggestions.
                </Alert.Description>
              </Alert.Root>
            )}

            {detail?.testing && (
              <VStack align="stretch" gap={6}>
                {/* Coverage Metrics */}
                <Box>
                  <Text fontWeight="semibold" mb={3} fontSize="md">
                    Current Coverage
                  </Text>
                  <Grid
                    templateColumns="repeat(auto-fit, minmax(120px, 1fr))"
                    gap={3}
                  >
                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      textAlign="center"
                    >
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Overall
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                        {detail.testing.currentCoverage?.overall || "0%"}
                      </Text>
                    </Box>
                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      textAlign="center"
                    >
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Statements
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                        {detail.testing.currentCoverage?.statements || "0%"}
                      </Text>
                    </Box>
                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      textAlign="center"
                    >
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Branches
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold" color="orange.600">
                        {detail.testing.currentCoverage?.branches || "0%"}
                      </Text>
                    </Box>
                    <Box
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                      textAlign="center"
                    >
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Functions
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold" color="green.600">
                        {detail.testing.currentCoverage?.functions || "0%"}
                      </Text>
                    </Box>
                  </Grid>
                </Box>

                <Separator />

                {/* Existing Tests */}
                <Box>
                  <Text fontWeight="semibold" mb={3} fontSize="md">
                    Existing Test Files
                  </Text>
                  {existingTestFiles.length > 0 ? (
                    <Table.Root size="sm" variant="outline">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>File</Table.ColumnHeader>
                          <Table.ColumnHeader>Tests</Table.ColumnHeader>
                          <Table.ColumnHeader>Pass Rate</Table.ColumnHeader>
                          <Table.ColumnHeader>Last Run</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {existingTestFiles.map((test) => (
                          <Table.Row key={test.file}>
                            <Table.Cell>
                              <Text fontSize="sm" fontFamily="mono">
                                {test.file}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge colorPalette="blue">
                                {test.testsCount || 0} tests
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <HStack>
                                {test.passRate === "100%" ? (
                                  <Icon color="green.600">
                                    <CheckCircle size={16} />
                                  </Icon>
                                ) : (
                                  <Icon color="orange.600">
                                    <AlertCircle size={16} />
                                  </Icon>
                                )}
                                <Text fontSize="sm">
                                  {test.passRate || "N/A"}
                                </Text>
                              </HStack>
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontSize="xs" color="gray.600">
                                {test.lastRun
                                  ? new Date(test.lastRun).toLocaleDateString()
                                  : "Never"}
                              </Text>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  ) : (
                    <Alert.Root status="warning">
                      <Alert.Indicator />
                      <Alert.Description>
                        No existing test files identified for this domain.
                      </Alert.Description>
                    </Alert.Root>
                  )}
                </Box>

                <Separator />

                {/* Missing Tests */}
                <Box>
                  <Text fontWeight="semibold" mb={4} fontSize="md">
                    Missing Tests (Suggestions)
                  </Text>
                  {detail.testing.missingTests &&
                  (detail.testing.missingTests.unit?.length > 0 ||
                    detail.testing.missingTests.integration?.length > 0 ||
                    detail.testing.missingTests.e2e?.length > 0) ? (
                    <VStack align="stretch" gap={3}>
                      {/* Summary Cards */}
                      <Grid
                        templateColumns="repeat(auto-fit, minmax(150px, 1fr))"
                        gap={3}
                      >
                        {detail.testing.missingTests.unit?.length > 0 && (
                          <Box
                            borderWidth="1px"
                            borderRadius="md"
                            p={3}
                            bg="purple.50"
                            borderColor="purple.200"
                          >
                            <HStack justify="space-between">
                              <Text fontSize="xs" fontWeight="medium">
                                Unit Tests
                              </Text>
                              <Badge colorPalette="purple" size="sm">
                                {detail.testing.missingTests.unit.length}
                              </Badge>
                            </HStack>
                          </Box>
                        )}
                        {detail.testing.missingTests.integration?.length >
                          0 && (
                          <Box
                            borderWidth="1px"
                            borderRadius="md"
                            p={3}
                            bg="blue.50"
                            borderColor="blue.200"
                          >
                            <HStack justify="space-between">
                              <Text fontSize="xs" fontWeight="medium">
                                Integration Tests
                              </Text>
                              <Badge colorPalette="blue" size="sm">
                                {detail.testing.missingTests.integration.length}
                              </Badge>
                            </HStack>
                          </Box>
                        )}
                        {detail.testing.missingTests.e2e?.length > 0 && (
                          <Box
                            borderWidth="1px"
                            borderRadius="md"
                            p={3}
                            bg="green.50"
                            borderColor="green.200"
                          >
                            <HStack justify="space-between">
                              <Text fontSize="xs" fontWeight="medium">
                                E2E Tests
                              </Text>
                              <Badge colorPalette="green" size="sm">
                                {detail.testing.missingTests.e2e.length}
                              </Badge>
                            </HStack>
                          </Box>
                        )}
                      </Grid>

                      {/* Table */}
                      <Box
                        borderWidth="1px"
                        borderRadius="lg"
                        overflow="hidden"
                        bg="white"
                      >
                        <Table.Root size="sm" variant="outline" striped>
                          <Table.Header>
                            <Table.Row bg="gray.50">
                              <Table.ColumnHeader width="80px">
                                ID
                              </Table.ColumnHeader>
                              <Table.ColumnHeader width="100px">
                                Type
                              </Table.ColumnHeader>
                              <Table.ColumnHeader width="80px">
                                Priority
                              </Table.ColumnHeader>
                              <Table.ColumnHeader width="90px">
                                Effort
                              </Table.ColumnHeader>
                              <Table.ColumnHeader>
                                Description
                              </Table.ColumnHeader>
                              <Table.ColumnHeader>
                                Suggested File
                              </Table.ColumnHeader>
                              <Table.ColumnHeader
                                width="90px"
                                textAlign="center"
                              >
                                Action
                              </Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {/* Unit Tests */}
                            {detail.testing.missingTests.unit?.map((test) => (
                              <Table.Row
                                key={test.id}
                                bg={
                                  test.priority === "P0"
                                    ? "red.50"
                                    : test.priority === "P1"
                                      ? "orange.50"
                                      : undefined
                                }
                                _hover={{ bg: "gray.100" }}
                              >
                                <Table.Cell>
                                  <Text
                                    fontSize="xs"
                                    fontFamily="mono"
                                    fontWeight="medium"
                                  >
                                    {test.id}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge colorPalette="purple" size="sm">
                                    Unit
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge
                                    colorPalette={getPriorityColor(
                                      test.priority,
                                    )}
                                    size="sm"
                                  >
                                    {test.priority}
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="xs" color="gray.600">
                                    {test.estimatedEffort || "Unknown"}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{test.description}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text
                                    fontSize="xs"
                                    fontFamily="mono"
                                    color="gray.700"
                                    wordBreak="break-all"
                                  >
                                    {test.suggestedTestFile}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell textAlign="center">
                                  <Button
                                    size="xs"
                                    colorPalette="green"
                                    onClick={() => handleApplyTest(test.id)}
                                    loading={!!applyingTests[test.id]}
                                    loadingText="Applying"
                                  >
                                    Apply
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}

                            {/* Integration Tests */}
                            {detail.testing.missingTests.integration?.map(
                              (test) => (
                                <Table.Row
                                  key={test.id}
                                  bg={
                                    test.priority === "P0"
                                      ? "red.50"
                                      : test.priority === "P1"
                                        ? "orange.50"
                                        : undefined
                                  }
                                  _hover={{ bg: "gray.100" }}
                                >
                                  <Table.Cell>
                                    <Text
                                      fontSize="xs"
                                      fontFamily="mono"
                                      fontWeight="medium"
                                    >
                                      {test.id}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Badge colorPalette="blue" size="sm">
                                      Integration
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Badge
                                      colorPalette={getPriorityColor(
                                        test.priority,
                                      )}
                                      size="sm"
                                    >
                                      {test.priority}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Text fontSize="xs" color="gray.600">
                                      {test.estimatedEffort || "Unknown"}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Text fontSize="sm">
                                      {test.description}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Text
                                      fontSize="xs"
                                      fontFamily="mono"
                                      color="gray.700"
                                      wordBreak="break-all"
                                    >
                                      {test.suggestedTestFile}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell textAlign="center">
                                    <Button
                                      size="xs"
                                      colorPalette="green"
                                      onClick={() => handleApplyTest(test.id)}
                                      loading={!!applyingTests[test.id]}
                                      loadingText="Applying"
                                    >
                                      Apply
                                    </Button>
                                  </Table.Cell>
                                </Table.Row>
                              ),
                            )}

                            {/* E2E Tests */}
                            {detail.testing.missingTests.e2e?.map((test) => (
                              <Table.Row
                                key={test.id}
                                bg={
                                  test.priority === "P0"
                                    ? "red.50"
                                    : test.priority === "P1"
                                      ? "orange.50"
                                      : undefined
                                }
                                _hover={{ bg: "gray.100" }}
                              >
                                <Table.Cell>
                                  <Text
                                    fontSize="xs"
                                    fontFamily="mono"
                                    fontWeight="medium"
                                  >
                                    {test.id}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge colorPalette="green" size="sm">
                                    E2E
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge
                                    colorPalette={getPriorityColor(
                                      test.priority,
                                    )}
                                    size="sm"
                                  >
                                    {test.priority}
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="xs" color="gray.600">
                                    {test.estimatedEffort || "Unknown"}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text fontSize="sm">{test.description}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text
                                    fontSize="xs"
                                    fontFamily="mono"
                                    color="gray.700"
                                    wordBreak="break-all"
                                  >
                                    {test.suggestedTestFile}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell textAlign="center">
                                  <Button
                                    size="xs"
                                    colorPalette="green"
                                    onClick={() => handleApplyTest(test.id)}
                                    loading={!!applyingTests[test.id]}
                                    loadingText="Applying"
                                  >
                                    Apply
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </VStack>
                  ) : (
                    <Alert.Root status="success">
                      <Alert.Indicator />
                      <Alert.Description>
                        All critical tests are in place! 🎉
                      </Alert.Description>
                    </Alert.Root>
                  )}
                </Box>

                <Separator />

                {/* Recommendations */}
                <Box>
                  <Text fontWeight="semibold" mb={3} fontSize="md">
                    General Recommendations
                  </Text>
                  {detail.testing.recommendations &&
                  detail.testing.recommendations.length > 0 ? (
                    <List.Root gap={2}>
                      {detail.testing.recommendations.map((rec, index) => (
                        <List.Item key={index}>
                          <Text fontSize="sm">{rec}</Text>
                        </List.Item>
                      ))}
                    </List.Root>
                  ) : (
                    <Text color="gray.500" fontSize="sm">
                      No additional recommendations at this time.
                    </Text>
                  )}
                </Box>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
}
