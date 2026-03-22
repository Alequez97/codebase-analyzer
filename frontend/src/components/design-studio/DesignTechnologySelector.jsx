import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { DESIGN_TECHNOLOGY_OPTIONS } from "../../constants/design-technologies";

export function DesignTechnologySelector({ value, onChange }) {
  return (
    <VStack align="stretch" gap={2}>
      <Text
        fontSize="10px"
        fontWeight="800"
        color="gray.500"
        textTransform="uppercase"
        letterSpacing="0.12em"
      >
        Technology
      </Text>
      <HStack gap={2} flexWrap="wrap" align="stretch">
        {DESIGN_TECHNOLOGY_OPTIONS.map((option) => {
          const selected = option.value === value;

          return (
            <Button
              key={option.value}
              variant="outline"
              borderRadius="16px"
              h="auto"
              minH="60px"
              px={4}
              py={3}
              textAlign="left"
              justifyContent="flex-start"
              borderColor={selected ? "orange.400" : "rgba(148,163,184,0.35)"}
              bg={selected ? "orange.50" : "white"}
              color={selected ? "orange.800" : "gray.700"}
              _hover={{
                borderColor: "orange.300",
                bg: selected ? "orange.50" : "orange.50",
              }}
              onClick={() => onChange(option.value)}
            >
              <VStack align="start" gap={0.5}>
                <Text fontSize="sm" fontWeight="700">
                  {option.label}
                </Text>
                <Box>
                  <Text
                    fontSize="xs"
                    color={selected ? "orange.700" : "gray.500"}
                  >
                    {option.description}
                  </Text>
                </Box>
              </VStack>
            </Button>
          );
        })}
      </HStack>
    </VStack>
  );
}
