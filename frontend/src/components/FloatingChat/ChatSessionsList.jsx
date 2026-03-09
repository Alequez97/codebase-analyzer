import { Box, HStack, Text, VStack, Spinner } from "@chakra-ui/react";
import { MessageSquare, Clock } from "lucide-react";
import { useAgentChatStore } from "../../store/useAgentChatStore";
import { SECTION_TYPES } from "../../constants/section-types";
import { TASK_TYPES } from "../../constants/task-types";

const SECTION_LABELS = {
  [SECTION_TYPES.DOCUMENTATION]: "Documentation",
  [SECTION_TYPES.REQUIREMENTS]: "Requirements",
  [SECTION_TYPES.DIAGRAMS]: "Diagrams",
  [SECTION_TYPES.BUGS_SECURITY]: "Bugs & Security",
  [SECTION_TYPES.REFACTORING_AND_TESTING]: "Testing",
  [TASK_TYPES.CUSTOM_CODEBASE_TASK]: "Custom Task",
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

/**
 * ChatSessionsList - Shows a list of past chat sessions for the selected section.
 * Rendered inside ChatPanel when showSessionsList=true.
 */
export function ChatSessionsList() {
  const {
    selectedTaskType,
    domainId,
    sessionsByKey,
    isLoadingSessions,
    loadHistoricalSession,
    _sectionKey,
    currentChatIdByKey,
  } = useAgentChatStore();

  const sectionKey =
    domainId && selectedTaskType
      ? _sectionKey(domainId, selectedTaskType)
      : null;
  const sessions = (sectionKey && sessionsByKey.get(sectionKey)) || [];
  const activeChatId = sectionKey ? currentChatIdByKey.get(sectionKey) : null;

  const label =
    SECTION_LABELS[selectedTaskType] || selectedTaskType || "Section";

  if (isLoadingSessions) {
    return (
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        <VStack gap={2}>
          <Spinner size="sm" color="blue.400" />
          <Text fontSize="xs" color="gray.400">
            Loading history…
          </Text>
        </VStack>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        <VStack gap={2}>
          <Clock size={24} color="var(--chakra-colors-gray-300)" />
          <Text fontSize="sm" color="gray.400" textAlign="center">
            No past {label} chats yet.
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} overflowY="auto" p={2}>
      <VStack gap={1} align="stretch">
        {sessions.map((session) => {
          const isActive = session.chatId === activeChatId;
          return (
            <Box
              key={session.chatId}
              px={3}
              py={2}
              borderRadius="lg"
              border="1px solid"
              borderColor={isActive ? "blue.200" : "gray.100"}
              bg={isActive ? "blue.50" : "white"}
              cursor="pointer"
              _hover={{
                bg: isActive ? "blue.50" : "gray.50",
                borderColor: isActive ? "blue.300" : "gray.200",
              }}
              transition="all 0.15s"
              onClick={() => loadHistoricalSession(session.chatId)}
            >
              <HStack gap={2} align="flex-start">
                <Box flexShrink={0} mt="2px">
                  <MessageSquare
                    size={13}
                    color={
                      isActive
                        ? "var(--chakra-colors-blue-500)"
                        : "var(--chakra-colors-gray-400)"
                    }
                  />
                </Box>
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="xs"
                    color={isActive ? "blue.700" : "gray.700"}
                    fontWeight={isActive ? "semibold" : "normal"}
                    lineClamp={2}
                    wordBreak="break-word"
                  >
                    {session.preview || "(no messages)"}
                  </Text>
                  <HStack gap={2} mt={1}>
                    <Text fontSize="xs" color="gray.400">
                      {session.messageCount} msg
                      {session.messageCount !== 1 ? "s" : ""}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      ·
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {formatDate(session.lastMessageAt)}
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
