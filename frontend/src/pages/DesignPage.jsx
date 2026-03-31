import { useEffect, useMemo, useState } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import {
  DesignEmptyState,
  DesignPreviewPane,
  DesignReverseEngineerSetup,
  DesignWorkspaceSidebar,
} from "../components/design-studio";
import { TASK_TYPES } from "../constants/task-types";
import { useDesignStudioStore } from "../store/useDesignStudioStore";
import { useDesignBrainstormStore } from "../store/useDesignBrainstormStore";
import { useDesignAssistantStore } from "../store/useDesignAssistantStore";
import { useTaskProgressStore } from "../store/useTaskProgressStore";
import { useConfigStore } from "../store/useConfigStore";
import { useProjectFilesStore } from "../store/useProjectFilesStore";

const DESIGN_TASK_TYPES = new Set([
  TASK_TYPES.DESIGN_BRAINSTORM,
  TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  TASK_TYPES.DESIGN_REVERSE_ENGINEER,
]);

function getFirstPreviewUrl(manifest) {
  return manifest.versions[0]?.url ?? null;
}

function getSelectedDesignId(selectedUrl, manifest) {
  const match = selectedUrl?.match(/^\/design-preview\/([^/]+)(?:\/.*)?$/);
  if (match?.[1]) {
    return match[1];
  }
  return manifest.latestVersionId ?? manifest.versions[0]?.id ?? null;
}

