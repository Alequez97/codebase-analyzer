import { VStack, HStack, Box, Heading, Text, Badge } from "@chakra-ui/react";
import { Card } from "../ui/card";
import { useAppStore } from "../../store/useAppStore";

export function ConfigurationPanel() {
  const { status } = useAppStore();

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
            <HStack gap={2} align="center">
              <Badge colorPalette="blue" size="lg">
                {status?.config?.analysisTool || "auto-detect"}
              </Badge>
              {status?.config?.analysisTool === "aider" && (
                <Text fontSize="sm" color="gray.600">
                  →{" "}
                  <a
                    href="https://aider.chat/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3182ce", textDecoration: "underline" }}
                  >
                    Installation Guide
                  </a>
                </Text>
              )}
            </HStack>
          </Box>

          {/* Available Agents */}
          {status?.agents && (
            <Box>
              <Text fontWeight="bold" mb={2}>
                Available AI Agents
              </Text>
              <VStack align="stretch" gap={2}>
                {Object.entries(status.agents).map(([name, available]) => (
                  <HStack key={name} justify="space-between">
                    <Text fontSize="sm">{name}</Text>
                    <Badge colorPalette={available ? "green" : "red"} size="sm">
                      {available ? "✓ Available" : "✗ Not Found"}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
              {!status.agents.aider && (
                <Text fontSize="xs" color="gray.500" mt={2}>
                  To use Aider,{" "}
                  <a
                    href="https://aider.chat/docs/install.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3182ce", textDecoration: "underline" }}
                  >
                    install it
                  </a>{" "}
                  and ensure it's in your PATH
                </Text>
              )}
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
