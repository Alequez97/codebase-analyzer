import { Box, HStack, Text } from "@chakra-ui/react";
import { FileText } from "lucide-react";

export default function SectionProgressBanner({
  progress,
  fallbackMessage,
  icon,
}) {
  const message = progress?.message || fallbackMessage;
  if (!message) {
    return null;
  }

  const IconComponent = icon || FileText;

  return (
    <Box
      mb={4}
      p={3}
      bg="blue.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="blue.500"
    >
      <HStack gap={2}>
        <IconComponent size={16} />
        <Text fontSize="sm" fontWeight="medium" color="blue.800">
          {message}
        </Text>
      </HStack>
    </Box>
  );
}
