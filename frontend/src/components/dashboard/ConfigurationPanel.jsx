import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Badge,
  Button,
} from "@chakra-ui/react";
import { Card } from "../ui/card";
import { useAppStore } from "../../store/useAppStore";

export function ConfigurationPanel() {
  const {
    status,
    tools,
    selectedAgent,
    setSelectedAgent,
    toolsLoading,
    toolsError,
  } = useAppStore();
  const selectedTool = tools.find((tool) => tool.id === selectedAgent);

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
              Analysis Tool
            </Text>
            <HStack gap={2} align="center" flexWrap="wrap">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={selectedAgent === tool.id ? "solid" : "outline"}
                  colorPalette={selectedAgent === tool.id ? "blue" : "gray"}
                  onClick={() => setSelectedAgent(tool.id)}
                >
                  {tool.id}
                </Button>
              ))}
              {tools.length === 0 && (
                <Text fontSize="sm" color="gray.500">
                  {toolsLoading
                    ? "Loading tools..."
                    : toolsError || "No tools available"}
                </Text>
              )}
            </HStack>
          </Box>

          {selectedTool && (
            <Box>
              <Text fontWeight="bold" mb={2}>
                Tool Details
              </Text>
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">
                    {selectedTool.name || selectedTool.id}
                  </Text>
                  <Badge colorPalette="blue" size="sm">
                    {selectedTool.id}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Status</Text>
                  <Badge
                    colorPalette={selectedTool.available ? "green" : "red"}
                    size="sm"
                  >
                    {selectedTool.available ? "Available" : "Not Installed"}
                  </Badge>
                </HStack>
                {selectedTool.installUrl && (
                  <Text fontSize="sm" color="gray.600">
                    Installation Guide:{" "}
                    <a
                      href={selectedTool.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#3182ce", textDecoration: "underline" }}
                    >
                      {selectedTool.installUrl}
                    </a>
                  </Text>
                )}
              </VStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
