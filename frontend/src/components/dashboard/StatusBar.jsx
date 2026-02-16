import { HStack, Badge, Text } from "@chakra-ui/react";

export function StatusBar({ connected, socketConnected, status }) {
  const useMockData = status?.config?.useMockData;

  return (
    <HStack
      justify="flex-end"
      px={8}
      py={2}
      borderBottom="1px"
      borderColor="gray.200"
      bg="gray.50"
      gap={6}
    >
      <HStack gap={2}>
        <Text fontSize="sm" color="gray.600">
          API:
        </Text>
        <Badge colorPalette={connected ? "green" : "red"} size="sm">
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </HStack>

      <HStack gap={2}>
        <Text fontSize="sm" color="gray.600">
          Socket:
        </Text>
        <Badge colorPalette={socketConnected ? "green" : "yellow"} size="sm">
          {socketConnected ? "Connected" : "Connecting..."}
        </Badge>
      </HStack>

      {useMockData && (
        <HStack gap={2}>
          <Text fontSize="sm" color="gray.600">
            Mode:
          </Text>
          <Badge colorPalette="orange" size="sm">
            MOCK DATA
          </Badge>
        </HStack>
      )}
    </HStack>
  );
}
