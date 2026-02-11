import { VStack, HStack, Box, Heading, Text, Badge } from '@chakra-ui/react';
import { Card } from '../ui/card';
import { Alert } from '../ui/alert';
import { useAppStore } from '../../store/useAppStore';

export function CodebaseSelector() {
  const { status, selectedCodebase, setSelectedCodebase } = useAppStore();

  const codebases = status?.config?.codebases || [];

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Available Codebases</Heading>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {codebases.map((codebase) => (
            <Card.Root
              key={codebase.id}
              variant={selectedCodebase?.id === codebase.id ? 'elevated' : 'outline'}
              cursor="pointer"
              onClick={() => setSelectedCodebase(codebase)}
              bg={selectedCodebase?.id === codebase.id ? 'blue.50' : 'white'}
            >
              <Card.Body>
                <HStack justify="space-between">
                  <Box flex={1}>
                    <Heading size="md" mb={1}>
                      {codebase.name}
                    </Heading>
                    <Text fontFamily="mono" fontSize="sm" color="gray.600">
                      {codebase.path}
                    </Text>
                  </Box>
                  {selectedCodebase?.id === codebase.id && (
                    <Badge colorPalette="blue" size="lg">
                      Active
                    </Badge>
                  )}
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}

          {codebases.length === 0 && (
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Title>No codebases configured</Alert.Title>
              <Alert.Description>
                Add CODEBASE_PATH_* variables to your backend/.env file
              </Alert.Description>
            </Alert.Root>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
