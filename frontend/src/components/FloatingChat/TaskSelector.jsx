import { Box, Button, VStack, Text, HStack, Badge } from "@chakra-ui/react";
import {
  FileText,
  GitBranch,
  CheckSquare,
  Shield,
  TestTube,
  Sparkles,
} from "lucide-react";
import { SECTION_TYPES } from "../../constants/section-types";

const SECTION_OPTIONS = [
  {
    key: SECTION_TYPES.DOCUMENTATION,
    label: "Documentation",
    icon: FileText,
    description: "Edit domain docs",
  },
  {
    key: SECTION_TYPES.REQUIREMENTS,
    label: "Requirements",
    icon: CheckSquare,
    description: "Refine requirements",
  },
  {
    key: SECTION_TYPES.DIAGRAMS,
    label: "Diagrams",
    icon: GitBranch,
    description: "Update diagrams",
  },
  {
    key: SECTION_TYPES.BUGS_SECURITY,
    label: "Bugs & Security",
    icon: Shield,
    description: "Fix bugs & vulnerabilities",
  },
  {
    key: SECTION_TYPES.REFACTORING_AND_TESTING,
    label: "Testing",
    icon: TestTube,
    description: "Improve tests",
  },
];

const CUSTOM_PROMPTS = [
  "Rename X to Y everywhere in the codebase",
  "Add logging to all API endpoints",
  "Update copyright years to 2026",
  "Add input validation to all forms",
];

/**
 * TaskSelector - Shows a list of task types for the user to choose from
 */
export function TaskSelector({ onSelect }) {
  return (
    <VStack gap={4} align="stretch" p={1}>
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          mb={2}
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Domain Sections
        </Text>
        <VStack gap={2} align="stretch">
          {SECTION_OPTIONS.map(({ key, label, icon: Icon, description }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              justifyContent="flex-start"
              onClick={() => onSelect(key)}
              py={6}
              _hover={{ bg: "blue.50", borderColor: "blue.300" }}
            >
              <HStack gap={3} flex={1}>
                <Icon size={15} />
                <Box textAlign="left">
                  <Text fontSize="sm" fontWeight="medium">
                    {label}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {description}
                  </Text>
                </Box>
              </HStack>
            </Button>
          ))}
        </VStack>
      </Box>

      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          mb={2}
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Or create a custom task
        </Text>
        <Button
          variant="solid"
          size="sm"
          colorScheme="purple"
          justifyContent="flex-start"
          width="full"
          onClick={() => onSelect("custom")}
          py={6}
          bg="purple.500"
          _hover={{ bg: "purple.600" }}
          color="white"
        >
          <HStack gap={3} flex={1}>
            <Sparkles size={15} />
            <Box textAlign="left">
              <Text fontSize="sm" fontWeight="medium">
                Custom Task
              </Text>
              <Text fontSize="xs" opacity={0.85}>
                Refactor, rename, update across the whole codebase
              </Text>
            </Box>
          </HStack>
        </Button>

        <VStack gap={1} mt={3} align="stretch">
          <Text fontSize="xs" color="gray.400" mb={1}>
            Example prompts:
          </Text>
          {CUSTOM_PROMPTS.map((prompt) => (
            <Text
              key={prompt}
              fontSize="xs"
              color="blue.400"
              cursor="pointer"
              _hover={{ color: "blue.600", textDecoration: "underline" }}
              onClick={() => onSelect("custom", prompt)}
              noOfLines={1}
            >
              "{prompt}"
            </Text>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
