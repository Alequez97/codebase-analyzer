import { useEffect } from "react";
import { Container, VStack, List } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { toaster } from "../components/ui/toaster";
import { TASK_TYPES } from "../constants/task-types";
import { SECTION_TYPES } from "../constants/section-types";
import { useCodebaseStore } from "../store/useCodebaseStore";
import { useDomainDocumentationStore } from "../store/useDomainDocumentationStore";
import { useDomainRequirementsStore } from "../store/useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "../store/useDomainBugsSecurityStore";
import { useDomainTestingStore } from "../store/useDomainTestingStore";
import { useTaskProgressStore } from "../store/useTaskProgressStore";
import { useDomainEditorStore } from "../store/useDomainEditorStore";
import { useTestingStore } from "../store/useTestingStore";
import { useLogsStore } from "../store/useLogsStore";
import { Alert } from "../components/ui/alert";
import DomainHeader from "../components/domain/DomainHeader";
import DomainFilesSection from "../components/domain/DomainFilesSection";
import DomainDocumentationSection from "../components/domain/DomainDocumentationSection";
import DomainRequirementsSection from "../components/domain/DomainRequirementsSection";
import DomainBugsSecuritySection from "../components/domain/DomainBugsSecuritySection";
import DomainTestingSection from "../components/domain/DomainTestingSection";

