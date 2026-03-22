import { Button, HStack } from "@chakra-ui/react";
import { DESIGN_TECHNOLOGY_OPTIONS } from "../../constants/design-technologies";

const SHORT_LABEL_BY_VALUE = {
  "static-html": "HTML",
  "react-vite": "React",
};

export function DesignTechnologySelector({ value, onChange }) {
  return (
    <HStack gap={2} align="stretch" flexWrap="wrap">
      {DESIGN_TECHNOLOGY_OPTIONS.map((option) => {
        const selected = option.value === value;

        return (
          <Button
            key={option.value}
            size="sm"
            h="32px"
            px={3}
            borderRadius="full"
            variant="outline"
            borderColor={selected ? "orange.400" : "rgba(148,163,184,0.35)"}
            bg={selected ? "orange.50" : "white"}
            color={selected ? "orange.800" : "gray.600"}
            fontSize="xs"
            fontWeight="700"
            _hover={{
              borderColor: selected ? "orange.400" : "orange.300",
              bg: selected ? "orange.50" : "orange.50",
            }}
            onClick={() => onChange(option.value)}
          >
            {SHORT_LABEL_BY_VALUE[option.value] ?? option.label}
          </Button>
        );
      })}
    </HStack>
  );
}
