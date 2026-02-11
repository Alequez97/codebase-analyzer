import { HStack, Badge, Text } from '@chakra-ui/react';

export function StatusBar({ connected }) {
  return (
    <HStack
      justify="flex-end"
      px={8}
      py={2}
      borderBottom="1px"
      borderColor="gray.200"
      bg="gray.50"
    >
      <Text fontSize="sm" color="gray.600">
        API Status:
      </Text>
      <Badge colorPalette={connected ? 'green' : 'red'} size="sm">
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
    </HStack>
  );
}