export default function DomainDetailsPage() {
  const navigate = useNavigate();
  const { domainId } = useParams();

  // Codebase store (for analysis and domain list)
  const { analysis, fetchAnalysis } = useCodebaseStore();

  // Domain section stores
  const docStore = useDomainDocumentationStore();
  const reqStore = useDomainRequirementsStore();
  const bugsStore = useDomainBugsSecurityStore();
  const testStore = useDomainTestingStore();

  // Task progress store
  const { progressById } = useTaskProgressStore();

  // Domain editor store
  const {
    editedRequirementsByDomainId,
    updateEditedRequirementsStructured,
    updateEditedRequirements,
    resetEditedRequirements,
    editedFilesByDomainId,
    updateEditedFiles,
    resetEditedFiles,
    editedDocumentationByDomainId,
    updateEditedDocumentation,
    resetEditedDocumentation,
    saveRequirements,
    saveFiles,
    saveDocumentation,
    initializeEditorsForDomain,
  } = useDomainEditorStore();

  // Testing store
  const { applyingTestsByDomainId, applyTest } = useTestingStore();

  // Logs store
  const {
    showDomainLogs,
    fetchDomainSectionLogs,
    domainLogsBySection,
    logsLoadingBySection,
  } = useLogsStore();

  const domain = (analysis?.domains || []).find((item) => item.id === domainId);

  // Section-specific data
  const documentation = docStore.dataById.get(domainId);
  const requirements = reqStore.dataById.get(domainId);
  const bugsSecurity = bugsStore.dataById.get(domainId);
  const testing = testStore.dataById.get(domainId);

  // Loading states for individual sections
  const documentationLoading = !!docStore.loadingById.get(domainId);
  const requirementsLoading = !!reqStore.loadingById.get(domainId);
  const bugsSecurityLoading = !!bugsStore.loadingById.get(domainId);
  const testingLoading = !!testStore.loadingById.get(domainId);

  // Error states for individual sections
  const documentationError = docStore.errorById.get(domainId);
  const requirementsError = reqStore.errorById.get(domainId);
  const bugsSecurityError = bugsStore.errorById.get(domainId);
  const testingError = testStore.errorById.get(domainId);

  // Task progress - filter by section type
  const taskProgress = progressById.get(domainId);
  const documentationProgress =
    taskProgress?.type === TASK_TYPES.DOCUMENTATION ? taskProgress : null;
  const requirementsProgress =
    taskProgress?.type === TASK_TYPES.REQUIREMENTS ? taskProgress : null;
  const bugsSecurityProgress =
    taskProgress?.type === TASK_TYPES.BUGS_SECURITY ? taskProgress : null;
  const testingProgress =
    taskProgress?.type === TASK_TYPES.TESTING ? taskProgress : null;

  // Logs data for each section
  const domainLogs = domainLogsBySection.get(domainId) || new Map();
  const documentationLogs = domainLogs.get(SECTION_TYPES.DOCUMENTATION) || "";
  const requirementsLogs = domainLogs.get(SECTION_TYPES.REQUIREMENTS) || "";
  const bugsSecurityLogs = domainLogs.get(SECTION_TYPES.BUGS_SECURITY) || "";
  const testingLogs = domainLogs.get(SECTION_TYPES.TESTING) || "";

  // Logs loading states
  const logsLoading = logsLoadingBySection.get(domainId) || new Map();
  const documentationLogsLoading = !!logsLoading.get(
    SECTION_TYPES.DOCUMENTATION,
  );
  const requirementsLogsLoading = !!logsLoading.get(SECTION_TYPES.REQUIREMENTS);
  const bugsSecurityLogsLoading = !!logsLoading.get(
    SECTION_TYPES.BUGS_SECURITY,
  );
  const testingLogsLoading = !!logsLoading.get(SECTION_TYPES.TESTING);

  // Collect all errors into a single array
  const errors = [
    documentationError && {
      section: "Documentation",
      message: documentationError,
    },
    requirementsError && {
      section: "Requirements",
      message: requirementsError,
    },
    bugsSecurityError && {
      section: "Bugs & Security",
      message: bugsSecurityError,
    },
    testingError && { section: "Testing", message: testingError },
  ].filter(Boolean);

  // Test application states
  const applyingTests = applyingTestsByDomainId[domainId] || {};

  // Fetch codebase analysis first (to ensure we have domain list when opening in new tab)
  useEffect(() => {
    fetchAnalysis();
  }, []);

  useEffect(() => {
    if (!domainId) return;

    // Only fetch if data doesn't exist in cache (fetch functions handle caching internally)
    // Call fetch functions - they will return cached data immediately if available
    const fetchPromises = [];

    // Only fetch documentation if not already loaded or loading
    if (!documentation && !documentationLoading) {
      fetchPromises.push(docStore.fetch(domainId));
    }

    // Only fetch requirements if not already loaded or loading
    if (!requirements && !requirementsLoading) {
      fetchPromises.push(reqStore.fetch(domainId));
    }

    // Only fetch bugs & security if not already loaded or loading
    if (!bugsSecurity && !bugsSecurityLoading) {
      fetchPromises.push(bugsStore.fetch(domainId));
    }

    // Only fetch testing if not already loaded or loading
    if (!testing && !testingLoading) {
      fetchPromises.push(testStore.fetch(domainId));
    }

    // If there are any fetch operations, initialize editors after they complete
    if (fetchPromises.length > 0) {
      Promise.all(fetchPromises).then(() => {
        initializeEditorsForDomain(domainId);
      });
    } else {
      // Data already exists, just initialize editors
      initializeEditorsForDomain(domainId);
    }
  }, [domainId]); // Only depend on domainId to avoid unnecessary re-fetches

  // Fetch logs lazily when user opens logs view
  useEffect(() => {
    if (!domainId || !showDomainLogs) return;

    // Fetch documentation logs if section exists
    if (documentation) {
      fetchDomainSectionLogs(domainId, SECTION_TYPES.DOCUMENTATION);
    }

    // Fetch requirements logs if section exists
    if (requirements) {
      fetchDomainSectionLogs(domainId, SECTION_TYPES.REQUIREMENTS);
    }

    // Fetch bugs & security logs if section exists
    if (bugsSecurity) {
      fetchDomainSectionLogs(domainId, SECTION_TYPES.BUGS_SECURITY);
    }

    // Fetch testing logs if section exists
    if (testing) {
      fetchDomainSectionLogs(domainId, SECTION_TYPES.TESTING);
    }
  }, [
    domainId,
    showDomainLogs,
    documentation,
    requirements,
    bugsSecurity,
    testing,
  ]);

  const requirementsText = editedRequirementsByDomainId[domainId] || "";
  const documentationText = editedDocumentationByDomainId[domainId];

  // Use domain.files from codebase analysis as source of truth
  // Only use edited files if they exist and were actually modified by user
  const filesArray =
    editedFilesByDomainId[domainId] !== undefined
      ? editedFilesByDomainId[domainId]
      : domain?.files || [];

  const handleSaveRequirements = async () => {
    const result = await saveRequirements(domainId);
    if (result.success) {
      toaster.create({
        title: "Requirements saved successfully",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to save requirements",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleSaveFiles = async () => {
    const result = await saveFiles(domainId);
    if (result.success) {
      toaster.create({
        title: "Files saved successfully",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to save files",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleSaveDocumentation = async () => {
    const result = await saveDocumentation(domainId);
    if (result.success) {
      toaster.create({
        title: "Documentation saved successfully",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to save documentation",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleApplyTest = async (testId) => {
    const result = await applyTest(domainId, testId);
    if (result.success) {
      toaster.create({
        title: result.message || "Test applied successfully",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to apply test",
        description: result.error,
        type: "error",
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        <DomainHeader
          domain={domain}
          domainId={domainId}
          analyzing={false}
          onBack={() => navigate("/")}
        />

        {/* Section-specific errors in a single alert */}
        {domain && errors.length > 0 && (
          <Alert.Root status="error" alignItems="flex-start">
            <Alert.Indicator mt={1} />
            <VStack align="stretch" gap={1}>
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
            </VStack>
          </Alert.Root>
        )}

        <DomainFilesSection
          files={filesArray}
          loading={!domain}
          onFilesChange={(files) => updateEditedFiles(domainId, files)}
          onSave={handleSaveFiles}
          onReset={() => resetEditedFiles(domainId)}
        />

        <DomainDocumentationSection
          documentation={documentation}
          loading={documentationLoading}
          progress={documentationProgress}
          onAnalyze={() => domain && docStore.analyze(domain)}
          editedDocumentation={documentationText}
          onDocumentationChange={(value) =>
            updateEditedDocumentation(domainId, value)
          }
          onSave={handleSaveDocumentation}
          onReset={() => resetEditedDocumentation(domainId)}
          showLogs={showDomainLogs}
          logs={documentationLogs}
          logsLoading={documentationLogsLoading}
        />

        <DomainRequirementsSection
          requirements={requirements}
          requirementsText={requirementsText}
          loading={requirementsLoading}
          progress={requirementsProgress}
          hasDocumentation={!!documentation}
          onRequirementsChange={(value) =>
            updateEditedRequirements(domainId, value)
          }
          onRequirementsStructuredChange={(value) =>
            updateEditedRequirementsStructured(domainId, value)
          }
          onAnalyze={(userContext, includeDocumentation) =>
            domain &&
            reqStore.analyze(domain, userContext, includeDocumentation)
          }
          onSave={handleSaveRequirements}
          onReset={() => resetEditedRequirements(domainId)}
          showLogs={showDomainLogs}
          logs={requirementsLogs}
          logsLoading={requirementsLogsLoading}
        />

        <DomainBugsSecuritySection
          domainId={domainId}
          bugsSecurity={bugsSecurity}
          loading={bugsSecurityLoading}
          progress={bugsSecurityProgress}
          hasRequirements={!!requirements}
          onAnalyze={(includeRequirements) =>
            domain && bugsStore.analyze(domain, includeRequirements)
          }
          onRefresh={() => bugsStore.fetch(domainId)}
          showLogs={showDomainLogs}
          logs={bugsSecurityLogs}
          logsLoading={bugsSecurityLogsLoading}
        />

        <DomainTestingSection
          domainId={domainId}
          testing={testing}
          loading={testingLoading}
          progress={testingProgress}
          applyingTests={applyingTests}
          onAnalyze={() => domain && testStore.analyze(domain)}
          onApplyTest={handleApplyTest}
          showLogs={showDomainLogs}
          logs={testingLogs}
          logsLoading={testingLogsLoading}
        />
      </VStack>
    </Container>
  );
}
