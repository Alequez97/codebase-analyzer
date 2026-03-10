import { useRef, useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  Textarea,
  VStack,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  Bot,
  Send,
  Square,
  User,
  X,
  FileCode,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Info,
  SquarePen,
} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import { TaskSelector } from "./TaskSelector";
import { ChatSessionsList } from "./ChatSessionsList";
import { useAgentChatStore } from "../../store/useAgentChatStore";
import { SECTION_TYPES } from "../../constants/section-types";
import { TASK_TYPES } from "../../constants/task-types";

// ── Pure helper — computes panel CSS values from button position ─────────────
const PANEL_WIDTH = 420;
const PANEL_BTN_SIZE = 60;
const PANEL_GAP = 10;
const PANEL_SCREEN_PAD = 8;

function computePanelStyle(pos) {
  const panelLeft = Math.max(
    PANEL_SCREEN_PAD,
    Math.min(
      window.innerWidth - PANEL_WIDTH - PANEL_SCREEN_PAD,
      pos.x + PANEL_BTN_SIZE - PANEL_WIDTH,
    ),
  );
  const spaceAbove = pos.y - PANEL_SCREEN_PAD;
  const spaceBelow =
    window.innerHeight - (pos.y + PANEL_BTN_SIZE) - PANEL_SCREEN_PAD;
  const showAbove = spaceAbove > spaceBelow;
  return {
    left: panelLeft,
    top: showAbove ? undefined : pos.y + PANEL_BTN_SIZE + PANEL_GAP,
    bottom: showAbove ? window.innerHeight - pos.y + PANEL_GAP : undefined,
    maxHeight: Math.max(
      200,
      showAbove ? spaceAbove - PANEL_GAP : spaceBelow - PANEL_GAP,
    ),
  };
}
// ──────────────────────────────────────────────────────────────────────────────

const SECTION_LABELS = {
  [SECTION_TYPES.DOCUMENTATION]: "Documentation",
  [SECTION_TYPES.REQUIREMENTS]: "Requirements",
  [SECTION_TYPES.DIAGRAMS]: "Diagrams",
  [SECTION_TYPES.BUGS_SECURITY]: "Bugs & Security",
  [SECTION_TYPES.REFACTORING_AND_TESTING]: "Testing",
  [TASK_TYPES.CUSTOM_CODEBASE_TASK]: "Custom Task",
};

const SECTION_PROMPTS = {
  [SECTION_TYPES.DOCUMENTATION]: [
    "Add more detailed examples",
    "Make it more concise",
    "Add implementation notes",
  ],
  [SECTION_TYPES.REQUIREMENTS]: [
    "Add acceptance criteria",
    "Break down into sub-requirements",
    "Add edge cases",
  ],
  [SECTION_TYPES.DIAGRAMS]: [
    "Add a sequence diagram",
    "Update component relationships",
    "Add data flow diagram",
  ],
  [SECTION_TYPES.BUGS_SECURITY]: [
    "Summarize all critical issues",
    "Prioritize by severity",
    "Add mitigation steps",
  ],
  [SECTION_TYPES.REFACTORING_AND_TESTING]: [
    "Add missing edge case tests",
    "Improve test descriptions",
    "Add integration tests",
  ],
  [TASK_TYPES.CUSTOM_CODEBASE_TASK]: [
    "Rename TournamentSections to TournamentStages everywhere",
    "Add logging to all API endpoints",
    "Update all copyright years to 2026",
  ],
};

/**
 * ChatPanel - Sliding chat panel
 * Shows either the TaskSelector or the Chat Interface
 */
