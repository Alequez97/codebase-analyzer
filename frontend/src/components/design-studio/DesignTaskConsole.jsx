import { Badge, Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";

export function DesignTaskConsole({
  title,
  statusText,
  isRunning,
  message,
  error,
}) {
  if (!statusText && !message && !error) {
    return null;
  }

  return (
    <Box
      w="full"
      maxW="820px"
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
              Working
            </Badge>
          </HStack>
        ) : (
          <Badge
            bg="gray.100"
            color="gray.700"
            borderRadius="full"
            px={3}
            py={1}
          >
            Ready
          </Badge>
        )}
      </HStack>

      <VStack align="stretch" gap={4} px={6} py={5}>
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

        {message && (
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
            <ReactMarkdown>{message}</ReactMarkdown>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
