import { useEffect } from "react";
import { Container, VStack, List } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { useDomainEditorStore } from "../store/useDomainEditorStore";
import { useTestingStore } from "../store/useTestingStore";
import { Alert } from "../components/ui/alert";
import DomainHeader from "../components/domain/DomainHeader";
import DomainFilesSection from "../components/domain/DomainFilesSection";
import DomainDocumentationSection from "../components/domain/DomainDocumentationSection";
import DomainRequirementsSection from "../components/domain/DomainRequirementsSection";
import DomainTestingSection from "../components/domain/DomainTestingSection";

export default function DomainDetailsPage() {
  const navigate = useNavigate();
  const { domainId } = useParams();

  // Analysis store
  const {
    analysis,
    fetchDomainDocumentation,
    fetchDomainRequirements,
    fetchDomainTesting,
    analyzeDomain,
    analyzeDomainDocumentation,
    analyzeDomainRequirements,
    analyzeDomainTesting,
    domainDocumentationById,
    domainRequirementsById,
    domainTestingById,
    domainAnalyzeLoadingById,
    domainDocumentationLoadingById,
    domainRequirementsLoadingById,
    domainTestingLoadingById,
    domainDocumentationErrorById,
    domainRequirementsErrorById,
    domainTestingErrorById,
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
    saveFiles,
    initializeEditorsForDomain,
  } = useDomainEditorStore();

  // Testing store
  const { applyingTestsByDomainId, applyTest } = useTestingStore();

  const domain = (analysis?.domains || []).find((item) => item.id === domainId);
  const analyzing = !!domainAnalyzeLoadingById.get(domainId);

  // Section-specific data
  const documentation = domainDocumentationById.get(domainId);
  const requirements = domainRequirementsById.get(domainId);
  const testing = domainTestingById.get(domainId);

  // Loading states for individual sections
  const documentationLoading = !!domainDocumentationLoadingById.get(domainId);
  const requirementsLoading = !!domainRequirementsLoadingById.get(domainId);
  const testingLoading = !!domainTestingLoadingById.get(domainId);

  // Error states for individual sections
  const documentationError = domainDocumentationErrorById.get(domainId);
  const requirementsError = domainRequirementsErrorById.get(domainId);
  const testingError = domainTestingErrorById.get(domainId);

  // Collect all errors into a single array
  const errors = [
    documentationError && { section: "Documentation", message: documentationError },
    requirementsError && { section: "Requirements", message: requirementsError },
    testingError && { section: "Testing", message: testingError },
  ].filter(Boolean);

  // Test application states
  const applyingTests = applyingTestsByDomainId[domainId] || {};

  useEffect(() => {
    if (domainId) {
      // Fetch all sections in parallel for better performance
      Promise.all([
        fetchDomainDocumentation(domainId),
        fetchDomainRequirements(domainId),
        fetchDomainTesting(domainId),
      ]).then(() => {
        initializeEditorsForDomain(domainId);
      });
    }
  }, [
    domainId,
    fetchDomainDocumentation,
    fetchDomainRequirements,
    fetchDomainTesting,
    initializeEditorsForDomain,
  ]);

  const requirementsText = editedRequirementsByDomainId[domainId] || "";

  // Use domain.files from codebase analysis as source of truth
  // Only use edited files if they exist and were actually modified by user
  const filesArray =
    editedFilesByDomainId[domainId] !== undefined
      ? editedFilesByDomainId[domainId]
      : domain?.files || [];

  const handleSaveRequirements = async () => {
    const result = await saveRequirements(domainId);
    if (result.success) {
      alert("Requirements saved successfully!");
    } else {
      alert(`Failed to save requirements: ${result.error}`);
    }
  };

  const handleSaveFiles = async () => {
    const result = await saveFiles(domainId);
    if (result.success) {
      alert("Files saved successfully!");
    } else {
      alert(`Failed to save files: ${result.error}`);
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
        <DomainHeader
          domain={domain}
          domainId={domainId}
          analyzing={analyzing}
          onBack={() => navigate("/")}
          onAnalyze={() => domain && analyzeDomain(domain)}
        />

        {/* Section-specific errors in a single alert */}
        {errors.length > 0 && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>
              {errors.length === 1
                ? "Analysis Error"
                : `${errors.length} Analysis Errors`}
            </Alert.Title>
            <Alert.Description>
              <List.Root>
                {errors.map((error, index) => (
                  <List.Item key={index}>
                    <strong>{error.section}:</strong> {error.message}
                  </List.Item>
                ))}
              </List.Root>
            </Alert.Description>
          </Alert.Root>
        )}

        <DomainFilesSection
          files={filesArray}
          onFilesChange={(files) => updateEditedFiles(domainId, files)}
          onSave={handleSaveFiles}
          onReset={() => resetEditedFiles(domainId)}
        />

        <DomainDocumentationSection
          documentation={documentation}
          loading={documentationLoading}
          onAnalyze={() => domain && analyzeDomainDocumentation(domain)}
        />

        <DomainRequirementsSection
          requirementsText={requirementsText}
          loading={requirementsLoading}
          onRequirementsChange={(value) =>
            updateEditedRequirements(domainId, value)
          }
          onAnalyze={() => domain && analyzeDomainRequirements(domain)}
          onSave={handleSaveRequirements}
          onReset={() => resetEditedRequirements(domainId)}
        />

        <DomainTestingSection
          testing={testing}
          loading={testingLoading}
          applyingTests={applyingTests}
          onAnalyze={() => domain && analyzeDomainTesting(domain)}
          onApplyTest={handleApplyTest}
        />
      </VStack>
    </Container>
  );
}
