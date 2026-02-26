import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toaster } from "../components/ui/toaster";
import { TASK_TYPES } from "../constants/task-types";
import { SECTION_TYPES } from "../constants/section-types";
import { useCodebaseStore } from "../store/useCodebaseStore";
import { useDomainDocumentationStore } from "../store/useDomainDocumentationStore";
import { useDomainDiagramsStore } from "../store/useDomainDiagramsStore";
import { useDomainRequirementsStore } from "../store/useDomainRequirementsStore";
import { useDomainBugsSecurityStore } from "../store/useDomainBugsSecurityStore";
import { useDomainTestingStore } from "../store/useDomainTestingStore";
import { useTaskProgressStore } from "../store/useTaskProgressStore";
import { useDomainEditorStore } from "../store/useDomainEditorStore";
import { useTestingStore } from "../store/useTestingStore";
import { useLogsStore } from "../store/useLogsStore";
import { useDomainSectionsChatStore } from "../store/useDomainSectionsChatStore";
import {
  DOCUMENTATION_CHAT_CONFIG,
  REQUIREMENTS_CHAT_CONFIG,
  DIAGRAMS_CHAT_CONFIG,
  BUGS_SECURITY_CHAT_CONFIG,
  TESTING_CHAT_CONFIG,
} from "../config";

