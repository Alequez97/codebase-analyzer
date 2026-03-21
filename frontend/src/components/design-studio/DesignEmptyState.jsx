import { Box, Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { Lightbulb, Sparkles, Wand2 } from "lucide-react";
import { DesignBrainstormChat } from "./DesignBrainstormChat";
import { ModelSelector } from "../FloatingChat/ModelSelector";

export function DesignEmptyState({
  prompt,
  onPromptChange,
  generationBrief,
  onGenerationBriefChange,
  onBrainstorm,
  onGenerate,
  isSubmitting,
  currentTask,
  taskMessages,
  taskError,
  selectedModel,
  onModelChange,
  defaultModelLabel,
  pendingQuestion,
  onSendUserResponse,
  onStartOver,
  currentTaskModel,
  brainstormComplete,
}) {
  const hasApprovedBrief = Boolean(generationBrief?.trim());
  const isWorking =
    currentTask?.status === "running" || currentTask?.status === "pending";
  const conversationMessages = taskMessages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.content?.trim(),
  );
  const isBrainstormMode =
    currentTask?.type === "design-brainstorm" ||
    conversationMessages.length > 0;

  // Route a message from the chat input: if pending question → reply to agent,
  // otherwise treat it as a follow-up brainstorm prompt.
  const handleChatMessage = async (text) => {
    if (pendingQuestion) {
      await onSendUserResponse(text);
    } else {
      onPromptChange(text);
      await onBrainstorm();
    }
  };

  const bg = "linear-gradient(180deg, #fffaf3 0%, #f7fbff 44%, #eef5ff 100%)";

  // ── Brainstorm chat view ──────────────────────────────────────────────────
  if (isBrainstormMode) {
    return (
      <Box
        minH="calc(100vh - 49px)"
        bg={bg}
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 8 }}
        py={6}
      >
        <DesignBrainstormChat
          messages={conversationMessages}
          isThinking={isWorking}
          pendingQuestion={pendingQuestion}
          onSendMessage={handleChatMessage}
          onGenerate={onGenerate}
          onStartOver={onStartOver}
          taskError={taskError}
          model={currentTaskModel}
          brainstormComplete={brainstormComplete}
        />
      </Box>
    );
  }

  // ── Setup / idle form view ────────────────────────────────────────────────
  return (
    <Box
      minH="calc(100vh - 49px)"
      bg={bg}
      position="relative"
      overflow="hidden"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 14 }}
    >
      <Box
        position="absolute"
        top="-120px"
        right="-80px"
        w="360px"
        h="360px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(251,191,36,0.26) 0%, rgba(251,191,36,0) 70%)"
      />
      <Box
        position="absolute"
        bottom="-160px"
        left="-120px"
        w="420px"
        h="420px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 72%)"
      />

      <VStack gap={8} justify="center" minH="calc(100vh - 140px)">
        <VStack gap={4} textAlign="center" maxW="780px">
          <Text
            fontSize={{ base: "4xl", md: "6xl" }}
            lineHeight={{ base: "1.02", md: "0.96" }}
            letterSpacing="-0.06em"
            fontWeight="700"
            fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
            color="gray.900"
          >
            What should we design next?
          </Text>
        </VStack>

        <Box
          w="full"
          maxW="820px"
          borderRadius="32px"
          bg="rgba(255,255,255,0.82)"
          borderWidth="1px"
          borderColor="rgba(148, 163, 184, 0.24)"
          boxShadow="0 35px 90px rgba(15, 23, 42, 0.1)"
          backdropFilter="blur(18px)"
          overflow="hidden"
        >
          <VStack align="stretch" gap={0}>
            <Box px={6} py={5}>
              <HStack gap={3} mb={4} align="start">
                <Box
                  w="42px"
                  h="42px"
                  borderRadius="16px"
                  bg="orange.100"
                  color="orange.700"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Sparkles size={18} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontSize="lg" fontWeight="900" color="gray.900">
                    Start from a strong direction
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Be specific about the audience, vibe, and what should feel
                    unforgettable.
                  </Text>
                </VStack>
              </HStack>

              <Textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                minH="180px"
                resize="vertical"
                placeholder="Describe the product, screen, or experience you want. The first AI pass sharpens the direction, then turns it into something tangible you can review and refine."
                borderRadius="24px"
                borderColor="rgba(148, 163, 184, 0.28)"
                bg="white"
                px={5}
                py={4}
                fontSize="md"
                lineHeight="1.75"
                disabled={isWorking}
                _focusVisible={{
                  borderColor: "orange.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                }}
                _disabled={{
                  opacity: 0.6,
                  cursor: "not-allowed",
                  bg: "gray.50",
                }}
              />

              {hasApprovedBrief && (
                <Box mt={5}>
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    color="gray.500"
                    textTransform="uppercase"
                    letterSpacing="wide"
                    mb={2}
                  >
                    Approved Brief
                  </Text>
                  <Textarea
                    value={generationBrief}
                    onChange={(event) =>
                      onGenerationBriefChange(event.target.value)
                    }
                    minH="170px"
                    resize="vertical"
                    borderRadius="24px"
                    borderColor="rgba(148, 163, 184, 0.28)"
                    bg="rgba(248,250,252,0.72)"
                    px={5}
                    py={4}
                    fontSize="sm"
                    lineHeight="1.75"
                    _focusVisible={{
                      borderColor: "orange.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                    }}
                  />
                </Box>
              )}

              <VStack align="stretch" gap={2} mt={5}>
                <Text
                  fontSize="10px"
                  fontWeight="800"
                  color="gray.500"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                >
                  Model
                </Text>
                <ModelSelector
                  value={selectedModel}
                  onChange={onModelChange}
                  defaultLabel={defaultModelLabel}
                />
              </VStack>

              <HStack
                justify="space-between"
                align={{ base: "start", md: "center" }}
                flexDirection={{ base: "column", md: "row" }}
                gap={4}
                mt={5}
              >
                <HStack gap={3} color="gray.500" align="start">
                  <Lightbulb size={16} />
                  <Text fontSize="sm" maxW="420px">
                    Brainstorm first to shape the taste and direction. Generate
                    once the brief feels right.
                  </Text>
                </HStack>

                <HStack gap={3} w={{ base: "full", md: "auto" }}>
                  <Button
                    variant="outline"
                    borderRadius="full"
                    px={5}
                    onClick={onBrainstorm}
                    loading={isSubmitting}
                    disabled={isWorking || isSubmitting}
                    flex={{ base: 1, md: "unset" }}
                  >
                    <Lightbulb size={15} />
                    Brainstorm
                  </Button>
                  <Button
                    bg="gray.950"
                    color="white"
                    borderRadius="full"
                    px={5}
                    _hover={{ bg: "black" }}
                    onClick={onGenerate}
                    loading={isSubmitting}
                    disabled={isWorking || isSubmitting}
                    flex={{ base: 1, md: "unset" }}
                  >
                    <Wand2 size={15} />
                    Start Generating
                  </Button>
                </HStack>
              </HStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
