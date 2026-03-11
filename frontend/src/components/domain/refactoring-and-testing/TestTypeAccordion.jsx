import { useState } from "react";
import { Badge, Box, Collapsible, HStack, Icon, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Accordion group for tests of a specific type (unit, integration, e2e)
 * Shows change badge and test count at the group level
 */
export function TestTypeAccordion({
  title,
  tests = [],
  colorPalette = "gray",
  changeType = null, // "added" | "edited" | "removed" | null
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const changeBadges = {
    added: {
      label: "+ ADDED",
      colorPalette: "green",
      borderColor: "green.500",
      bg: "green.50",
    },
    edited: {
      label: "✎ EDITED",
      colorPalette: "orange",
      borderColor: "orange.500",
      bg: "orange.50",
    },
    removed: {
      label: "− REMOVED",
      colorPalette: "red",
      borderColor: "red.500",
      bg: "red.50",
      opacity: 0.6,
    },
  };

  const badge = changeType ? changeBadges[changeType] : null;

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      overflow="hidden"
      bg={badge?.bg || "white"}
      borderLeftWidth="4px"
      borderLeftColor={badge?.borderColor || "transparent"}
      opacity={badge?.opacity || 1}
      boxShadow="sm"
      transition="all 0.3s ease"
      _hover={{
        boxShadow: "md",
      }}
    >
      <Box
        p={4}
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
        _hover={{
          bg: "blackAlpha.50",
        }}
        transition="background 0.2s"
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon color="gray.500">
              {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </Icon>

            {badge && (
              <Badge
                colorPalette={badge.colorPalette}
                variant="solid"
                fontSize="10px"
                fontWeight="bold"
                letterSpacing="0.5px"
              >
                {badge.label}
              </Badge>
            )}

            <Text fontWeight="semibold" fontSize="md">
              {title}
            </Text>
          </HStack>

          <HStack gap={3} onClick={(e) => e.stopPropagation()}>
            <Text fontSize="sm" color="gray.600">
              {tests.length} {tests.length === 1 ? "test" : "tests"}
            </Text>
          </HStack>
        </HStack>
      </Box>

      <Collapsible.Root open={isOpen}>
        <Collapsible.Content>
          <Box>{children}</Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}