export default function DomainDetailsPage() {
  const navigate = useNavigate();
  const { domainId } = useParams();

  // Domain sections chat store
  const {
    openChat,
    closeChat,
    activeSectionType,
    isChatActive,
    getPendingSuggestion,
    clearPendingSuggestion,
  } = useDomainSectionsChatStore();

  // Codebase store (for analysis and domain list)
  const { analysis } = useCodebaseStore();

  // Domain section stores
  const docStore = useDomainDocumentationStore();
  const diagramsStore = useDomainDiagramsStore();
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

  // Task progress - filter by section type
  const taskProgress = progressById.get(domainId);
  const documentationProgress =
    taskProgress?.type === TASK_TYPES.DOCUMENTATION ? taskProgress : null;
  const diagramsProgress =
    taskProgress?.type === TASK_TYPES.DIAGRAMS ? taskProgress : null;
  const requirementsProgress =
    taskProgress?.type === TASK_TYPES.REQUIREMENTS ? taskProgress : null;
  const bugsSecurityProgress =
    taskProgress?.type === TASK_TYPES.BUGS_SECURITY ? taskProgress : null;
  const testingProgress =
    taskProgress?.type === TASK_TYPES.TESTING ? taskProgress : null;

  // Logs data for each section
  const domainLogs = domainLogsBySection.get(domainId) || new Map();
  const documentationLogs = domainLogs.get(SECTION_TYPES.DOCUMENTATION) || "";
  const diagramsLogs = domainLogs.get(SECTION_TYPES.DIAGRAMS) || "";
  const requirementsLogs = domainLogs.get(SECTION_TYPES.REQUIREMENTS) || "";
  const bugsSecurityLogs = domainLogs.get(SECTION_TYPES.BUGS_SECURITY) || "";
  const testingLogs = domainLogs.get(SECTION_TYPES.TESTING) || "";

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
  const testingLogsLoading = !!logsLoading.get(SECTION_TYPES.TESTING);

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
  const applyingTests = applyingTestsByDomainId[domainId] || {};

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

  // Get current chat configuration and content based on active section
  const getCurrentChatData = () => {
    if (!activeSectionType) return null;

    const configs = {
      [SECTION_TYPES.DOCUMENTATION]: {
        config: DOCUMENTATION_CHAT_CONFIG,
        content: documentation,
      },
      [SECTION_TYPES.REQUIREMENTS]: {
        config: REQUIREMENTS_CHAT_CONFIG,
        content: requirements,
      },
      [SECTION_TYPES.DIAGRAMS]: {
        config: DIAGRAMS_CHAT_CONFIG,
        content: diagrams,
      },
      [SECTION_TYPES.BUGS_SECURITY]: {
        config: BUGS_SECURITY_CHAT_CONFIG,
        content: bugsSecurity,
      },
      [SECTION_TYPES.TESTING]: {
        config: TESTING_CHAT_CONFIG,
        content: testing,
      },
    };

    return configs[activeSectionType] || null;
  };

  const handleApplyChatChanges = (newContent) => {
    // Apply AI-suggested changes based on section
    switch (activeSectionType) {
      case SECTION_TYPES.DOCUMENTATION:
        updateEditedDocumentation(domainId, newContent);
        break;
      case SECTION_TYPES.REQUIREMENTS:
        updateEditedRequirements(domainId, newContent);
        break;
      case SECTION_TYPES.DIAGRAMS:
        // Diagrams might need special handling
        console.log("Apply diagrams changes:", newContent);
        break;
      case SECTION_TYPES.BUGS_SECURITY:
        // Bugs & Security might need special handling
        console.log("Apply bugs/security changes:", newContent);
        break;
      case SECTION_TYPES.TESTING:
        // Testing might need special handling
        console.log("Apply testing changes:", newContent);
        break;
    }
    // Clear pending suggestion after applying
    clearPendingSuggestion(domainId, activeSectionType);
  };

  const chatData = getCurrentChatData();

  return (
    <Container maxW="100%" py={8} px={4}>
      <Grid
        templateColumns={{
          base: "1fr",
          lg: activeSectionType ? "1fr 400px" : "1fr",
        }}
        gap={6}
        alignItems="start"
      >
        {/* Main Content Column */}
        <GridItem overflowX="hidden">
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
              onOpenChat={() =>
                openChat(
                  domainId,
                  SECTION_TYPES.DOCUMENTATION,
                  DOCUMENTATION_CHAT_CONFIG.initialGreeting,
                )
              }
              isChatOpen={isChatActive(domainId, SECTION_TYPES.DOCUMENTATION)}
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.DOCUMENTATION,
              )}
              onApplyChanges={handleApplyChatChanges}
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
              onOpenChat={() =>
                openChat(
                  domainId,
                  SECTION_TYPES.DIAGRAMS,
                  DIAGRAMS_CHAT_CONFIG.initialGreeting,
                )
              }
              isChatOpen={isChatActive(domainId, SECTION_TYPES.DIAGRAMS)}
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.DIAGRAMS,
              )}
              onApplyChanges={handleApplyChatChanges}
              onDismissChanges={() =>
                clearPendingSuggestion(domainId, SECTION_TYPES.DIAGRAMS)
              }
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
              onOpenChat={() =>
                openChat(
                  domainId,
                  SECTION_TYPES.REQUIREMENTS,
                  REQUIREMENTS_CHAT_CONFIG.initialGreeting,
                )
              }
              isChatOpen={isChatActive(domainId, SECTION_TYPES.REQUIREMENTS)}
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.REQUIREMENTS,
              )}
              onApplyChanges={handleApplyChatChanges}
              onDismissChanges={() =>
                clearPendingSuggestion(domainId, SECTION_TYPES.REQUIREMENTS)
              }
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
              onOpenChat={() =>
                openChat(
                  domainId,
                  SECTION_TYPES.BUGS_SECURITY,
                  BUGS_SECURITY_CHAT_CONFIG.initialGreeting,
                )
              }
              isChatOpen={isChatActive(domainId, SECTION_TYPES.BUGS_SECURITY)}
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.BUGS_SECURITY,
              )}
              onApplyChanges={handleApplyChatChanges}
              onDismissChanges={() =>
                clearPendingSuggestion(domainId, SECTION_TYPES.BUGS_SECURITY)
              }
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
              onOpenChat={() =>
                openChat(
                  domainId,
                  SECTION_TYPES.TESTING,
                  TESTING_CHAT_CONFIG.initialGreeting,
                )
              }
              isChatOpen={isChatActive(domainId, SECTION_TYPES.TESTING)}
              pendingSuggestion={getPendingSuggestion(
                domainId,
                SECTION_TYPES.TESTING,
              )}
              onApplyChanges={handleApplyChatChanges}
              onDismissChanges={() =>
                clearPendingSuggestion(domainId, SECTION_TYPES.TESTING)
              }
            />
          </VStack>
        </GridItem>

        {/* Chat Panel Column - Sticky on the right */}
        {activeSectionType && chatData && (
          <GridItem
            display={{ base: "none", lg: "block" }}
            position="sticky"
            top="20px"
            maxH="calc(100vh - 40px)"
            overflowY="hidden"
          >
            <Box h="full">
              <AISectionChat
                {...chatData.config}
                currentContent={chatData.content}
                onClose={closeChat}
                onApplyChanges={handleApplyChatChanges}
                domainId={domainId}
                sectionType={activeSectionType}
              />
            </Box>
          </GridItem>
        )}
      </Grid>
    </Container>
  );
}
