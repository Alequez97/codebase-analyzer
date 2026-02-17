import { VStack, Box, Heading, Text, Badge, HStack } from "@chakra-ui/react";
import { Card } from "../ui/card";
import { useAnalysisStore } from "../../store/useAnalysisStore";

export function ConfigurationPanel() {
  const { status } = useAnalysisStore();

  const tools = [
    {
      id: "llm-api",
      name: "LLM API",
      purpose: "Generates analysis JSON files",
      usedFor: "Codebase & domain analysis",
      color: "blue",
      available: status?.agents?.["llm-api"] ?? false,
    },
    {
      id: "aider",
      name: "Aider",
      purpose: "Edits files and writes code",
      usedFor: "Applying fixes, writing tests",
      color: "green",
      installUrl: "https://aider.chat/docs/install.html",
      available: status?.agents?.["aider"] ?? false,
    },
  ];

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Configuration</Heading>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Box>
            <Text fontWeight="bold" mb={2}>
              Project Directory
            </Text>
            <Text fontSize="sm" color="gray.600" fontFamily="mono">
              {status?.target?.directory || "Loading..."}
            </Text>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>
              Analysis Tools
            </Text>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Different tools are used automatically based on the task
            </Text>
            <VStack align="stretch" gap={3}>
              {tools.map((tool) => (
                <Box
                  key={tool.id}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={tool.available ? "green.300" : "gray.200"}
                  bg={tool.available ? "green.50" : "gray.50"}
                >
                  <HStack justify="space-between" mb={2}>
                    <HStack gap={2}>
                      <Text fontWeight="semibold" fontSize="sm">
                        {tool.name}
                      </Text>
                      <Badge colorPalette={tool.color} size="sm">
                        {tool.id}
                      </Badge>
                      {tool.available ? (
                        <Badge colorPalette="green" size="sm">
                          Available
                        </Badge>
                      ) : (
                        <Badge colorPalette="red" size="sm">
                          Not Available
                        </Badge>
                      )}
                    </HStack>
                  </HStack>
                  <VStack align="stretch" gap={1}>
                    <HStack>
                      <Text fontSize="xs" color="gray.500" minW="80px">
                        Purpose:
                      </Text>
                      <Text fontSize="xs" fontWeight="medium">
                        {tool.purpose}
                      </Text>
                    </HStack>
                    <HStack>
                      <Text fontSize="xs" color="gray.500" minW="80px">
                        Used for:
                      </Text>
                      <Text fontSize="xs">{tool.usedFor}</Text>
                    </HStack>
                    {tool.installUrl && (
                      <HStack>
                        <Text fontSize="xs" color="gray.500" minW="80px">
                          Install:
                        </Text>
                        <a
                          href={tool.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3182ce",
                            textDecoration: "underline",
                            fontSize: "12px",
                          }}
                        >
                          Installation Guide
                        </a>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
