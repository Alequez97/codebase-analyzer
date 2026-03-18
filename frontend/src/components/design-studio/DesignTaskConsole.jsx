import {
  Badge,
  Box,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";

const STAGE_LABELS = {
  queued: "Queued",
  processing: "Thinking",
  compacting: "Condensing context",
  complete: "Preview ready",
};

function formatStage(stage) {
  if (!stage) {
    return "Working";
  }
  return (
    STAGE_LABELS[stage] ??
    stage
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function DesignTaskConsole({
  title,
  statusText,
  isRunning,
  messages = [],
  events = [],
  error,
  agent,
  model,
  mode,
  hasPreview = false,
  maxW = "820px",
  showWhenEmpty = false,
}) {
  if (
    !showWhenEmpty &&
    !statusText &&
    messages.length === 0 &&
    events.length === 0 &&
    !error
  ) {
    return null;
  }

  const assistantMessages = messages.filter(
    (message) => message.role === "assistant" && message.content?.trim(),
  );
  const latestAssistantMessage =
    assistantMessages[assistantMessages.length - 1]?.content ?? null;
  const hasStageData = events.length > 0 || Boolean(statusText) || Boolean(error);

  const stageItems = [
    { id: "queued", label: "Queued" },
    {
      id: "processing",
      label: mode === "brainstorm" ? "Sharpening brief" : "Thinking through layout",
    },
    {
      id: "writing",
      label: mode === "brainstorm" ? "Drafting notes" : "Producing design files",
    },
    {
      id: "complete",
      label: hasPreview ? "Preview ready" : "Waiting for preview",
    },
  ];

  const latestStage = isRunning
    ? events[events.length - 1]?.stage || "processing"
    : hasPreview
      ? "complete"
      : null;

  const currentStageIndex =
    latestStage === "complete"
      ? 3
      : latestStage === "processing" || latestStage === "compacting"
        ? 1
        : latestStage
          ? 2
          : 0;

  return (
    <Box
      w="full"
      maxW={maxW}
      borderRadius="28px"
      borderWidth="1px"
      borderColor="rgba(148, 163, 184, 0.24)"
      bg="rgba(255,255,255,0.78)"
      boxShadow="0 30px 80px rgba(15, 23, 42, 0.08)"
      backdropFilter="blur(18px)"
      overflow="hidden"
    >
      <HStack
        justify="space-between"
        px={6}
        py={4}
        borderBottomWidth="1px"
        borderColor="rgba(226, 232, 240, 0.9)"
      >
        <VStack align="start" gap={0}>
          <Text fontSize="sm" fontWeight="800" color="gray.900">
            {title}
          </Text>
          {statusText && (
            <Text fontSize="xs" color="gray.500">
              {statusText}
            </Text>
          )}
        </VStack>
        <HStack gap={2} flexWrap="wrap" justify="flex-end">
          {agent || model ? (
            <Badge bg="gray.100" color="gray.700" borderRadius="full" px={3} py={1}>
              {[agent, model].filter(Boolean).join(" · ")}
            </Badge>
          ) : null}
          {isRunning ? (
            <HStack gap={2}>
              <Spinner size="sm" color="orange.500" />
              <Badge
                bg="orange.100"
                color="orange.800"
                borderRadius="full"
                px={3}
                py={1}
              >
                {formatStage(latestStage)}
              </Badge>
            </HStack>
          ) : (
            <Badge
              bg={hasPreview ? "green.100" : "gray.100"}
              color={hasPreview ? "green.800" : "gray.700"}
              borderRadius="full"
              px={3}
              py={1}
            >
              {hasPreview ? "Ready" : "Idle"}
            </Badge>
          )}
        </HStack>
      </HStack>

      <VStack align="stretch" gap={4} px={6} py={5}>
        <HStack gap={2} align="stretch" flexWrap="wrap">
          {stageItems.map((item, index) => {
            const isComplete = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex && isRunning;

            return (
              <Box
                key={item.id}
                flex="1 1 140px"
                minW="140px"
                borderRadius="18px"
                borderWidth="1px"
                borderColor={
                  isComplete ? "rgba(251, 146, 60, 0.38)" : "rgba(226, 232, 240, 0.9)"
                }
                bg={
                  isCurrent
                    ? "linear-gradient(135deg, rgba(255,237,213,0.95), rgba(255,255,255,0.92))"
                    : isComplete
                      ? "orange.50"
                      : "gray.50"
                }
                px={3}
                py={3}
              >
                <Text
                  fontSize="10px"
                  fontWeight="800"
                  color={isComplete ? "orange.700" : "gray.400"}
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                >
                  Step {index + 1}
                </Text>
                <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                  {item.label}
                </Text>
              </Box>
            );
          })}
        </HStack>

        {error && (
          <Box
            borderRadius="20px"
            bg="red.50"
            borderWidth="1px"
            borderColor="red.100"
            px={4}
            py={3}
          >
            <Text fontSize="sm" color="red.700">
              {error}
            </Text>
          </Box>
        )}

        {hasStageData ? (
          <Box
            borderRadius="22px"
            bg="rgba(248,250,252,0.95)"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.9)"
            px={4}
            py={4}
          >
            <Text
              fontSize="xs"
              fontWeight="800"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="0.14em"
              mb={3}
            >
              Generation Stages
            </Text>
            <VStack align="stretch" gap={2}>
              {events
                .slice()
                .reverse()
                .map((event) => (
                  <HStack
                    key={event.id}
                    align="start"
                    gap={3}
                    borderRadius="16px"
                    bg="white"
                    borderWidth="1px"
                    borderColor="rgba(226, 232, 240, 0.9)"
                    px={3}
                    py={3}
                  >
                    <Badge
                      bg={
                        event.status === "pending"
                          ? "gray.100"
                          : event.stage === "complete"
                            ? "green.100"
                            : "orange.100"
                      }
                      color={
                        event.status === "pending"
                          ? "gray.700"
                          : event.stage === "complete"
                            ? "green.800"
                            : "orange.800"
                      }
                      borderRadius="full"
                      px={2.5}
                      py={1}
                      mt={0.5}
                    >
                      {formatStage(event.stage || event.status)}
                    </Badge>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" color="gray.800">
                        {event.message}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
            </VStack>
          </Box>
        ) : (
          <Box
            borderRadius="22px"
            bg="rgba(248,250,252,0.95)"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.9)"
            px={5}
            py={5}
          >
            <Text
              fontSize="xs"
              fontWeight="800"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="0.14em"
              mb={2}
            >
              Thinking View
            </Text>
            <Text fontSize="sm" color="gray.700" lineHeight="1.8">
              This panel shows the live generation flow once the model starts
              working, including current status, high-level stages, and the latest
              AI notes.
            </Text>
          </Box>
        )}

        {latestAssistantMessage && (
          <Box
            className="design-markdown"
            borderRadius="22px"
            bg="white"
            borderWidth="1px"
            borderColor="rgba(226, 232, 240, 0.92)"
            px={5}
            py={4}
            color="gray.700"
            lineHeight="1.7"
            fontSize="sm"
          >
            <Text
              fontSize="xs"
              fontWeight="800"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="0.14em"
              mb={3}
            >
              AI Notes
            </Text>
            <ReactMarkdown>{latestAssistantMessage}</ReactMarkdown>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
