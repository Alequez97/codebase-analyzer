import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  Layers,
  LayoutTemplate,
  MessageSquare,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { ModelSelector } from "../FloatingChat/ModelSelector";
import { DesignBrainstormChat } from "./DesignBrainstormChat";

export function DesignWorkspaceSidebar({
  versions,
  selectedUrl,
  onSelectUrl,
  prompt,
  onPromptChange,
  generationBrief,
  onGenerationBriefChange,
  onGenerate,
  onBrainstorm,
  isSubmitting,
  taskMessages,
  taskEvents,
  currentTask,
  isBrainstorming,
  selectedModel,
  onModelChange,
  defaultModelLabel,
  activeTab,
  onTabChange,
  onClose,
  designMode,
  onDesignModeChange,
  nextVersionId,
  latestVersionId,
  brainstormTask,
  brainstormMessages,
  brainstormPendingQuestion,
  onSendBrainstormResponse,
  brainstormComplete,
  onClearBrainstorm,
}) {
  const conversationMessages = taskMessages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.content?.trim(),
  );
  const isWorking =
    currentTask?.status === "running" || currentTask?.status === "pending";
  const isGenerating = isWorking && !isBrainstorming;
  const hasConversationHistory = conversationMessages.length > 0;

  return (
    <Box
      w={{ base: "100%", lg: "480px" }}
      h="calc(100vh - 49px)"
      maxH="calc(100vh - 49px)"
      flexShrink={0}
      borderRightWidth={{ base: 0, lg: "1px" }}
      borderBottomWidth={{ base: "1px", lg: 0 }}
      borderColor="rgba(226, 232, 240, 0.9)"
      bg="rgba(255,255,255,0.92)"
      backdropFilter="blur(12px)"
      display="flex"
      flexDirection="column"
    >
      {/* Header with tabs and close button */}
      <HStack
        justify="space-between"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="rgba(226, 232, 240, 0.9)"
      >
        <HStack gap={1}>
          <Button
            size="sm"
            variant={activeTab === "chat" ? "solid" : "ghost"}
            colorPalette={activeTab === "chat" ? "orange" : "gray"}
            borderRadius="full"
            onClick={() => onTabChange("chat")}
          >
            <MessageSquare size={14} />
            Chat
          </Button>
          <Button
            size="sm"
            variant={activeTab === "files" ? "solid" : "ghost"}
            colorPalette={activeTab === "files" ? "orange" : "gray"}
            borderRadius="full"
            onClick={() => onTabChange("files")}
          >
            <Layers size={14} />
            Versions
          </Button>
          <Button
            size="sm"
            variant={activeTab === "brainstorm" ? "solid" : "ghost"}
            colorPalette={activeTab === "brainstorm" ? "orange" : "gray"}
            borderRadius="full"
            onClick={() => onTabChange("brainstorm")}
          >
            <Sparkles size={14} />
            Brainstorm
          </Button>
        </HStack>
        <IconButton
          size="sm"
          variant="ghost"
          borderRadius="full"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </IconButton>
      </HStack>

      {/* Chat Tab Content */}
      {activeTab === "chat" && (
        <VStack align="stretch" gap={3} p={4} flex={1} minH={0}>
          {/* Conversation Header */}
          <HStack justify="space-between" align="center" flexShrink={0}>
            <Text
              fontSize="xs"
              fontWeight="800"
              color="gray.500"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Conversation
            </Text>
          </HStack>

          {/* Conversation Box - Expands to fill space */}
          <Box
            flex={1}
            minH={0}
            overflowY="auto"
            borderRadius="24px"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.9)"
            bg="rgba(248,250,252,0.88)"
            px={3}
            py={3}
          >
            {conversationMessages.length === 0 ? (
              <Text fontSize="sm" color="gray.400" px={3} py={3}>
                No conversation yet. Start by brainstorming or generating a
                design.
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                {conversationMessages.map((message) => {
                  const isAssistant = message.role === "assistant";
                  return (
                    <Box
                      key={message.id}
                      borderRadius="20px"
                      bg={isAssistant ? "white" : "orange.50"}
                      borderWidth="1px"
                      borderColor={
                        isAssistant ? "rgba(226, 232, 240, 0.9)" : "orange.100"
                      }
                      px={3}
                      py={3}
                    >
                      <Text
                        fontSize="10px"
                        fontWeight="800"
                        color={isAssistant ? "gray.500" : "orange.700"}
                        textTransform="uppercase"
                        letterSpacing="0.12em"
                        mb={1.5}
                      >
                        {isAssistant ? "AI" : "You"}
                      </Text>
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        lineHeight="1.7"
                        whiteSpace="pre-wrap"
                      >
                        {message.content}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </Box>

          {/* Input and controls at bottom */}
          <VStack align="stretch" gap={3} flexShrink={0}>
            {generationBrief && (
              <Textarea
                value={generationBrief}
                onChange={(event) =>
                  onGenerationBriefChange(event.target.value)
                }
                minH="110px"
                resize="vertical"
                borderRadius="22px"
                borderColor="rgba(148, 163, 184, 0.2)"
                bg="rgba(248,250,252,0.92)"
                fontSize="sm"
                lineHeight="1.7"
                placeholder="Edit the brief if needed..."
              />
            )}

            <Box
              position="relative"
              borderRadius="22px"
              borderWidth="1px"
              borderColor="rgba(148, 163, 184, 0.28)"
              bg="white"
              _focusWithin={{
                borderColor: "orange.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
              }}
            >
              <Textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                minH="120px"
                resize="vertical"
                border="none"
                bg="transparent"
                fontSize="sm"
                lineHeight="1.7"
                placeholder="Describe your design idea or ask the AI to refine the current direction. Example: 'Create a modern SaaS landing page with a hero section and pricing table' or 'Keep the same direction, but make it feel more premium'."
                disabled={isWorking}
                _focusVisible={{ outline: "none" }}
                _disabled={{
                  opacity: 0.6,
                  cursor: "not-allowed",
                  bg: "gray.50",
                }}
                pb="48px"
              />
              <HStack
                position="absolute"
                bottom="8px"
                left="12px"
                right="12px"
                justify="space-between"
              >
                <Box w="200px">
                  <ModelSelector
                    value={selectedModel}
                    onChange={onModelChange}
                    defaultLabel={defaultModelLabel}
                  />
                </Box>
                <Button
                  size="sm"
                  bg="gray.950"
                  color="white"
                  borderRadius="full"
                  _hover={{ bg: "black" }}
                  onClick={() => onGenerate("improve-latest")}
                  loading={isGenerating}
                  disabled={isWorking || isSubmitting || !prompt.trim()}
                >
                  <Wand2 size={14} />
                  Improve
                </Button>
              </HStack>
            </Box>
          </VStack>
        </VStack>
      )}

      {/* Files Tab Content */}
      {activeTab === "files" && (
        <VStack align="stretch" gap={3} p={4} flex={1} minH={0}>
          <HStack justify="space-between" align="center" px={2}>
            <Text
              fontSize="xs"
              fontWeight="800"
              color="gray.500"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Design Versions
            </Text>
            <Button
              size="xs"
              variant="outline"
              colorPalette="green"
              borderRadius="full"
              onClick={() => {
                onClearBrainstorm(true);
                onTabChange("brainstorm");
              }}
            >
              <Sparkles size={12} style={{ marginRight: 4 }} />
              New Version
            </Button>
          </HStack>

          <Box
            flex={1}
            minH={0}
            overflowY="auto"
            borderRadius="24px"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.9)"
            bg="rgba(248, 250, 252, 0.88)"
            p={2}
          >
            {versions.length === 0 ? (
              <Text fontSize="sm" color="gray.400" px={3} py={3}>
                No design versions yet. Generate your first design.
              </Text>
            ) : (
              <VStack align="stretch" gap={1}>
                {versions.map((item) => {
                  const selected = selectedUrl === item.url;
                  return (
                    <Box
                      key={item.id}
                      px={3}
                      py={3}
                      borderRadius="18px"
                      cursor="pointer"
                      bg={selected ? "orange.50" : "transparent"}
                      borderWidth="1px"
                      borderColor={selected ? "orange.200" : "transparent"}
                      onClick={() => onSelectUrl(item.url)}
                      _hover={{ bg: selected ? "orange.50" : "white" }}
                    >
                      <HStack justify="space-between">
                        <HStack gap={2}>
                          <Layers size={16} />
                          <Text
                            fontSize="sm"
                            fontWeight={selected ? "700" : "600"}
                            color={selected ? "orange.800" : "gray.700"}
                          >
                            {item.label}
                          </Text>
                        </HStack>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </Box>
        </VStack>
      )}

      {/* Brainstorm Tab Content */}
      {activeTab === "brainstorm" && (
        <VStack align="stretch" p={0} flex={1} minH={0} h="full">
          <DesignBrainstormChat
            messages={
              brainstormMessages.length > 0
                ? brainstormMessages
                : [
                    {
                      id: "welcome-brainstorm",
                      role: "assistant",
                      content:
                        "Hello! What aspect of your design would you like to brainstorm about today?",
                    },
                  ]
            }
            isThinking={isBrainstorming}
            pendingQuestion={brainstormPendingQuestion}
            onSendMessage={(msg) => {
              if (brainstormMessages.length === 0 && !isBrainstorming) {
                // user directly sends a message starting brainstorm
                onPromptChange(msg);
                onBrainstorm(msg);
              } else {
                onSendBrainstormResponse(msg);
              }
            }}
            onGenerate={() => onGenerate("new")}
            onStartOver={() => onClearBrainstorm(true)}
            taskError={null}
            model={brainstormTask?.model ?? null}
            brainstormComplete={brainstormComplete}
            isInSidebar={true}
          />
        </VStack>
      )}
    </Box>
  );
}