export default function DesignPage() {
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [viewport, setViewport] = useState("desktop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceFromScratch, setForceFromScratch] = useState(false);

  const { getTaskDefaultModel } = useConfigStore();
  const { files: projectFiles, fetchProjectFiles } = useProjectFilesStore();

  // Design brainstorm store (separate from main studio store)
  const {
    brainstormComplete,
    brainstormResponse,
    brainstormMessages,
    brainstormTaskId,
    targetDesignId,
    loadingBrainstorm,
    pendingQuestion: brainstormPendingQuestion,
    sendUserResponse: sendBrainstormResponse,
    startBrainstorm: startBrainstormInStore,
    loadLatestBrainstorm,
  } = useDesignBrainstormStore();

  const {
    editComplete,
    editMessages,
    editTaskId,
    loadingEdit,
    editSessions,
    loadingEditSessions,
    pendingQuestion: editPendingQuestion,
    sendUserResponse: sendEditResponse,
    startEdit,
    loadLatestEdit,
    fetchEditSessions,
    openEditSession,
    editError,
    clearEdit,
  } = useDesignAssistantStore();

  // Main design studio store
  const {
    manifest,
    loadingManifest,
    manifestError,
    currentTaskId,
    prompt,
    generationBrief,
    generationMessages,
    taskEvents,
    taskError,
    currentTaskAgent,
    currentTaskModel,
    selectedModel,
    selectedTechnology,
    sidebarVisible,
    sidebarTab,
    designMode,
    pendingQuestion,
    sendUserResponse,
    setPrompt,
    setGenerationBrief,
    setSelectedModel,
    setSelectedTechnology,
    setSidebarVisible,
    setSidebarTab,
    setDesignMode,
    getNextVersionId,
    getLatestVersionId,
    fetchManifest,
    loadLatestGeneration,
    startGeneration,
    startReverseEngineer,
    recordTaskEvent,
    clearAll,
    publishedUrl,
    isPublishing,
    publishError,
    publishDesign,
    unpublishDesign,
    checkPublishStatus,
  } = useDesignStudioStore();

  const progressByTaskId = useTaskProgressStore(
    (state) => state.progressByTaskId,
  );

  // Task progress — brainstorm and generation are tracked separately
  const brainstormTask = brainstormTaskId
    ? progressByTaskId.get(brainstormTaskId)
    : null;
  const editTask = editTaskId ? progressByTaskId.get(editTaskId) : null;
  const currentTask = currentTaskId
    ? progressByTaskId.get(currentTaskId)
    : null;

  // Default model labels per task type (from server config)
  const brainstormModelLabel = getTaskDefaultModel(
    TASK_TYPES.DESIGN_BRAINSTORM,
  );
  const generationModelLabel = getTaskDefaultModel(
    TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
  );
  const allTaskEntries = useMemo(
    () => Array.from(progressByTaskId.values()),
    [progressByTaskId],
  );

  const hasDesignFiles = manifest.versions.length > 0;

  // Existing project: project has source files on disk
  const isExistingProject = projectFiles.length > 0 && !forceFromScratch;

  const hasActiveDesignGeneration = allTaskEntries.some(
    (entry) =>
      DESIGN_TASK_TYPES.has(entry.type) &&
      entry.type !== TASK_TYPES.DESIGN_BRAINSTORM &&
      (entry.status === "running" || entry.status === "pending"),
  );

  const shouldShowWorkspace =
    hasDesignFiles || !!currentTaskId || hasActiveDesignGeneration;

  const nextVersionId = useMemo(() => getNextVersionId(), [manifest]);
  const latestVersionId = useMemo(() => getLatestVersionId(), [manifest]);

  useEffect(() => {
    if (sidebarTab === "brainstorm") {
      setSidebarTab("chat");
    }
  }, [sidebarTab, setSidebarTab]);

  useEffect(() => {
    let mounted = true;

    // Load manifest, generation history, and brainstorm history in parallel
    Promise.all([
      fetchManifest(),
      loadLatestGeneration(),
      loadLatestBrainstorm(),
      loadLatestEdit(),
      fetchEditSessions(),
      fetchProjectFiles(),
    ]).then(([manifestResult]) => {
      if (!mounted) {
        return;
      }
      if (manifestResult?.latestPreviewUrl) {
        setSelectedUrl(
          (previous) => previous || manifestResult.latestPreviewUrl,
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, [
    fetchManifest,
    loadLatestGeneration,
    loadLatestBrainstorm,
    loadLatestEdit,
    fetchEditSessions,
    fetchProjectFiles,
  ]);

  useEffect(() => {
    if (manifest.versions.length === 0) {
      setSelectedUrl(null);
      return;
    }

    if (
      selectedUrl &&
      manifest.versions.some(
        (item) =>
          item.url === selectedUrl ||
          item.pages?.some((page) => page.url === selectedUrl),
      )
    ) {
      return;
    }

    setSelectedUrl(manifest.latestVersionUrl ?? getFirstPreviewUrl(manifest));
  }, [manifest, selectedUrl]);

  const currentVersionLabel = useMemo(() => {
    const direct = manifest.versions.find((item) => item.url === selectedUrl);
    if (direct) return direct.label;
    return manifest.versions.find((item) =>
      item.pages?.some((page) => page.url === selectedUrl),
    )?.label;
  }, [manifest, selectedUrl]);

  useEffect(() => {
    if (!currentTaskId || !currentTask?.message) {
      return;
    }

    recordTaskEvent({
      taskId: currentTaskId,
      stage: currentTask?.stage ?? null,
      message: currentTask.message,
      status: currentTask.status,
    });
  }, [
    currentTaskId,
    currentTask?.message,
    currentTask?.stage,
    currentTask?.status,
    recordTaskEvent,
  ]);

  const handleReverseEngineer = async (pages) => {
    setIsSubmitting(true);
    const result = await startReverseEngineer({ pages });
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start reverse engineering",
        description: result.error,
        type: "error",
      });
      return;
    }

    toaster.create({
      title: "Reverse engineering queued",
      description:
        "The AI is scanning your source files and generating a standalone prototype.",
      type: "success",
    });
  };

  const handleBrainstorm = async (promptOverride) => {
    setIsSubmitting(true);
    const textToUse =
      typeof promptOverride === "string" ? promptOverride : prompt;
    const result = await startBrainstormInStore(textToUse, selectedModel);
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start brainstorm",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleStartEdit = async (promptOverride) => {
    setIsSubmitting(true);
    const textToUse =
      typeof promptOverride === "string" ? promptOverride : prompt;
    const result = await startEdit(textToUse, selectedModel);
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start edit",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleClearEdit = () => {
    clearEdit();
  };

  const handleGenerate = async (forceDesignMode) => {
    setIsSubmitting(true);

    // Determine the design ID based on mode or state
    let designId;

    if (forceDesignMode === "new") {
      designId = nextVersionId;
    } else if (forceDesignMode === "improve-latest") {
      designId = latestVersionId;
    } else {
      designId = targetDesignId || getSelectedDesignId(selectedUrl, manifest);
    }

    // Safety fallback
    if (!designId) {
      designId = latestVersionId || "v1";
    }

    const result = await startGeneration({
      designId,
      brief: brainstormResponse || generationBrief,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start design planning",
        description: result.error,
        type: "error",
      });
      return;
    }

    toaster.create({
      title: "Design planning queued",
      description:
        "The design orchestrator is planning the system and delegating page generation.",
      type: "success",
    });
  };

  const handleClearBrainstorm = (onlyBrainstorm = false) => {
    // Clear both stores independently
    useDesignBrainstormStore.getState().clearBrainstorm();
    if (!onlyBrainstorm) {
      clearAll();
    }
  };

  if (loadingManifest) {
    return (
      <Center h="60vh">
        <Spinner size="lg" color="orange.500" />
      </Center>
    );
  }

  if (manifestError) {
    return (
      <Center h="60vh">
        <Text color="red.500">{manifestError}</Text>
      </Center>
    );
  }

  if (!shouldShowWorkspace) {
    if (isExistingProject) {
      return (
        <DesignReverseEngineerSetup
          isSubmitting={isSubmitting}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          defaultModelLabel={getTaskDefaultModel(
            TASK_TYPES.DESIGN_REVERSE_ENGINEER,
          )}
          onReverseEngineer={handleReverseEngineer}
          onDesignFromScratch={() => setForceFromScratch(true)}
        />
      );
    }

    return (
      <DesignEmptyState
        prompt={prompt}
        onPromptChange={setPrompt}
        onBrainstorm={handleBrainstorm}
        onGenerate={handleGenerate}
        onStartOver={handleClearBrainstorm}
        isSubmitting={isSubmitting}
        currentTask={brainstormTask}
        taskMessages={brainstormMessages}
        generationBrief={generationBrief}
        onGenerationBriefChange={setGenerationBrief}
        taskError={taskError}
        selectedModel={selectedModel}
        selectedTechnology={selectedTechnology}
        onModelChange={setSelectedModel}
        onTechnologyChange={setSelectedTechnology}
        defaultModelLabel={brainstormModelLabel}
        pendingQuestion={brainstormPendingQuestion || brainstormResponse}
        onSendUserResponse={sendBrainstormResponse}
        currentTaskModel={brainstormTask?.model ?? null}
        brainstormComplete={brainstormComplete}
      />
    );
  }

  return (
    <Center
      h="calc(100vh - 52px)"
      bg="linear-gradient(180deg, #fffaf3 0%, #f8fbff 42%, #eef4ff 100%)"
      px={0}
      py={0}
      overflow="hidden"
    >
      <Center
        w="full"
        maxW="none"
        h="100%"
        borderRadius={0}
        overflow="hidden"
        borderWidth={0}
        boxShadow="none"
        bg="rgba(255,255,255,0.66)"
        backdropFilter="blur(14px)"
        alignItems="stretch"
        flexDirection={{ base: "column", lg: "row" }}
        sx={{
          "@keyframes designWorkspaceEnter": {
            "0%": {
              opacity: 0,
              transform: "translateY(28px) scale(0.985)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0) scale(1)",
            },
          },
          animation:
            "designWorkspaceEnter 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {sidebarVisible && (
          <DesignWorkspaceSidebar
            versions={manifest.versions}
            selectedUrl={selectedUrl}
            onSelectUrl={setSelectedUrl}
            prompt={prompt}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            defaultModelLabel={generationModelLabel}
            onPromptChange={setPrompt}
            generationBrief={generationBrief}
            onGenerationBriefChange={setGenerationBrief}
            onGenerate={handleGenerate}
            onBrainstorm={handleBrainstorm}
            isSubmitting={isSubmitting}
            taskMessages={generationMessages}
            taskEvents={taskEvents}
            currentTask={currentTask}
            isBrainstorming={loadingBrainstorm}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            onClose={() => setSidebarVisible(false)}
            designMode={designMode}
            onDesignModeChange={setDesignMode}
            nextVersionId={nextVersionId}
            latestVersionId={latestVersionId}
            brainstormTask={brainstormTask}
            brainstormMessages={brainstormMessages}
            brainstormPendingQuestion={
              brainstormPendingQuestion || brainstormResponse
            }
            onSendBrainstormResponse={sendBrainstormResponse}
            brainstormComplete={brainstormComplete}
            onClearBrainstorm={handleClearBrainstorm}
            editTask={editTask}
            editTaskId={editTaskId}
            editMessages={editMessages}
            editSessions={editSessions}
            loadingEditSessions={loadingEditSessions}
            editPendingQuestion={editPendingQuestion}
            onStartEdit={handleStartEdit}
            onSendEditResponse={sendEditResponse}
            onOpenEditHistory={openEditSession}
            onRefreshEditHistory={fetchEditSessions}
            onClearEdit={handleClearEdit}
            isEditing={isSubmitting || loadingEdit}
            editTaskError={editError}
          />
        )}
        <DesignPreviewPane
          selectedUrl={selectedUrl}
          viewport={viewport}
          onViewportChange={setViewport}
          currentTask={currentTask}
          messages={generationMessages}
          events={taskEvents}
          error={taskError}
          hasDesignFiles={hasDesignFiles}
          agent={currentTaskAgent}
          model={currentTaskModel}
          sidebarVisible={sidebarVisible}
          onShowSidebar={() => setSidebarVisible(true)}
          publishedUrl={publishedUrl}
          isPublishing={isPublishing}
          publishError={publishError}
          currentVersionLabel={currentVersionLabel ?? null}
          onPublish={publishDesign}
          onUnpublish={unpublishDesign}
        />
      </Center>
    </Center>
  );
}
