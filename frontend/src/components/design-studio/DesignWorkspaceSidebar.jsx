import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
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
import { DesignBrainstormChat } from "./DesignBrainstormChat";
import { DesignEditChat } from "./DesignEditChat";

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
  editTask,
  editMessages,
  editPendingQuestion,
  onStartEdit,
  onSendEditResponse,
  onClearEdit,
  isEditing,
  editTaskError,
}) {
  const isWorking =
    currentTask?.status === "running" || currentTask?.status === "pending";
  const isGenerating = isWorking && !isBrainstorming;

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
        <DesignEditChat
          editMessages={editMessages}
          editPendingQuestion={editPendingQuestion}
          onClearEdit={onClearEdit}
          onSendEditResponse={(msg) => {
            if (editMessages.length === 0 && !isEditing) {
              // User directly sends a message starting edit
              onStartEdit(msg);
            } else {
              onSendEditResponse(msg);
            }
          }}
          isEditing={isEditing}
          editTaskError={editTaskError}
          model={editTask?.model ?? null}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          defaultModelLabel={defaultModelLabel}
          isInSidebar={true}
        />
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
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            defaultModelLabel={defaultModelLabel}
          />
        </VStack>
      )}
    </Box>
  );
}
