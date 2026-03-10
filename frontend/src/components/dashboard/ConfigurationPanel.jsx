import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useConfigStore } from "../../store/useConfigStore";
import { useE2EConfigStore } from "../../store/useE2EConfigStore";

export function ConfigurationPanel() {
  const { config, configLoading } = useConfigStore();
  const {
    config: e2eConfig,
    loading: e2eLoading,
    saving,
    fetchConfig,
    saveConfig,
  } = useE2EConfigStore();

  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (e2eConfig) {
      setBaseUrl(e2eConfig.baseUrl || "");
      setUsername(e2eConfig.auth?.username || "");
      setPassword(e2eConfig.auth?.password || "");
    }
  }, [e2eConfig]);

  const handleSaveE2EConfig = () => {
    saveConfig({ baseUrl, auth: { username, password } });
  };

  const getToolAvailability = (toolId) => {
    if (configLoading) return "loading";
    return config?.agents?.[toolId] ? "available" : "unavailable";
  };

  const tools = [
    {
      id: "llm-api",
      name: "LLM API",
      purpose: "Generates analysis JSON files",
      usedFor: "Codebase & domain analysis",
      color: "blue",
      availability: getToolAvailability("llm-api"),
    },
    {
      id: "aider",
      name: "Aider",
      purpose: "Edits files and writes code",
      usedFor: "Applying fixes, writing tests",
      color: "green",
      installUrl: "https://aider.chat/docs/install.html",
      availability: getToolAvailability("aider"),
    },
  ];

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Text fontWeight="bold" mb={2}>
          Project Directory
        </Text>
        <Text fontSize="sm" color="gray.600" fontFamily="mono">
          {config?.target?.directory || "Loading..."}
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
              borderColor={
                tool.availability === "available"
                  ? "green.300"
                  : tool.availability === "loading"
                    ? "gray.300"
                    : "gray.200"
              }
              bg={
                tool.availability === "available"
                  ? "green.50"
                  : tool.availability === "loading"
                    ? "gray.100"
                    : "gray.50"
              }
            >
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Text fontWeight="semibold" fontSize="sm">
                    {tool.name}
                  </Text>
                  <Badge colorPalette={tool.color} size="sm">
                    {tool.id}
                  </Badge>
                  {tool.availability === "loading" ? (
                    <Badge colorPalette="gray" size="sm">
                      Loading...
                    </Badge>
                  ) : tool.availability === "available" ? (
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

      <Box>
        <Text fontWeight="bold" mb={1}>
          E2E Test Settings
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Used when implementing e2e tests for the analyzed project
        </Text>
        <VStack align="stretch" gap={3}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              App Base URL
            </Text>
            <Input
              size="sm"
              fontFamily="mono"
              placeholder="http://localhost:5173"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={e2eLoading}
            />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Login Username{" "}
              <Text as="span" color="gray.400">
                (optional)
              </Text>
            </Text>
            <Input
              size="sm"
              placeholder="admin@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={e2eLoading}
            />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Login Password{" "}
              <Text as="span" color="gray.400">
                (optional)
              </Text>
            </Text>
            <Input
              size="sm"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={e2eLoading}
            />
          </Box>
          <Button
            size="sm"
            colorPalette="blue"
            alignSelf="flex-start"
            loading={saving}
            onClick={handleSaveE2EConfig}
          >
            Save E2E Settings
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
