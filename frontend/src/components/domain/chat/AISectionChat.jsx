import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  HStack,
  VStack,
  Textarea,
  Text,
  IconButton,
  Heading,
  Badge,
} from "@chakra-ui/react";
import {
  X,
  Send,
  Sparkles,
  User,
  Bot,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { Card } from "../../ui/card";
import MarkdownRenderer from "../../MarkdownRenderer";

/**
 * AISectionChat - Generic AI-powered chat interface for editing domain sections
 *
 * This reusable component provides an interactive chat experience where users can:
 * - View existing section content as context
 * - Chat with AI to request changes
 * - See AI suggestions in real-time
 * - Apply or discard changes
 *
 * Can be used for: Documentation, Requirements, Testing, Bugs/Security, etc.
 *
 * @param {string} sectionName - Display name (e.g., "Documentation", "Requirements")
 * @param {string} sectionType - Type identifier for API calls (e.g., "documentation", "requirements")
 * @param {object} currentContent - Current section content object
 * @param {string} contextDescription - Description shown in context banner
 * @param {string} initialGreeting - AI's initial greeting message
 * @param {array} samplePrompts - Array of sample prompt strings
 * @param {string} inputPlaceholder - Placeholder text for input field
 * @param {function} onClose - Callback when chat is closed
 * @param {function} onApplyChanges - Callback when user applies AI suggestions
 * @param {string} domainId - Domain ID for API calls
 *
 * UI MOCK - Backend implementation pending
 */
export default function AISectionChat({
  sectionName = "Section",
  sectionType = "section",
  currentContent = null,
  contextDescription = null,
  initialGreeting = "Hello! I'm your AI assistant. How can I help you improve this section?",
  samplePrompts = [
    "Add more detailed examples",
    "Make it more concise and clear",
    "Improve the structure",
    "Add more context",
    "Fix any inconsistencies",
  ],
  inputPlaceholder = "Ask AI to improve this section...",
  onClose,
  onApplyChanges,
  domainId,
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: initialGreeting,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // MOCK: Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `I understand you want to: "${userMessage.content}"\n\nHere's my suggested update to the ${sectionName.toLowerCase()}:\n\n---\n\n## Updated Section\n\nI've made the following improvements based on your request...\n\n*[This is a mock response. In production, this will call the backend AI service for ${sectionType}]*`,
        timestamp: new Date(),
        hasSuggestion: true, // Indicates this message contains a content update
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (messageId, content) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleApplySuggestion = (message) => {
    // MOCK: In production, this would extract the suggested content
    // and call the parent component's onApplyChanges
    console.log(`Apply ${sectionType} suggestion from message:`, message.id);

    // Mock: Show confirmation
    alert(
      `In production, this would apply the AI's suggested changes to your ${sectionName.toLowerCase()}.`,
    );
  };

  const handleReset = () => {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content: initialGreeting,
        timestamp: new Date(),
      },
    ]);
  };

  // Calculate context description
  const defaultContextDescription = currentContent
    ? `AI has access to your current ${sectionName.toLowerCase()} (${
        currentContent.content?.length || 0
      } characters)`
    : `AI will help you create ${sectionName.toLowerCase()}`;

  const displayContextDescription =
    contextDescription || defaultContextDescription;

  return (
    <Box
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      width={{ base: "100%", md: "600px" }}
      bg="white"
      boxShadow="2xl"
      zIndex={1000}
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <HStack
        px={6}
        py={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        justify="space-between"
        bg="gradient-to-r"
        bgGradient="to-r"
        gradientFrom="purple.50"
        gradientTo="blue.50"
      >
        <HStack gap={3}>
          <Box p={2} borderRadius="lg" bg="purple.100" color="purple.600">
            <Sparkles size={20} />
          </Box>
          <Box>
            <Heading size="md">Edit {sectionName} with AI</Heading>
            <Text fontSize="xs" color="gray.600">
              Chat with AI to improve your {sectionName.toLowerCase()}
            </Text>
          </Box>
        </HStack>
        <HStack gap={2}>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={handleReset}
            title="Reset conversation"
          >
            <RotateCcw size={16} />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onClose}
            title="Close chat"
          >
            <X size={18} />
          </IconButton>
        </HStack>
      </HStack>

      {/* Context Banner - Show current content */}
      {currentContent && (
        <Box
          px={6}
          py={3}
          bg="blue.50"
          borderBottom="1px solid"
          borderColor="blue.100"
        >
          <HStack gap={2}>
            <Badge colorPalette="blue" size="sm">
              Context
            </Badge>
            <Text fontSize="xs" color="gray.700">
              {displayContextDescription}
            </Text>
          </HStack>
        </Box>
      )}

      {/* Messages Area */}
      <Box flex={1} overflowY="auto" px={6} py={4} bg="gray.50">
        <VStack align="stretch" gap={4}>
          {messages.map((message) => (
            <Box
              key={message.id}
              alignSelf={message.role === "user" ? "flex-end" : "flex-start"}
              maxW="85%"
            >
              <Card.Root
                size="sm"
                bg={message.role === "user" ? "blue.500" : "white"}
                color={message.role === "user" ? "white" : "gray.800"}
                boxShadow="sm"
              >
                <Card.Body>
                  <HStack gap={2} mb={2} align="center">
                    {message.role === "assistant" ? (
                      <Box
                        p={1}
                        borderRadius="md"
                        bg="purple.100"
                        color="purple.600"
                      >
                        <Bot size={14} />
                      </Box>
                    ) : (
                      <Box p={1} borderRadius="md" bg="blue.400" color="white">
                        <User size={14} />
                      </Box>
                    )}
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      color={message.role === "user" ? "blue.100" : "gray.600"}
                    >
                      {message.role === "assistant" ? "AI Assistant" : "You"}
                    </Text>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      ml="auto"
                      onClick={() =>
                        handleCopyMessage(message.id, message.content)
                      }
                      title="Copy message"
                      color={message.role === "user" ? "white" : "gray.600"}
                    >
                      {copiedMessageId === message.id ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </IconButton>
                  </HStack>

                  {message.role === "assistant" ? (
                    <Box fontSize="sm" lineHeight="1.6">
                      <MarkdownRenderer content={message.content} />
                    </Box>
                  ) : (
                    <Text fontSize="sm" lineHeight="1.6" whiteSpace="pre-wrap">
                      {message.content}
                    </Text>
                  )}

                  {message.hasSuggestion && (
                    <Box
                      mt={3}
                      pt={3}
                      borderTop="1px solid"
                      borderColor="gray.200"
                    >
                      <Button
                        size="sm"
                        colorPalette="green"
                        variant="subtle"
                        onClick={() => handleApplySuggestion(message)}
                      >
                        <Check size={14} />
                        Apply this suggestion
                      </Button>
                    </Box>
                  )}
                </Card.Body>
              </Card.Root>
              <Text
                fontSize="xs"
                color="gray.500"
                mt={1}
                textAlign={message.role === "user" ? "right" : "left"}
              >
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </Box>
          ))}

          {isLoading && (
            <Box alignSelf="flex-start" maxW="85%">
              <Card.Root size="sm" bg="white" boxShadow="sm">
                <Card.Body>
                  <HStack gap={2}>
                    <Box
                      p={1}
                      borderRadius="md"
                      bg="purple.100"
                      color="purple.600"
                    >
                      <Bot size={14} />
                    </Box>
                    <Text fontSize="sm" color="gray.600">
                      AI is thinking...
                    </Text>
                  </HStack>
                </Card.Body>
              </Card.Root>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Area */}
      <Box
        px={6}
        py={4}
        borderTop="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <VStack gap={2} align="stretch">
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            rows={3}
            resize="none"
            disabled={isLoading}
          />
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">
              Press Enter to send, Shift+Enter for new line
            </Text>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              loading={isLoading}
            >
              <Send size={14} />
              Send
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Sample Prompts (shown when no messages yet) */}
      {messages.length <= 1 && samplePrompts.length > 0 && (
        <Box px={6} pb={4}>
          <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
            Try asking:
          </Text>
          <VStack align="stretch" gap={1}>
            {samplePrompts.map((prompt, index) => (
              <Button
                key={index}
                size="xs"
                variant="ghost"
                justifyContent="flex-start"
                onClick={() => setInputMessage(prompt)}
                fontSize="xs"
                color="blue.600"
              >
                💡 {prompt}
              </Button>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
