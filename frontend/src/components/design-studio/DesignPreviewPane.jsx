import {
  Box,
  Button,
  Center,
  HStack,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Wand2,
  PanelLeft,
  Globe,
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DesignTaskConsole } from "./DesignTaskConsole";
import { toaster } from "../ui/toaster";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390 },
];

const PREVIEW_FRAME_HEIGHT = "calc(100vh - 205px)";

export function DesignPreviewPane({
  selectedUrl,
  viewport,
  onViewportChange,
  currentTask,
  messages,
  events,
  error,

  hasDesignFiles,
  agent,
  model,
  sidebarVisible,
  onShowSidebar,

  // Ngrok publish props
  publishedUrl,
  isPublishing,
  publishError,
  onPublish,
  onUnpublish,
}) {
  const [activeView, setActiveView] = useState("preview");
  const [isPreviewLoading, setIsPreviewLoading] = useState(
    Boolean(selectedUrl),
  );
  const [previewLoadError, setPreviewLoadError] = useState(null);
  const activeViewport =
    VIEWPORTS.find((item) => item.id === viewport) ?? VIEWPORTS[0];
  const isRunning =
    currentTask?.status === "running" || currentTask?.status === "pending";
  const isGenerating = isRunning;
  const showThinkingView = activeView === "thinking";
  const showPreviewLoader =
    !showThinkingView && selectedUrl && isPreviewLoading;

  // Extract design ID from selectedUrl
  const currentDesignId = (() => {
    if (!selectedUrl) return null;
    const match = selectedUrl.match(/^\/design-preview\/([^/]+)(?:\/.*)?$/);
    return match?.[1] ?? null;
  })();

  useEffect(() => {
    if (!selectedUrl) {
      setIsPreviewLoading(false);
      setPreviewLoadError(null);
      return;
    }

    setIsPreviewLoading(true);
    setPreviewLoadError(null);
  }, [selectedUrl]);

  const handlePublishToggle = async () => {
    if (!currentDesignId) {
      toaster.create({
        title: "Cannot publish",
        description: "No design selected",
        type: "error",
      });
      return;
    }

    if (publishedUrl) {
      // Unpublish
      const result = await onUnpublish(currentDesignId);
      if (result.success) {
        toaster.create({
          title: "Design unpublished",
          description: "The ngrok tunnel has been closed",
          type: "success",
        });
      } else {
        toaster.create({
          title: "Failed to unpublish",
          description: result.error,
          type: "error",
        });
      }
    } else {
      // Publish
      const result = await onPublish(currentDesignId);
      if (result.success) {
        toaster.create({
          title: "Design published!",
          description: "Your design is now publicly accessible",
          type: "success",
        });
      } else {
        toaster.create({
          title: "Failed to publish",
          description: result.error,
          type: "error",
        });
      }
    }
  };

  const handleOpenPublicUrl = () => {
    if (publishedUrl) {
      window.open(publishedUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Box flex={1} display="flex" flexDirection="column" minW={0}>
      <HStack
        justify="space-between"
        px={5}
        py={4}
        borderBottomWidth="1px"
        borderColor="rgba(226, 232, 240, 0.9)"
        bg="rgba(255,255,255,0.7)"
        backdropFilter="blur(10px)"
      >
        <HStack gap={3}>
          {!sidebarVisible && (
            <IconButton
              size="sm"
              variant="ghost"
              borderRadius="full"
              onClick={onShowSidebar}
              aria-label="Show sidebar"
            >
              <PanelLeft size={16} />
            </IconButton>
          )}

          {hasDesignFiles && currentDesignId && (
            <HStack gap={1}>
              <Button
                size="xs"
                borderRadius="full"
                variant={publishedUrl ? "solid" : "outline"}
                colorPalette={publishedUrl ? "purple" : "gray"}
                onClick={handlePublishToggle}
                disabled={isPublishing || !currentDesignId}
              >
                {isPublishing ? (
                  <Spinner size="xs" />
                ) : publishedUrl ? (
                  <X size={12} />
                ) : (
                  <Globe size={12} />
                )}
                {isPublishing
                  ? "Publishing..."
                  : publishedUrl
                    ? "Unpublish"
                    : "Publish"}
              </Button>

              {publishedUrl && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  borderRadius="full"
                  onClick={handleOpenPublicUrl}
                  aria-label="Open public URL"
                  title={publishedUrl}
                >
                  <ExternalLink size={12} />
                </IconButton>
              )}
            </HStack>
          )}

          <HStack
            gap={1}
            p={1}
            borderRadius="full"
            bg="rgba(255,255,255,0.88)"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.95)"
          >
            <Button
              size="xs"
              borderRadius="full"
              variant={showThinkingView ? "ghost" : "solid"}
              colorPalette={showThinkingView ? "gray" : "orange"}
              onClick={() => setActiveView("preview")}
            >
              <Monitor size={12} />
              Preview
            </Button>
            <Button
              size="xs"
              borderRadius="full"
              variant={showThinkingView ? "solid" : "ghost"}
              colorPalette={showThinkingView ? "orange" : "gray"}
              onClick={() => setActiveView("thinking")}
            >
              <Wand2 size={12} />
              Generation Log
            </Button>
          </HStack>
        </HStack>

        <HStack gap={2} flexWrap="wrap" justify="flex-end">
          {hasDesignFiles &&
            VIEWPORTS.map(({ id, label, icon: Icon, width }) => (
              <Button
                key={id}
                size="xs"
                borderRadius="full"
                variant={viewport === id ? "solid" : "ghost"}
                colorPalette={viewport === id ? "orange" : "gray"}
                onClick={() => onViewportChange(id)}
              >
                <Icon size={12} />
                {label}
                {width && (
                  <Text as="span" fontSize="10px" opacity={0.7}>
                    {width}px
                  </Text>
                )}
              </Button>
            ))}
        </HStack>
      </HStack>

      <Box
        flex={1}
        bg="linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)"
        overflow={showThinkingView ? "auto" : "hidden"}
        px={0}
        py={0}
      >
        {showThinkingView ? (
          <DesignTaskConsole
            title="Thinking & Stages"
            statusText={currentTask?.message || null}
            isRunning={isRunning}
            messages={messages}
            events={events}
            error={error}
            agent={agent}
            model={model}
            mode="generate"
            hasPreview={hasDesignFiles}
            maxW="none"
            showWhenEmpty
          />
        ) : selectedUrl ? (
          <Box
            position="relative"
            w={activeViewport.width ? `${activeViewport.width}px` : "100%"}
            h="100%"
            borderRadius="0"
            overflow="hidden"
            bg="white"
            boxShadow="0 30px 80px rgba(15, 23, 42, 0.14)"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.85)"
            maxW="100%"
            mx={activeViewport.width ? "auto" : 0}
          >
            {showPreviewLoader && (
              <Center
                position="absolute"
                inset={0}
                zIndex={1}
                bg="rgba(248, 250, 252, 0.96)"
                backdropFilter="blur(8px)"
              >
                <VStack gap={4} maxW="420px" px={8} textAlign="center">
                  <Spinner size="lg" color="orange.500" />
                  <VStack gap={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="800"
                      color="orange.700"
                      textTransform="uppercase"
                      letterSpacing="0.14em"
                    >
                      Preparing Preview
                    </Text>
                    <Text
                      fontSize={{ base: "2xl", md: "3xl" }}
                      lineHeight="1.02"
                      letterSpacing="-0.04em"
                      fontWeight="700"
                      fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
                      color="gray.900"
                    >
                      The selected version is loading.
                    </Text>
                    <Text fontSize="sm" color="gray.600" lineHeight="1.8">
                      If this is a React-based prototype, the server may need to
                      install dependencies and build the preview before it can
                      be shown.
                    </Text>
                  </VStack>
                </VStack>
              </Center>
            )}

            {previewLoadError && (
              <Center
                position="absolute"
                inset={0}
                zIndex={2}
                bg="rgba(255, 247, 237, 0.98)"
                px={8}
              >
                <VStack gap={3} maxW="420px" textAlign="center">
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    color="red.700"
                    textTransform="uppercase"
                    letterSpacing="0.14em"
                  >
                    Preview Error
                  </Text>
                  <Text
                    fontSize={{ base: "2xl", md: "3xl" }}
                    lineHeight="1.02"
                    letterSpacing="-0.04em"
                    fontWeight="700"
                    fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
                    color="gray.900"
                  >
                    The preview could not be prepared.
                  </Text>
                  <Text fontSize="sm" color="gray.700" lineHeight="1.8">
                    {previewLoadError}
                  </Text>
                </VStack>
              </Center>
            )}

            <iframe
              key={selectedUrl}
              src={selectedUrl}
              title="Design Preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                visibility:
                  showPreviewLoader || previewLoadError ? "hidden" : "visible",
              }}
              onLoad={(e) => {
                try {
                  const body = e.target.contentDocument?.body;
                  const bodyText = body?.innerText?.trim() || "";

                  if (bodyText === "Failed to prepare design preview") {
                    setPreviewLoadError(
                      "The server could not install or build the selected preview.",
                    );
                    setIsPreviewLoading(false);
                    return;
                  }

                  if (
                    body &&
                    window.getComputedStyle(body).overflowY === "hidden"
                  ) {
                    body.style.overflowY = "auto";
                  }

                  setPreviewLoadError(null);
                  setIsPreviewLoading(false);
                } catch {
                  setPreviewLoadError(null);
                  setIsPreviewLoading(false);
                }
              }}
              onError={() => {
                setPreviewLoadError(
                  "The preview frame failed to load the selected version.",
                );
                setIsPreviewLoading(false);
              }}
            />
          </Box>
        ) : (
          <Center flex={1} minH="560px">
            <Box
              w="full"
              maxW="980px"
              minH="560px"
              borderRadius="30px"
              borderWidth="1px"
              borderColor="rgba(226, 232, 240, 0.9)"
              bg="linear-gradient(180deg, rgba(255,255,255,0.94), rgba(241,245,249,0.94))"
              boxShadow="0 30px 80px rgba(15, 23, 42, 0.08)"
              position="relative"
              overflow="hidden"
              px={{ base: 6, md: 8 }}
              py={{ base: 8, md: 10 }}
              sx={{
                "@keyframes designPulse": {
                  "0%, 100%": { opacity: 0.45, transform: "scale(1)" },
                  "50%": { opacity: 0.9, transform: "scale(1.04)" },
                },
              }}
            >
              <Box
                position="absolute"
                top="-80px"
                right="-80px"
                w="220px"
                h="220px"
                borderRadius="full"
                bg="radial-gradient(circle, rgba(251,191,36,0.24) 0%, rgba(251,191,36,0) 72%)"
                animation="designPulse 4.6s ease-in-out infinite"
              />
              <Box
                position="absolute"
                bottom="-110px"
                left="-110px"
                w="260px"
                h="260px"
                borderRadius="full"
                bg="radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 72%)"
                animation="designPulse 5.4s ease-in-out infinite"
              />

              <VStack
                align="start"
                justify="center"
                h="100%"
                gap={6}
                position="relative"
              >
                <VStack align="start" gap={2} maxW="520px">
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    color="orange.700"
                    textTransform="uppercase"
                    letterSpacing="0.16em"
                  >
                    {isGenerating ? "Design in progress" : "Workspace ready"}
                  </Text>
                  <Text
                    fontSize={{ base: "3xl", md: "5xl" }}
                    lineHeight={{ base: "1.05", md: "0.98" }}
                    letterSpacing="-0.05em"
                    fontWeight="700"
                    fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
                    color="gray.900"
                  >
                    {isGenerating
                      ? "The preview is being built right here."
                      : "Your next preview will appear here."}
                  </Text>
                  <Text fontSize="md" color="gray.600" lineHeight="1.8">
                    {isGenerating
                      ? "Stay in the workspace while the model sharpens the direction, writes the files, and prepares the first live version."
                      : hasDesignFiles
                        ? "Pick a design version from the sidebar to preview."
                        : "Start a generation to open a live preview and continue iterating from chat."}
                  </Text>
                </VStack>

                <HStack gap={3} flexWrap="wrap">
                  {[
                    isGenerating
                      ? "Thinking through structure"
                      : "Workspace idle",
                    isGenerating
                      ? "Writing HTML/CSS/JS"
                      : "Waiting for generation",
                    isGenerating
                      ? "Preparing preview frame"
                      : "Ready for next iteration",
                  ].map((label) => (
                    <Box
                      key={label}
                      borderRadius="full"
                      borderWidth="1px"
                      borderColor="rgba(251, 146, 60, 0.24)"
                      bg="rgba(255,255,255,0.78)"
                      px={4}
                      py={2}
                    >
                      <Text fontSize="sm" color="gray.700">
                        {label}
                      </Text>
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </Box>
          </Center>
        )}
      </Box>
    </Box>
  );
}

