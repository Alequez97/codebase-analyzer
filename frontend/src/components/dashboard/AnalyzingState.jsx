import { Box, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { ScanSearch, X } from "lucide-react";
import { toaster } from "../ui/toaster";
import { useCodebaseStore } from "../../store/useCodebaseStore";
import { useLogsStore } from "../../store/useLogsStore";

const ANALYSIS_STEPS = [
  "Scanning project structure and file tree",
  "Identifying functional domains and boundaries",
  "Mapping inter-module dependencies",
];

export function AnalyzingState() {
  const { cancelCodebaseAnalysis } = useCodebaseStore();
  const { toggleDashboardLogs } = useLogsStore();

  const handleCancel = async () => {
    const result = await cancelCodebaseAnalysis();
    if (!result.success) {
      toaster.create({
        title: "Failed to cancel analysis",
        description: result.error,
        type: "error",
      });
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="calc(100vh - 52px)"
      bg="white"
    >
      <style>{`
        @keyframes analyzing-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes analyzing-dot {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>

      <VStack gap={8} textAlign="center" px={4} maxW="520px">
        {/* Animated scanning icon */}
        <Box
          position="relative"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            position="absolute"
            w="88px"
            h="88px"
            borderRadius="full"
            borderWidth="2px"
            borderColor="blue.300"
            style={{ animation: "analyzing-ring 2s ease-out infinite" }}
          />
          <Box
            position="absolute"
            w="72px"
            h="72px"
            borderRadius="full"
            borderWidth="2px"
            borderColor="blue.200"
            style={{
              animation: "analyzing-ring 2s ease-out infinite",
              animationDelay: "0.4s",
            }}
          />
          <Box
            p={4}
            bg="blue.50"
            borderRadius="full"
            color="blue.500"
            display="inline-flex"
          >
            <ScanSearch size={36} strokeWidth={1.5} />
          </Box>
        </Box>

        {/* Heading */}
        <VStack gap={2}>
          <Text fontWeight="bold" fontSize="2xl" color="gray.800">
            Analyzing Your Codebase
          </Text>
          <Text fontSize="md" color="gray.500" lineHeight="tall">
            AI is scanning your code to discover functional domains, detect
            bugs, flag security vulnerabilities, and map dependencies.
          </Text>
        </VStack>

        {/* Progress steps */}
        <VStack gap={3} w="full" align="stretch">
          {ANALYSIS_STEPS.map((label, i) => (
            <HStack
              key={label}
              gap={3}
              px={4}
              py={3}
              bg="gray.50"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="gray.100"
            >
              <Box flexShrink={0}>
                <Spinner
                  size="xs"
                  color="blue.400"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              </Box>
              <Text fontSize="sm" color="gray.600" textAlign="left">
                {label}
              </Text>
            </HStack>
          ))}
        </VStack>

        {/* Actions */}
        <HStack gap={3} justify="center">
          <Button
            variant="outline"
            colorPalette="blue"
            size="sm"
            borderRadius="lg"
            onClick={toggleDashboardLogs}
          >
            View Logs
          </Button>
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            borderRadius="lg"
            onClick={handleCancel}
          >
            <X size={14} />
            Cancel Analysis
          </Button>
        </HStack>

        <Text fontSize="xs" color="gray.400">
          Runs in the background — this may take a few minutes depending on
          codebase size.
        </Text>
      </VStack>
    </Box>
  );
}
