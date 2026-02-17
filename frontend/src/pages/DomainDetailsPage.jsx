import { useEffect } from "react";
import { Container, VStack } from "@chakra-ui/react";
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
    saveFiles,
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

        <DomainFilesSection
          files={filesArray}
          onFilesChange={(files) => updateEditedFiles(domainId, files)}
          onSave={handleSaveFiles}
          onReset={() => resetEditedFiles(domainId)}
        />

        <DomainDocumentationSection
          documentation={detail?.documentation}
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
          testing={detail?.testing}
          loading={testingLoading}
          applyingTests={applyingTests}
          onAnalyze={() => domain && analyzeDomainTesting(domain)}
          onApplyTest={handleApplyTest}
        />
      </VStack>
    </Container>
  );
}
