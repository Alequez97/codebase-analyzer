import {
  Box,
  Button,
  Center,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Monitor, Smartphone, Tablet, Wand2, PanelLeft } from "lucide-react";
import { useState } from "react";
import { DesignTaskConsole } from "./DesignTaskConsole";

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
  taskMode,
  hasDesignFiles,
  agent,
  model,
  sidebarVisible,
  onShowSidebar,
}) {
  const [activeView, setActiveView] = useState("preview");
  const activeViewport =
    VIEWPORTS.find((item) => item.id === viewport) ?? VIEWPORTS[0];
  const isRunning =
    currentTask?.status === "running" || currentTask?.status === "pending";
  const isGenerating = taskMode === "generate" && isRunning;
  const showThinkingView = activeView === "thinking";

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
          <VStack align="start" gap={0}>
            <Text fontSize="sm" fontWeight="800" color="gray.900">
              Live Preview
            </Text>
            <Text fontSize="xs" color="gray.500">
              Review the latest generated direction and refine it in place.
            </Text>
          </VStack>
        </HStack>

        <HStack gap={2} flexWrap="wrap" justify="flex-end">
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
        overflow="auto"
        px={{ base: 3, md: 5 }}
        py={{ base: 4, md: 5 }}
      >
        <VStack align="stretch" gap={5} minH="100%">
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
              mode={taskMode}
              hasPreview={hasDesignFiles}
              maxW="none"
              showWhenEmpty
            />
          ) : selectedUrl ? (
            <Center flex={1}>
              <Box
                w={activeViewport.width ? `${activeViewport.width}px` : "100%"}
                h={PREVIEW_FRAME_HEIGHT}
                minH="560px"
                borderRadius={activeViewport.width ? "22px" : "24px"}
                overflow="hidden"
                bg="white"
                boxShadow="0 30px 80px rgba(15, 23, 42, 0.14)"
                borderWidth="1px"
                borderColor="rgba(226, 232, 240, 0.85)"
                maxW="100%"
              >
                <iframe
                  src={selectedUrl}
                  title="Design Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  }}
                  onLoad={(e) => {
                    try {
                      const body = e.target.contentDocument?.body;
                      if (
                        body &&
                        window.getComputedStyle(body).overflowY === "hidden"
                      ) {
                        body.style.overflowY = "auto";
                      }
                    } catch {
                      // cross-origin or document not ready
                    }
                  }}
                />
              </Box>
            </Center>
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
        </VStack>
      </Box>
    </Box>
  );
}
