import {
  Box,
  Button,
  Center,
  HStack,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { CheckSquare, History, Plus, RefreshCw, Send, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ModelSelector } from "../FloatingChat/ModelSelector";
import { DesignTechnologySelector } from "./DesignTechnologySelector";

const DOT_DELAY = ["0s", "0.18s", "0.36s"];
const EDIT_CHAT_STARTER_MESSAGE =
  "I can help improve your design, discuss best practices, or create a new version. What should we do?";

function ThinkingDots() {
  return (
    <Box
      alignSelf="flex-start"
      display="flex"
      gap={1.5}
      px={4}
      py={3}
      borderRadius="20px 20px 20px 6px"
      bg="white"
      borderWidth="1px"
      borderColor="rgba(226,232,240,0.9)"
    >
      {DOT_DELAY.map((delay, i) => (
        <Box
          key={i}
          w="7px"
          h="7px"
          borderRadius="full"
          bg="gray.300"
          sx={{
            "@keyframes thinkBounce": {
              "0%, 100%": { transform: "translateY(0)", opacity: 0.5 },
              "50%": { transform: "translateY(-5px)", opacity: 1 },
            },
            animation: `thinkBounce 1s ease infinite`,
            animationDelay: delay,
          }}
        />
      ))}
    </Box>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <Box
      alignSelf={isUser ? "flex-end" : "flex-start"}
      maxW="85%"
      borderRadius={isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px"}
      bg={isUser ? "gray.900" : "white"}
      color={isUser ? "white" : "gray.800"}
      borderWidth={isUser ? 0 : "1px"}
      borderColor="rgba(226,232,240,0.9)"
      px={4}
      py={3}
      fontSize="sm"
      lineHeight="1.75"
      sx={{
        "& p": { margin: 0, marginBottom: "0.5em" },
        "& p:last-child": { marginBottom: 0 },
        "& ul, & ol": { paddingLeft: "1.4em", margin: "0.4em 0" },
        "& li": { marginBottom: "0.25em" },
        "& strong": { fontWeight: 700 },
        "& h1, & h2, & h3": {
          fontWeight: 700,
          marginBottom: "0.4em",
          marginTop: "0.6em",
        },
        "& h3": { fontSize: "0.95em" },
        "& code": {
          bg: isUser ? "whiteAlpha.300" : "gray.100",
          px: 1,
          borderRadius: "4px",
          fontSize: "0.85em",
        },
        "& pre": {
          bg: isUser ? "whiteAlpha.200" : "gray.50",
          borderRadius: "8px",
          p: 3,
          my: 2,
          overflow: "auto",
        },
      }}
    >
      {isUser ? (
        <Text whiteSpace="pre-wrap">{message.content}</Text>
      ) : (
        <ReactMarkdown>{message.content}</ReactMarkdown>
      )}
    </Box>
  );
}

function parseColorOption(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.colors) && parsed.colors.length > 0) {
      return parsed;
    }
  } catch (error) {
    void error;
  }
  return null;
}

function OptionButton({ opt, isSelected, isMultiple, onClick }) {
  const colorData = parseColorOption(opt);
  const label = colorData ? colorData.label : opt;
  const description = colorData?.description ?? null;
  const colors = colorData?.colors ?? [];

  return (
    <Button
      variant="outline"
      justifyContent="flex-start"
      textAlign="left"
      whiteSpace="normal"
      h="auto"
      py={2.5}
      px={4}
      borderRadius="14px"
      fontSize="sm"
      fontWeight={isSelected ? 700 : 400}
      borderColor={isSelected ? "blue.400" : "rgba(148,163,184,0.35)"}
      bg={isSelected ? "blue.50" : "white"}
      color={isSelected ? "blue.700" : "gray.700"}
      _hover={{ borderColor: "blue.300", bg: "blue.50", color: "blue.700" }}
      onClick={onClick}
    >
      {isMultiple && (
        <Box
          mr={2.5}
          color={isSelected ? "blue.500" : "gray.400"}
          flexShrink={0}
        >
          {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
        </Box>
      )}
      <HStack gap={3} align="center" flex={1}>
        {colors.length > 0 && (
          <HStack gap={1} flexShrink={0}>
            {colors.map((hex) => (
              <Box
                key={hex}
                w="18px"
                h="18px"
                borderRadius="5px"
                bg={hex}
                borderWidth="1px"
                borderColor="rgba(0,0,0,0.12)"
                flexShrink={0}
              />
            ))}
          </HStack>
        )}
        <Box>
          <Text
            fontSize="sm"
            fontWeight={isSelected ? 700 : 500}
            lineHeight="1.4"
          >
            {label}
          </Text>
          {description && (
            <Text
              fontSize="xs"
              color={isSelected ? "blue.500" : "gray.400"}
              fontWeight={400}
              lineHeight="1.4"
              mt={0.5}
            >
              {description}
            </Text>
          )}
        </Box>
      </HStack>
    </Button>
  );
}

function QuestionWithOptions({ pendingQuestion, onSend }) {
  const { user_options, selectionType } = pendingQuestion;
  const isMultiple = selectionType === "multiple";
  const [selected, setSelected] = useState([]);

  const isColorQuestion = user_options.every(
    (opt) => parseColorOption(opt) !== null,
  );

  const toggleOption = (opt) => {
    if (isMultiple) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
      );
    } else {
      const colorData = parseColorOption(opt);
      onSend(colorData ? colorData.label : opt);
    }
  };

  const confirmMultiple = () => {
    if (selected.length === 0) return;
    const labels = selected.map((opt) => {
      const colorData = parseColorOption(opt);
      return colorData ? colorData.label : opt;
    });
    onSend(labels.join(", "));
  };

  return (
    <VStack align="stretch" gap={2} alignSelf="flex-end" maxW="90%">
      {user_options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <OptionButton
            key={opt}
            opt={opt}
            isSelected={isSelected}
            isMultiple={isMultiple}
            onClick={() => toggleOption(opt)}
          />
        );
      })}

      <HStack justify="flex-end" gap={2} mt={1}>
        {isColorQuestion && (
          <Button
            size="sm"
            variant="ghost"
            borderRadius="full"
            px={3}
            color="gray.500"
            _hover={{ bg: "gray.100", color: "gray.700" }}
            onClick={() => onSend("Suggest other color palettes")}
          >
            <RefreshCw size={13} />
            Suggest others
          </Button>
        )}
        {isMultiple && (
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            borderRadius="full"
            px={5}
            disabled={selected.length === 0}
            _hover={{ bg: "black" }}
            _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
            onClick={confirmMultiple}
          >
            Confirm selection
          </Button>
        )}
      </HStack>
    </VStack>
  );
}

