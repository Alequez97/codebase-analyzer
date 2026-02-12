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
import { Alert } from "../ui/alert";
import { useAppStore } from "../../store/useAppStore";

export function ModulesSection() {
  const { status, modules, analyzingCodebase, startCodebaseAnalysis } =
    useAppStore();

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="lg">
            Modules{status?.target ? ` - ${status.target.name}` : ""}
          </Heading>
          <Button
            colorPalette="blue"
            onClick={startCodebaseAnalysis}
            loading={analyzingCodebase}
            loadingText="Analyzing..."
          >
            {modules.length > 0 ? "Re-analyze Codebase" : "Analyze Codebase"}
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {analyzingCodebase && (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Title>Analysis in progress...</Alert.Title>
            <Alert.Description>
              Analyzing your codebase. This may take a few minutes.
            </Alert.Description>
          </Alert.Root>
        )}

        {!analyzingCodebase && modules.length === 0 && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="lg">
              No modules found. Click "Analyze Codebase" to start analysis.
            </Text>
          </Box>
        )}

        {!analyzingCodebase && modules.length > 0 && (
          <VStack align="stretch" gap={4}>
            <Text color="gray.600">
              Found {modules.length} module{modules.length !== 1 ? "s" : ""}
            </Text>
            {modules.map((module) => (
              <Card.Root key={module.id} variant="outline">
                <Card.Body>
                  <HStack justify="space-between">
                    <Box flex={1}>
                      <HStack mb={2}>
                        <Heading size="md">{module.name}</Heading>
                        <Badge
                          colorPalette={
                            module.priority === "P0"
                              ? "red"
                              : module.priority === "P1"
                                ? "orange"
                                : module.priority === "P2"
                                  ? "yellow"
                                  : "gray"
                          }
                        >
                          {module.priority}
                        </Badge>
                        {module.hasAnalysis && (
                          <Badge colorPalette="green">Analyzed</Badge>
                        )}
                      </HStack>
                      <Text color="gray.600" mb={2}>
                        {module.businessPurpose}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {module.files?.length || 0} file
                        {module.files?.length !== 1 ? "s" : ""}
                      </Text>
                    </Box>
                    <Button
                      colorPalette={module.hasAnalysis ? "green" : "blue"}
                      variant={module.hasAnalysis ? "outline" : "solid"}
                    >
                      {module.hasAnalysis ? "View Analysis" : "Analyze"}
                    </Button>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
