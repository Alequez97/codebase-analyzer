import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Layers, MessageSquare, Sparkles, X } from "lucide-react";
import { DesignAssistantChat } from "./DesignAssistantChat";

export function DesignWorkspaceSidebar({
  versions,
  selectedUrl,
  onSelectUrl,
  selectedModel,
  onModelChange,
  defaultModelLabel,
  activeTab,
  onTabChange,
  onClose,
  editTask,
  editTaskId,
  editMessages,
  editSessions,
  loadingEditSessions,
  editPendingQuestion,
  onStartEdit,
  onSendEditResponse,
  onOpenEditHistory,
  onRefreshEditHistory,
  onClearEdit,
  isEditing,
  editTaskError,
}) {
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

      {activeTab === "chat" && (
        <DesignAssistantChat
          editMessages={editMessages}
          editPendingQuestion={editPendingQuestion}
          onClearEdit={onClearEdit}
          onSendEditResponse={(msg) => {
            const hasActiveEditTask = Boolean(editTaskId) || Boolean(editTask);
            const shouldStartEditTask =
              !isEditing && !editPendingQuestion && !hasActiveEditTask;

            if (shouldStartEditTask) {
              onStartEdit(msg);
            } else {
              onSendEditResponse(msg);
            }
          }}
          isEditing={isEditing}
          editTaskError={editTaskError}
          editSessions={editSessions}
          loadingEditSessions={loadingEditSessions}
          onOpenHistory={onOpenEditHistory}
          onRefreshHistory={onRefreshEditHistory}
          model={editTask?.model ?? null}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          defaultModelLabel={defaultModelLabel}
          isInSidebar={true}
        />
      )}

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
                onClearEdit();
                onTabChange("chat");
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
    </Box>
  );
}