export function DesignEditChat({
  editMessages = [],
  editSessions = [],
  loadingEditSessions = false,
  isEditing,
  editPendingQuestion,
  onSendEditResponse,
  onClearEdit,
  onOpenHistory,
  onRefreshHistory,
  editTaskError,
  model,
  isInSidebar = false,
  selectedModel = null,
  selectedTechnology = null,
  onModelChange = null,
  onTechnologyChange = null,
  defaultModelLabel = null,
}) {
  const [input, setInput] = useState("");
  const [historyMode, setHistoryMode] = useState(false);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [editMessages, isEditing, editPendingQuestion]);

  useEffect(() => {
    if (editMessages.length === 0) {
      setHistoryMode(false);
      setHasStartedConversation(false);
      return;
    }
    setHasStartedConversation(true);
  }, [editMessages.length]);

  useEffect(() => {
    if (isEditing || editPendingQuestion) {
      setHasStartedConversation(true);
    }
  }, [isEditing, editPendingQuestion]);

  const displayedMessages = editMessages;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setHasStartedConversation(true);
    onSendEditResponse(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = editPendingQuestion
    ? "Or type a free-form reply..."
    : "Tell us about the design...";
  const starterAssistantMessage = {
    id: "starter-assistant-message",
    role: "assistant",
    content: EDIT_CHAT_STARTER_MESSAGE,
  };

  return (
    <Box
      w="full"
      maxW={isInSidebar ? "none" : "820px"}
      display="flex"
      flexDirection="column"
      h={isInSidebar ? "full" : "calc(100vh - 120px)"}
      borderRadius={isInSidebar ? "0" : "32px"}
      bg={isInSidebar ? "transparent" : "rgba(255,255,255,0.88)"}
      borderWidth={isInSidebar ? "0" : "1px"}
      borderColor={isInSidebar ? "transparent" : "rgba(148,163,184,0.24)"}
      boxShadow={isInSidebar ? "none" : "0 35px 90px rgba(15,23,42,0.1)"}
      backdropFilter={isInSidebar ? "none" : "blur(18px)"}
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        px={5}
        py={4}
        borderBottomWidth="1px"
        borderColor="rgba(226,232,240,0.9)"
        flexShrink={0}
      >
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            borderRadius="full"
            color="gray.500"
            px={3}
            onClick={() => {
              if (!historyMode && onRefreshHistory) {
                onRefreshHistory();
              }
              setHistoryMode((prev) => !prev);
            }}
            bg={historyMode ? "orange.50" : "transparent"}
            borderWidth="1px"
            borderColor={historyMode ? "orange.200" : "transparent"}
            _hover={{ bg: historyMode ? "orange.50" : "gray.100", color: "gray.800" }}
          >
            <History size={14} />
            History
          </Button>
          {isEditing && (
            <HStack gap={1.5} color="gray.400">
              <Spinner size="xs" />
              <Text fontSize="xs">Thinking...</Text>
            </HStack>
          )}
          {model && !isEditing && (
            <Box
              px={2.5}
              py={0.5}
              borderRadius="full"
              bg="gray.100"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Text
                fontSize="11px"
                fontWeight="600"
                color="gray.500"
                letterSpacing="0.01em"
              >
                {model}
              </Text>
            </Box>
          )}
        </HStack>

        <Button
          variant="ghost"
          size="sm"
          borderRadius="full"
          color="gray.500"
          px={3}
          onClick={() => {
            setHistoryMode(false);
            setHasStartedConversation(false);
            onClearEdit();
          }}
          _hover={{ bg: "gray.100", color: "gray.800" }}
        >
          <Plus size={15} />
          New Conversation
        </Button>
      </HStack>

      {/* Messages */}
      {historyMode ? (
        <VStack
          align="stretch"
          gap={2}
          flex={1}
          overflowY="auto"
          px={4}
          py={4}
          sx={{
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-track": { bg: "transparent" },
            "&::-webkit-scrollbar-thumb": { bg: "gray.200", borderRadius: "full" },
          }}
        >
          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" px={2}>
            Previous Chats
          </Text>
          {loadingEditSessions ? (
            <Center py={8}>
              <Spinner size="sm" />
            </Center>
          ) : editSessions.length === 0 ? (
            <Center py={8}>
              <Text fontSize="sm" color="gray.500">
                No previous edit chats
              </Text>
            </Center>
          ) : (
            <VStack align="stretch" gap={1}>
              {editSessions.map((session) => (
                <Button
                  key={session.id}
                  variant="ghost"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  h="auto"
                  py={3}
                  px={3}
                  borderRadius="12px"
                  onClick={() => {
                    onOpenHistory?.(session.id);
                    setHasStartedConversation(true);
                    setHistoryMode(false);
                  }}
                >
                  <Box textAlign="left" maxW="80%">
                    <Text fontSize="sm" color="gray.700" fontWeight="600" lineClamp={1}>
                      {session.title || "Untitled conversation"}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {new Date(session.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="gray.400" textTransform="capitalize">
                    {session.status}
                  </Text>
                </Button>
              ))}
            </VStack>
          )}
        </VStack>
      ) : !hasStartedConversation && editMessages.length === 0 ? (
        <VStack align="stretch" gap={3} flex={1} overflowY="auto" px={6} py={5}>
          <MessageBubble message={starterAssistantMessage} />
        </VStack>
      ) : (
        <VStack
          ref={scrollRef}
          align="stretch"
          gap={3}
          flex={1}
          overflowY="auto"
          px={6}
          py={5}
          sx={{
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-track": { bg: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              bg: "gray.200",
              borderRadius: "full",
            },
          }}
        >
          {displayedMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isEditing && !editPendingQuestion && <ThinkingDots />}
          {editPendingQuestion?.user_options?.length > 0 && (
            <QuestionWithOptions
              pendingQuestion={editPendingQuestion}
              onSend={onSendEditResponse}
            />
          )}
          {editTaskError && (
            <Box
              alignSelf="flex-start"
              maxW="85%"
              borderRadius="20px"
              bg="red.50"
              borderWidth="1px"
              borderColor="red.100"
              px={4}
              py={3}
            >
              <Text fontSize="sm" color="red.700">
                {editTaskError}
              </Text>
            </Box>
          )}
        </VStack>
      )}

      {/* Input */}
      <Box
        px={5}
        py={4}
        borderTopWidth="1px"
        borderColor="rgba(226,232,240,0.9)"
        flexShrink={0}
      >
        <Box
          borderRadius="18px"
          borderWidth="1px"
          borderColor="rgba(148,163,184,0.3)"
          bg="white"
          overflow="hidden"
          _focusWithin={{
            borderColor: "orange.400",
            boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
          }}
        >
          <Box position="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              minH="80px"
              maxH="140px"
              resize="none"
              borderRadius="0"
              borderWidth="0"
              bg="transparent"
              px={4}
              pr="72px"
              pt={4}
              pb={3}
              fontSize="sm"
              _focusVisible={{
                boxShadow: "none",
              }}
            />
            <Button
              position="absolute"
              right={3}
              bottom={3}
              onClick={handleSend}
              disabled={historyMode || !input.trim()}
              bg="gray.900"
              color="white"
              borderRadius="14px"
              h="40px"
              minW="40px"
              px={0}
              _hover={{ bg: "black" }}
              _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              <Send size={16} />
            </Button>
          </Box>
          {(onModelChange || onTechnologyChange) && (
            <HStack
              px={3}
              py={2}
              borderTopWidth="1px"
              borderColor="rgba(226,232,240,0.9)"
              align="center"
              justify="space-between"
              gap={3}
              flexWrap="wrap"
            >
              {onTechnologyChange && selectedTechnology && (
                <DesignTechnologySelector
                  value={selectedTechnology}
                  onChange={onTechnologyChange}
                />
              )}
              {onModelChange && (
                <Box flex="1" minW="220px" maxW="280px" ml="auto">
                  <ModelSelector
                    value={selectedModel}
                    onChange={onModelChange}
                    defaultLabel={defaultModelLabel}
                  />
                </Box>
              )}
            </HStack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
