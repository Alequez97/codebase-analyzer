import { useEffect } from "react";
import { Container, Grid, GridItem, List, VStack } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import DomainBugsSecuritySection from "../components/domain/DomainBugsSecuritySection";
import DomainDiagramsSection from "../components/domain/DomainDiagramsSection";
import DomainDocumentationSection from "../components/domain/DomainDocumentationSection";
import DomainFilesSection from "../components/domain/DomainFilesSection";
import DomainHeader from "../components/domain/DomainHeader";
import DomainRequirementsSection from "../components/domain/DomainRequirementsSection";
import DomainRefactoringAndTestingSection from "../components/domain/DomainRefactoringAndTestingSection";
import { Alert } from "../components/ui/alert";
import { toaster } from "../components/ui/toaster";
import { TASK_TYPES } from "../constants/task-types";
import { SECTION_TYPES } from "../constants/section-types";
import { useCodebaseStore } from "../store/useCodebaseStore";
import { useDomainDocumentationStore } from "../store/useDomainDocumentationStore";
import { useDomainDiagramsStore } from "../store/useDomainDiagramsStore";
import { useDomainRequirementsStore } from "../store/useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "../store/useDomainBugsSecurityStore";
import { useDomainRefactoringAndTestingStore } from "../store/useDomainRefactoringAndTestingStore";
import {
  useTaskProgressStore,
  selectDomainProgress,
} from "../store/useTaskProgressStore";
import { useDomainEditorStore } from "../store/useDomainEditorStore";
import { useRefactoringAndTestingStore } from "../store/useRefactoringAndTestingStore";
import { useLogsStore } from "../store/useLogsStore";
import { useAgentChatStore } from "../store/useAgentChatStore";

