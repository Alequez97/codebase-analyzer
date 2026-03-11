import { Badge, Box, HStack, Text } from "@chakra-ui/react";

export function BlockedTestCard({ blockedBy }) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p={3}
      bg="gray.100"
      borderColor="gray.400"
    >
      <HStack mb={2}>
        <Badge colorPalette="gray" size="sm" variant="solid">
          🔒 BLOCKED
        </Badge>
        <Text fontSize="xs" fontWeight="semibold">
          Requires refactoring before implementation
        </Text>
      </HStack>
      <Text fontSize="xs" color="gray.700">
        ⚠️ Blocked by{" "}
        <Text
          as="span"
          fontFamily="mono"
          fontWeight="semibold"
          color="gray.700"
          cursor="pointer"
          textDecoration="underline"
          onClick={() =>
            document.getElementById(blockedBy)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }
        >
          {blockedBy}
        </Text>
      </Text>
      <Text fontSize="xs" color="gray.600" mt={1}>
        Apply the recommended refactoring above to proceed.
      </Text>
    </Box>
  );
}
