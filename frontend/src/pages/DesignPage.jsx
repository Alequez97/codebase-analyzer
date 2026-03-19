import { useEffect, useMemo, useState } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import {
  DesignEmptyState,
  DesignPreviewPane,
  DesignWorkspaceSidebar,
} from "../components/design-studio";
import { TASK_TYPES } from "../constants/task-types";
import { MODEL_LABELS } from "../constants/models";
import { useDesignStudioStore } from "../store/useDesignStudioStore";
import { useTaskProgressStore } from "../store/useTaskProgressStore";
import { useConfigStore } from "../store/useConfigStore";

const DESIGN_TASK_TYPES = new Set([
  TASK_TYPES.DESIGN_BRAINSTORM,
  TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
]);

function getFirstPreviewUrl(manifest, panel) {
  if (panel === "components") {
    return manifest.components[0]?.url ?? manifest.prototypes[0]?.url ?? null;
  }
  return manifest.prototypes[0]?.url ?? manifest.components[0]?.url ?? null;
}

function getSelectedDesignId(selectedUrl, manifest) {
  const match = selectedUrl?.match(/^\/design-preview\/([^/]+)\/index\.html$/);
  if (match?.[1] && match[1] !== "components") {
    return match[1];
  }
  return manifest.prototypes[0]?.id ?? null;
}

export default function DesignPage() {
  const [panel, setPanel] = useState("prototype");
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [viewport, setViewport] = useState("desktop");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { config } = useConfigStore();

  const {
    manifest,
    loadingManifest,
    manifestError,
    currentTaskId,
    currentTaskMode,
    prompt,
    generationBrief,
    taskMessages,
    taskEvents,
    taskError,
    currentTaskAgent,
    currentTaskModel,
    selectedModel,
    setPrompt,
    setGenerationBrief,
    setSelectedModel,
    fetchManifest,
    startBrainstorm,
    startGeneration,
    recordTaskEvent,
  } = useDesignStudioStore();

  const progressByTaskId = useTaskProgressStore(
    (state) => state.progressByTaskId,
  );

  const defaultModelLabel = config?.tasks?.["design-generate"]?.model
    ? (MODEL_LABELS[config.tasks["design-generate"].model] ??
      config.tasks["design-generate"].model)
    : null;

  const currentTask = currentTaskId
    ? progressByTaskId.get(currentTaskId)
    : null;
  const allTaskEntries = useMemo(
    () => Array.from(progressByTaskId.values()),
    [progressByTaskId],
  );

  const hasDesignFiles =
    manifest.prototypes.length > 0 || manifest.components.length > 0;

  const hasActiveDesignGeneration = allTaskEntries.some(
    (entry) =>
      DESIGN_TASK_TYPES.has(entry.type) &&
      entry.type !== TASK_TYPES.DESIGN_BRAINSTORM &&
      (entry.status === "running" || entry.status === "pending"),
  );

  const shouldShowWorkspace =
    hasDesignFiles ||
    currentTaskMode === "generate" ||
    hasActiveDesignGeneration;

  useEffect(() => {
    let mounted = true;

    fetchManifest().then((result) => {
      if (!mounted) {
        return;
      }
      if (result?.firstPreviewUrl) {
        setSelectedUrl((previous) => previous || result.firstPreviewUrl);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchManifest]);

  useEffect(() => {
    const items = [...manifest.prototypes, ...manifest.components];
    if (items.length === 0) {
      setSelectedUrl(null);
      return;
    }

    if (selectedUrl && items.some((item) => item.url === selectedUrl)) {
      return;
    }

    setSelectedUrl(getFirstPreviewUrl(manifest, panel));
  }, [manifest, panel, selectedUrl]);

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

  const handleBrainstorm = async () => {
    setIsSubmitting(true);
    const result = await startBrainstorm();
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start brainstorm",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleGenerate = async () => {
    setIsSubmitting(true);
    const result = await startGeneration({
      designId: getSelectedDesignId(selectedUrl, manifest),
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
    return (
      <DesignEmptyState
        prompt={prompt}
        onPromptChange={setPrompt}
        onBrainstorm={handleBrainstorm}
        onGenerate={handleGenerate}
        isSubmitting={isSubmitting}
        currentTask={currentTask}
        taskMessages={taskMessages}
        taskEvents={taskEvents}
        generationBrief={generationBrief}
        onGenerationBriefChange={setGenerationBrief}
        taskError={taskError}
        currentTaskAgent={currentTaskAgent}
        currentTaskModel={currentTaskModel}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        defaultModelLabel={defaultModelLabel}
      />
    );
  }

  return (
    <Center
      minH="calc(100vh - 49px)"
      bg="linear-gradient(180deg, #fffaf3 0%, #f8fbff 42%, #eef4ff 100%)"
      px={0}
      py={0}
    >
      <Center
        w="full"
        maxW="none"
        minH="calc(100vh - 49px)"
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
        <DesignWorkspaceSidebar
          panel={panel}
          onPanelChange={setPanel}
          prototypes={manifest.prototypes}
          components={manifest.components}
          selectedUrl={selectedUrl}
          onSelectUrl={setSelectedUrl}
          prompt={prompt}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          defaultModelLabel={defaultModelLabel}
          onPromptChange={setPrompt}
          generationBrief={generationBrief}
          onGenerationBriefChange={setGenerationBrief}
          onBrainstorm={handleBrainstorm}
          onGenerate={handleGenerate}
          isSubmitting={isSubmitting}
          taskMessages={taskMessages}
          currentTask={currentTask}
        />
        <DesignPreviewPane
          selectedUrl={selectedUrl}
          viewport={viewport}
          onViewportChange={setViewport}
          currentTask={currentTask}
          messages={taskMessages}
          events={taskEvents}
          error={taskError}
          taskMode={currentTaskMode}
          hasDesignFiles={hasDesignFiles}
          agent={currentTaskAgent}
          model={currentTaskModel}
        />
      </Center>
    </Center>
  );
}