export default function DomainDetailsPage() {
  const { domainId } = useParams();

  // Agent chat store (pending suggestions for diff view)
  const pendingSuggestionByKey = useAgentChatStore(
    (s) => s.pendingSuggestionByKey,
  );
  const clearPendingSuggestion = useAgentChatStore(
    (s) => s.clearPendingSuggestion,
  );
  const getPendingSuggestion = (dId, sType) =>
    pendingSuggestionByKey.get(`${dId}_${sType}`) || null;

  // Codebase store (for analysis and domain list)
  const { analysis } = useCodebaseStore();

  // Domain section stores
  const docStore = useDomainDocumentationStore();
  const diagramsStore = useDomainDiagramsStore();
  const reqStore = useDomainRequirementsStore();
  const bugsStore = useDomainBugsSecurityStore();
  const testStore = useDomainRefactoringAndTestingStore();

  // Task progress store
  const { progressByTaskId } = useTaskProgressStore();

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
  const {
    implementingTestsByDomainId,
    implementLogsByDomainId,
    implementTest,
    implementTestEdits,
    applyingRefactoringByDomainId,
    completedRefactoringByDomainId,
    applyRefactoring,
    markRefactoringCompleted,
    applyRefactoringProgressByDomainId,
  } = useRefactoringAndTestingStore();

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
  const diagrams = diagramsStore.dataById.get(domainId);
  const requirements = reqStore.dataById.get(domainId);
  const bugsSecurity = bugsStore.dataById.get(domainId);
  const testing = testStore.dataById.get(domainId);

  // Loading states for individual sections
  const documentationLoading = !!docStore.loadingById.get(domainId);
  const diagramsLoading = !!diagramsStore.loadingById.get(domainId);
  const requirementsLoading = !!reqStore.loadingById.get(domainId);
  const bugsSecurityLoading = !!bugsStore.loadingById.get(domainId);
  const testingLoading = !!testStore.loadingById.get(domainId);

  // Error states for individual sections
  const documentationError = docStore.errorById.get(domainId);
  const diagramsError = diagramsStore.errorById.get(domainId);
  const requirementsError = reqStore.errorById.get(domainId);
  const bugsSecurityError = bugsStore.errorById.get(domainId);
  const testingError = testStore.errorById.get(domainId);

  // Task progress - derived per section from the flat progressByTaskId map.
  const domainProgressMap = selectDomainProgress(progressByTaskId, domainId);
  const documentationProgress =
    domainProgressMap.get(TASK_TYPES.DOCUMENTATION) ?? null;
  const diagramsProgress = domainProgressMap.get(TASK_TYPES.DIAGRAMS) ?? null;
  const requirementsProgress =
    domainProgressMap.get(TASK_TYPES.REQUIREMENTS) ?? null;
  const bugsSecurityProgress =
    domainProgressMap.get(TASK_TYPES.BUGS_SECURITY) ?? null;
  const testingProgress =
    domainProgressMap.get(TASK_TYPES.REFACTORING_AND_TESTING) ?? null;

  // Logs data for each section
  const domainLogs = domainLogsBySection.get(domainId) || new Map();
  const documentationLogs = domainLogs.get(SECTION_TYPES.DOCUMENTATION) || "";
  const diagramsLogs = domainLogs.get(SECTION_TYPES.DIAGRAMS) || "";
  const requirementsLogs = domainLogs.get(SECTION_TYPES.REQUIREMENTS) || "";
  const bugsSecurityLogs = domainLogs.get(SECTION_TYPES.BUGS_SECURITY) || "";
  const testingLogs =
    domainLogs.get(SECTION_TYPES.REFACTORING_AND_TESTING) || "";

  // Logs loading states
  const logsLoading = logsLoadingBySection.get(domainId) || new Map();
  const documentationLogsLoading = !!logsLoading.get(
    SECTION_TYPES.DOCUMENTATION,
  );
  const diagramsLogsLoading = !!logsLoading.get(SECTION_TYPES.DIAGRAMS);
  const requirementsLogsLoading = !!logsLoading.get(SECTION_TYPES.REQUIREMENTS);
  const bugsSecurityLogsLoading = !!logsLoading.get(
    SECTION_TYPES.BUGS_SECURITY,
  );
  const testingLogsLoading = !!logsLoading.get(
    SECTION_TYPES.REFACTORING_AND_TESTING,
  );

  // Collect all errors into a single array
  const errors = [
    documentationError && {
      section: "Documentation",
      message: documentationError,
    },
    diagramsError && {
      section: "Diagrams",
      message: diagramsError,
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
  const implementingTests = implementingTestsByDomainId[domainId] || {};
  const implementLogs = implementLogsByDomainId[domainId] || {};
  const applyingRefactoringId =
    applyingRefactoringByDomainId?.[domainId] || null;
  const applyRefactoringProgress =
    applyRefactoringProgressByDomainId?.get(domainId) || null;
  const completedRefactoringId =
    completedRefactoringByDomainId?.[domainId] || null;

  useEffect(() => {
    if (!domainId) return;

    // Only fetch if data doesn't exist in cache (fetch functions handle caching internally)
    // Call fetch functions - they will return cached data immediately if available
    const fetchPromises = [];

    // Only fetch documentation if not already loaded or loading
    if (!documentation && !documentationLoading) {
      fetchPromises.push(docStore.fetch(domainId));
    }

    // Only fetch diagrams if not already loaded or loading
    if (!diagrams && !diagramsLoading) {
      fetchPromises.push(diagramsStore.fetch(domainId));
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

    // Fetch diagrams logs if section exists
    if (diagrams) {
      fetchDomainSectionLogs(domainId, SECTION_TYPES.DIAGRAMS);
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
      fetchDomainSectionLogs(domainId, SECTION_TYPES.REFACTORING_AND_TESTING);
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

  const handleImplementTest = async (testId) => {
    const result = await implementTest(domainId, testId);
    if (result.success) {
      toaster.create({
        title: result.message || "Test implementation started",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to implement test",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleImplementTestEdits = async (testId) => {
    const result = await implementTestEdits(domainId, testId);

    if (result.success) {
      toaster.create({
        title: result.message || "Test edits implementation started",
        type: "success",
      });
      return;
    }

    toaster.create({
      title: "Failed to implement test edits",
      description: result.error,
      type: "error",
    });
  };

  const handleApplyRefactoring = async (refactoringId) => {
    const result = await applyRefactoring(domainId, refactoringId);
    if (result.success) {
      toaster.create({
        title: result.message || "Refactoring task created",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to apply refactoring",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleMarkRefactoringCompleted = async (refactoringId) => {
    const result = await markRefactoringCompleted(domainId, refactoringId);
    if (result.success) {
      toaster.create({
        title: "Refactoring marked as completed",
        type: "success",
      });
    } else {
      toaster.create({
        title: "Failed to mark refactoring as completed",
        description: result.error,
        type: "error",
      });
    }
  };

  return (
    <Container maxW="100%" py={8} px={4}>
      <Grid templateColumns="1fr" gap={6} alignItems="start">
        {/* Main Content Column */}
        <GridItem overflowX="hidden">
          <VStack align="stretch" gap={6}>
            <DomainHeader
              domain={domain}
              domainId={domainId}
              analyzing={false}
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
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.DOCUMENTATION,
              )}
              onApplyChanges={(newContent) => {
                updateEditedDocumentation(domainId, newContent);
                clearPendingSuggestion(domainId, SECTION_TYPES.DOCUMENTATION);
              }}
              onDismissChanges={() =>
                clearPendingSuggestion(domainId, SECTION_TYPES.DOCUMENTATION)
              }
            />

            <DomainDiagramsSection
              diagrams={diagrams}
              loading={diagramsLoading}
              progress={diagramsProgress}
              onAnalyze={() => domain && diagramsStore.analyze(domain, true)}
              domainId={domainId}
              showLogs={showDomainLogs}
              logs={diagramsLogs}
              logsLoading={diagramsLogsLoading}
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

            <DomainRefactoringAndTestingSection
              domainId={domainId}
              testing={testing}
              loading={testingLoading}
              progress={testingProgress}
              implementingTests={implementingTests}
              implementLogs={implementLogs}
              hasRequirements={!!requirements}
              onAnalyze={(includeRequirements) =>
                domain && testStore.analyze(domain, includeRequirements)
              }
              onImplementTest={handleImplementTest}
              onImplementTestEdits={handleImplementTestEdits}
              onApplyRefactoring={handleApplyRefactoring}
              onMarkCompleted={handleMarkRefactoringCompleted}
              applyingRefactoringId={applyingRefactoringId}
              completedRefactoringId={completedRefactoringId}
              applyRefactoringProgress={applyRefactoringProgress}
              showLogs={showDomainLogs}
              logs={testingLogs}
              logsLoading={testingLogsLoading}
            />
          </VStack>
        </GridItem>
      </Grid>
    </Container>
  );
}
