import { Badge, Box, HStack, Text } from "@chakra-ui/react";

/**
 * Legend showing what the diff colors mean
 */
export function DiffLegend() {
  const legendItems = [
    { label: "Added", bg: "green.100", borderColor: "green.500" },
    { label: "Edited", bg: "orange.100", borderColor: "orange.500" },
    { label: "Removed", bg: "red.100", borderColor: "red.500" },
    { label: "Unchanged", bg: "white", borderColor: "gray.300" },
  ];

  return (
    <HStack
      gap={4}
      p={3}
      bg="white"
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.200"
      flexWrap="wrap"
    >
      {legendItems.map((item) => (
        <HStack key={item.label} gap={2}>
          <Box
            width="20px"
            height="20px"
            borderRadius="4px"
            bg={item.bg}
            borderWidth="2px"
            borderColor={item.borderColor}
          />
          <Text fontSize="sm" color="gray.700">
            {item.label}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}