export function ChatPanel({ onClose, posRef, registerPositionUpdate }) {
  const {
    isOpen,
    selectedTaskType,
    domainId,
    currentTaskId,
    currentChatIdByKey,
    messagesByChatId,
    chatStateById,
    pendingInputPrefill,
    clearPendingInputPrefill,
    selectTaskType,
    backToSelector,
    sendMessage,
    cancelCurrentTask,
    clearChat,
    showSessionsList,
    openSectionHistory,
    closeSessionsList,
  } = useAgentChatStore();

  // For section chats the messages live under the stable chatId (UUID), not the
  // ephemeral taskId.  For custom tasks the messages live under currentTaskId.
  const activeChatId =
    selectedTaskType &&
    selectedTaskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK &&
    domainId
      ? currentChatIdByKey.get(`${domainId}_${selectedTaskType}`) ||
        currentTaskId
      : currentTaskId;

  const messages = messagesByChatId.get(activeChatId) || [];
  const chatState = chatStateById.get(activeChatId) || {};
  const isAiWorking = chatState.isWorking ?? false;
  const isAiThinking = chatState.isThinking ?? false;
  const isAwaitingResponse = chatState.isAwaitingResponse ?? false;
  const aiProgressMessage = chatState.message ?? null;
  const aiProgressStage = chatState.stage ?? null;

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset input on task type change
  useEffect(() => {
    setInputValue("");
  }, [selectedTaskType]);

  // Consume a pending prefill message seeded by openChatForTest.
  // Runs after selectedTaskType is set so the input area is visible.
  useEffect(() => {
    if (selectedTaskType && pendingInputPrefill) {
      setInputValue(pendingInputPrefill);
      clearPendingInputPrefill();
      // Give the textarea a tick to mount/unmount before focusing
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [selectedTaskType, pendingInputPrefill]);

  const handleSelectTask = (taskType, prefillPrompt = null) => {
    selectTaskType(taskType);
    if (prefillPrompt) {
      setInputValue(prefillPrompt);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isAiWorking) return;
    const msg = inputValue.trim();
    setInputValue("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Ref to the panel DOM node for imperative position updates during drag
  const panelRef = useRef(null);

  // Register imperative updater with parent — called on every drag mousemove
  // without triggering any React re-renders
  useEffect(() => {
    registerPositionUpdate((pos) => {
      const el = panelRef.current;
      if (!el) return;
      const s = computePanelStyle(pos);
      el.style.left = `${s.left}px`;
      el.style.height = `${s.maxHeight}px`;
      if (s.top !== undefined) {
        el.style.top = `${s.top}px`;
        el.style.bottom = "";
      } else {
        el.style.bottom = `${s.bottom}px`;
        el.style.top = "";
      }
    });
    return () => registerPositionUpdate(null);
  }, [registerPositionUpdate]);

  if (!isOpen) return null;

  // Initial position — rendered once from posRef, then updated via DOM ref
  const initStyle = computePanelStyle(posRef.current);

  return (
    <Box
      ref={panelRef}
      position="fixed"
      style={{
        left: `${initStyle.left}px`,
        top: initStyle.top !== undefined ? `${initStyle.top}px` : "",
        bottom: initStyle.bottom !== undefined ? `${initStyle.bottom}px` : "",
        width: `${PANEL_WIDTH}px`,
        height: `${initStyle.maxHeight}px`,
      }}
      bg="white"
      borderRadius="xl"
      boxShadow="2xl"
      border="1px solid"
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
      zIndex={1000}
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        bg="gray.50"
        borderBottom="1px solid"
        borderColor="gray.200"
        justify="space-between"
      >
        <HStack gap={2}>
          {selectedTaskType && (
            <IconButton
              size="xs"
              variant="ghost"
              onClick={backToSelector}
              aria-label="Back"
            >
              <ArrowLeft size={14} />
            </IconButton>
          )}
          <Bot size={16} />
          <Text fontWeight="semibold" fontSize="sm">
            {selectedTaskType
              ? SECTION_LABELS[selectedTaskType] || selectedTaskType
              : "Agent Chat"}
          </Text>
          {isAiWorking && (
            <Badge colorScheme="blue" fontSize="xs" variant="subtle">
              Working…
            </Badge>
          )}
          {isAwaitingResponse && (
            <Badge colorScheme="orange" fontSize="xs" variant="subtle">
              Awaiting your reply
            </Badge>
          )}
        </HStack>
        <HStack gap={1}>
          {selectedTaskType && !isAiWorking && !showSessionsList && (
            <IconButton
              size="xs"
              variant="ghost"
              onClick={clearChat}
              aria-label="New chat"
              title="Start new chat"
            >
              <SquarePen size={14} />
            </IconButton>
          )}
          <IconButton
            size="xs"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </IconButton>
        </HStack>
      </HStack>

      {/* Body */}
      <Box flex={1} overflowY="auto" p={3}>
        {!selectedTaskType ? (
          <TaskSelector
            onSelect={handleSelectTask}
            onShowHistory={openSectionHistory}
          />
        ) : showSessionsList ? (
          <ChatSessionsList />
        ) : (
          <VStack gap={2} align="stretch">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isAiThinking && (
              <ThinkingIndicator
                message={aiProgressMessage}
                stage={aiProgressStage}
              />
            )}
            <div ref={messagesEndRef} />
          </VStack>
        )}
      </Box>

      {/* Sample prompts (only in chat mode, no active AI working, not custom task) */}
      {selectedTaskType &&
        selectedTaskType !== TASK_TYPES.CUSTOM_CODEBASE_TASK &&
        !showSessionsList &&
        !isAiWorking &&
        messages.length <= 1 && (
          <Box
            px={3}
            pb={2}
            borderTop="1px solid"
            borderColor="gray.100"
            pt={2}
          >
            <Text fontSize="xs" color="gray.400" mb={1}>
              Try:
            </Text>
            <HStack gap={1} flexWrap="wrap">
              {(SECTION_PROMPTS[selectedTaskType] || []).map((prompt) => (
                <Button
                  key={prompt}
                  size="xs"
                  variant="outline"
                  borderRadius="full"
                  onClick={() => setInputValue(prompt)}
                  _hover={{ bg: "blue.50" }}
                  maxWidth="180px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {prompt}
                </Button>
              ))}
            </HStack>
          </Box>
        )}

      {/* Input area */}
      {selectedTaskType && !showSessionsList && (
        <Box px={3} py={3} borderTop="1px solid" borderColor="gray.200">
          <HStack gap={2} align="flex-end">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAwaitingResponse
                  ? "Type A or B to resolve the conflict…"
                  : selectedTaskType === TASK_TYPES.CUSTOM_CODEBASE_TASK
                    ? "Describe what you want to change…"
                    : "Ask AI to improve this section…"
              }
              size="sm"
              minH="60px"
              maxH="120px"
              resize="none"
              flex={1}
              disabled={isAiWorking && !isAwaitingResponse}
              borderRadius="lg"
            />
            <VStack gap={1}>
              {isAiWorking ? (
                <IconButton
                  size="sm"
                  colorScheme="red"
                  variant="solid"
                  onClick={cancelCurrentTask}
                  title="Cancel task"
                  aria-label="Cancel"
                >
                  <Square size={14} />
                </IconButton>
              ) : (
                <IconButton
                  size="sm"
                  colorScheme="blue"
                  disabled={!inputValue.trim()}
                  onClick={handleSend}
                  aria-label="Send"
                >
                  <Send size={14} />
                </IconButton>
              )}
            </VStack>
          </HStack>
          {isAiWorking && !isAwaitingResponse && (
            <Text fontSize="xs" color="gray.400" mt={1}>
              AI is working… Use the stop button to cancel.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <HStack
        gap={2}
        px={3}
        py={2}
        bg={
          message.isError
            ? "red.50"
            : message.isWarning
              ? "orange.50"
              : "gray.50"
        }
        borderRadius="md"
        border="1px solid"
        borderColor={
          message.isError
            ? "red.200"
            : message.isWarning
              ? "orange.200"
              : "gray.200"
        }
      >
        {message.isError ? (
          <AlertTriangle size={13} color="var(--chakra-colors-red-500)" />
        ) : message.isWarning ? (
          <AlertTriangle size={13} color="var(--chakra-colors-orange-500)" />
        ) : (
          <Info size={13} color="var(--chakra-colors-gray-400)" />
        )}
        <Text
          fontSize="xs"
          color={
            message.isError
              ? "red.700"
              : message.isWarning
                ? "orange.700"
                : "gray.600"
          }
        >
          {message.content}
        </Text>
      </HStack>
    );
  }

  return (
    <HStack
      gap={2}
      align="flex-start"
      flexDirection={isUser ? "row-reverse" : "row"}
    >
      <Box
        flexShrink={0}
        w={6}
        h={6}
        borderRadius="full"
        bg={isUser ? "blue.500" : "gray.100"}
        display="flex"
        alignItems="center"
        justifyContent="center"
        mt={0.5}
      >
        {isUser ? (
          <User size={12} color="white" />
        ) : (
          <Bot size={12} color="var(--chakra-colors-gray-500)" />
        )}
      </Box>
      <Box
        maxWidth="85%"
        px={3}
        py={2}
        bg={isUser ? "blue.500" : message.isError ? "red.50" : "gray.100"}
        color={isUser ? "white" : message.isError ? "red.700" : "gray.800"}
        borderRadius={isUser ? "xl" : "xl"}
        borderTopRightRadius={isUser ? "sm" : "xl"}
        borderTopLeftRadius={isUser ? "xl" : "sm"}
        fontSize="sm"
      >
        {isUser ? (
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {message.content}
          </Text>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </Box>
    </HStack>
  );
}

function ThinkingIndicator({ message, stage }) {
  const label = message || "AI is thinking…";
  return (
    <HStack gap={2} align="center">
      <Box
        w={6}
        h={6}
        borderRadius="full"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Bot size={12} color="var(--chakra-colors-gray-500)" />
      </Box>
      <HStack
        gap={2}
        px={3}
        py={2}
        bg="gray.100"
        borderRadius="xl"
        borderTopLeftRadius="sm"
        maxWidth="260px"
      >
        <Spinner size="xs" color="blue.400" flexShrink={0} />
        <Text
          fontSize="xs"
          color={message ? "blue.600" : "gray.500"}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={label}
        >
          {label}
        </Text>
      </HStack>
    </HStack>
  );
}
