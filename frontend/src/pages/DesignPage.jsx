import { useEffect, useMemo, useState } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import {
  DesignEmptyState,
  DesignPreviewPane,
  DesignWorkspaceSidebar,
} from "../components/design-studio";
import { TASK_TYPES } from "../constants/task-types";
import { useDesignStudioStore } from "../store/useDesignStudioStore";
import { useTaskProgressStore } from "../store/useTaskProgressStore";

const DESIGN_TASK_TYPES = new Set([
  TASK_TYPES.DESIGN_BRAINSTORM,
  TASK_TYPES.DESIGN_GENERATE,
]);

function getFirstPreviewUrl(manifest, panel) {
  if (panel === "components") {
    return manifest.components[0]?.url ?? manifest.prototypes[0]?.url ?? null;
  }
  return manifest.prototypes[0]?.url ?? manifest.components[0]?.url ?? null;
}

export default function DesignPage() {
  const [panel, setPanel] = useState("prototype");
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [viewport, setViewport] = useState("desktop");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    manifest,
    loadingManifest,
    manifestError,
    currentTaskId,
    prompt,
    brainstormResponse,
    generationBrief,
    taskMessages,
    taskError,
    setPrompt,
    setGenerationBrief,
    fetchManifest,
    startBrainstorm,
    startGeneration,
    fetchTaskMessages,
  } = useDesignStudioStore();

  const progressByTaskId = useTaskProgressStore((state) => state.progressByTaskId);

  const currentTask = currentTaskId ? progressByTaskId.get(currentTaskId) : null;
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

  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = taskMessages.filter(
      (message) => message.role === "assistant",
    );
    return assistantMessages.map((message) => message.content).join("\n\n").trim();
  }, [taskMessages]);

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
    if (!currentTaskId) {
      return;
    }

    fetchTaskMessages(currentTaskId);

    const isRunning =
      currentTask?.status === "running" || currentTask?.status === "pending";
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchTaskMessages(currentTaskId);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [currentTaskId, currentTask?.status, fetchTaskMessages]);

  useEffect(() => {
    if (!hasActiveDesignGeneration) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchManifest({ silent: true }).then((result) => {
        if (result?.firstPreviewUrl) {
          setSelectedUrl((previous) => previous || result.firstPreviewUrl);
        }
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveDesignGeneration, fetchManifest]);

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
    const result = await startGeneration();
    setIsSubmitting(false);

    if (!result.success) {
      toaster.create({
        title: "Failed to start design generation",
        description: result.error,
        type: "error",
      });
      return;
    }

    toaster.create({
      title: "Design generation queued",
      description: "The design orchestrator is preparing split design files.",
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

  if (!hasDesignFiles) {
    return (
      <DesignEmptyState
        prompt={prompt}
        onPromptChange={setPrompt}
        onBrainstorm={handleBrainstorm}
        onGenerate={handleGenerate}
        isSubmitting={isSubmitting}
        currentTask={currentTask}
        brainstormResponse={latestAssistantMessage || brainstormResponse}
        generationBrief={generationBrief}
        onGenerationBriefChange={setGenerationBrief}
        taskError={taskError}
      />
    );
  }

  return (
    <Center
      minH="calc(100vh - 49px)"
      bg="linear-gradient(180deg, #fffaf3 0%, #f8fbff 42%, #eef4ff 100%)"
      px={{ base: 0, md: 4 }}
      py={{ base: 0, md: 4 }}
    >
      <Center
        w="full"
        maxW="1600px"
        minH={{ base: "calc(100vh - 49px)", md: "calc(100vh - 81px)" }}
        borderRadius={{ base: 0, md: "32px" }}
        overflow="hidden"
        borderWidth={{ base: 0, md: "1px" }}
        borderColor="rgba(226, 232, 240, 0.9)"
        boxShadow={{ base: "none", md: "0 30px 90px rgba(15, 23, 42, 0.1)" }}
        bg="rgba(255,255,255,0.72)"
        backdropFilter="blur(18px)"
        alignItems="stretch"
        flexDirection={{ base: "column", lg: "row" }}
      >
        <DesignWorkspaceSidebar
          panel={panel}
          onPanelChange={setPanel}
          prototypes={manifest.prototypes}
          components={manifest.components}
          selectedUrl={selectedUrl}
          onSelectUrl={setSelectedUrl}
          prompt={prompt}
          onPromptChange={setPrompt}
          generationBrief={generationBrief}
          onGenerationBriefChange={setGenerationBrief}
          onBrainstorm={handleBrainstorm}
          onGenerate={handleGenerate}
          isSubmitting={isSubmitting}
        />
        <DesignPreviewPane
          selectedUrl={selectedUrl}
          viewport={viewport}
          onViewportChange={setViewport}
          currentTask={currentTask}
          message={latestAssistantMessage}
          error={taskError}
        />
      </Center>
    </Center>
  );
}
