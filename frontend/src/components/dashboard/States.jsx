export function LoadingState() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={4}>
        <Spinner size="xl" />
        <Text>Connecting to server...</Text>
      </VStack>
    </Container>
  );
}

export function ErrorState({ error, port }) {
  return (
    <Container maxW="container.xl" py={8}>
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>{error}</Alert.Title>
        <Alert.Description>
          {port
            ? `Make sure the backend server is running on port ${port}`
            : "Make sure the backend server is running"}
        </Alert.Description>
      </Alert.Root>
    </Container>
  );
}
