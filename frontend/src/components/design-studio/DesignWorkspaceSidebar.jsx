import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
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
  const [expandedVersionIds, setExpandedVersionIds] = useState(() => {
    // Auto-expand the version whose page (or entry url) is currently selected
    return new Set();
  });

  function toggleVersion(versionId) {
    setExpandedVersionIds((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  }

  function isVersionSelected(version) {
    if (selectedUrl === version.url) return true;
    return version.pages?.some((page) => page.url === selectedUrl) ?? false;
  }
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
                  const hasPages = item.pages?.length > 0;
                  const isExpanded = expandedVersionIds.has(item.id);
                  const versionActive = isVersionSelected(item);

                  return (
                    <Box key={item.id}>
                      {/* Version row */}
                      <HStack
                        px={3}
                        py={2.5}
                        borderRadius="18px"
                        cursor="pointer"
                        bg={
                          versionActive && !hasPages
                            ? "orange.50"
                            : "transparent"
                        }
                        borderWidth="1px"
                        borderColor={
                          versionActive && !hasPages
                            ? "orange.200"
                            : "transparent"
                        }
                        onClick={() => {
                          if (hasPages) {
                            toggleVersion(item.id);
                          } else {
                            onSelectUrl(item.url);
                          }
                        }}
                        _hover={{
                          bg:
                            versionActive && !hasPages ? "orange.50" : "white",
                        }}
                        justify="space-between"
                      >
                        <HStack gap={2}>
                          <Layers
                            size={16}
                            color={
                              versionActive
                                ? "var(--chakra-colors-orange-600)"
                                : undefined
                            }
                          />
                          <Text
                            fontSize="sm"
                            fontWeight={versionActive ? "700" : "600"}
                            color={versionActive ? "orange.800" : "gray.700"}
                          >
                            {item.label}
                          </Text>
                          {hasPages && (
                            <Text
                              fontSize="xs"
                              color="gray.400"
                              fontWeight="500"
                            >
                              {item.pages.length}{" "}
                              {item.pages.length === 1 ? "page" : "pages"}
                            </Text>
                          )}
                        </HStack>
                        {hasPages &&
                          (isExpanded ? (
                            <ChevronDown
                              size={14}
                              color="var(--chakra-colors-gray-400)"
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              color="var(--chakra-colors-gray-400)"
                            />
                          ))}
                      </HStack>

                      {/* Pages sub-list */}
                      {hasPages && isExpanded && (
                        <VStack
                          align="stretch"
                          gap={0.5}
                          pl={4}
                          pt={0.5}
                          pb={1}
                        >
                          {item.pages.map((page) => {
                            const pageSelected = selectedUrl === page.url;
                            return (
                              <HStack
                                key={page.id}
                                px={3}
                                py={2}
                                borderRadius="14px"
                                cursor="pointer"
                                bg={pageSelected ? "orange.50" : "transparent"}
                                borderWidth="1px"
                                borderColor={
                                  pageSelected ? "orange.200" : "transparent"
                                }
                                onClick={() => onSelectUrl(page.url)}
                                _hover={{
                                  bg: pageSelected ? "orange.50" : "gray.50",
                                }}
                                gap={2}
                              >
                                <FileText
                                  size={13}
                                  color={
                                    pageSelected
                                      ? "var(--chakra-colors-orange-600)"
                                      : "var(--chakra-colors-gray-400)"
                                  }
                                />
                                <VStack align="start" gap={0} flex={1}>
                                  <Text
                                    fontSize="sm"
                                    fontWeight={pageSelected ? "700" : "500"}
                                    color={
                                      pageSelected ? "orange.800" : "gray.600"
                                    }
                                    lineHeight="1.3"
                                  >
                                    {page.name}
                                  </Text>
                                  {page.route && (
                                    <Text
                                      fontSize="10px"
                                      color="gray.400"
                                      fontFamily="mono"
                                    >
                                      {page.route}
                                    </Text>
                                  )}
                                </VStack>
                              </HStack>
                            );
                          })}
                        </VStack>
                      )}
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
