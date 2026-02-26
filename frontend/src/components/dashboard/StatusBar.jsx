export function StatusBar({
  connected,
  statusLoading,
  socketConnected,
  rightContent = null,
}) {
  // Determine API status display
  const getApiStatus = () => {
    if (statusLoading) {
      return { color: "yellow", text: "Connecting..." };
    }
    if (connected) {
      return { color: "green", text: "Connected" };
    }
    return { color: "red", text: "Disconnected" };
  };

  const apiStatus = getApiStatus();

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
        <Badge colorPalette={apiStatus.color} size="sm">
          {apiStatus.text}
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

      {rightContent}
    </HStack>
  );
}
