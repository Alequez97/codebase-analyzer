import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { FileText } from "lucide-react";

export function SignInNotice() {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
      boxShadow="0 1px 3px rgba(0,0,0,.05)"
    >
      <HStack justify="space-between" align="center">
        <HStack gap={2.5} align="start">
          <FileText
            size={20}
            color="#6366f1"
            strokeWidth={2}
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <VStack align="start" gap={0.5}>
            <Text fontSize="13px" fontWeight="600" color="#0f172a">
              Your reports will appear here
            </Text>
            <Text fontSize="11px" color="#64748b" lineHeight="1.5">
              Sign in to save results, track your ideas, and access your full
              report history.
            </Text>
          </VStack>
        </HStack>
        <Button
          variant="ghost"
          size="sm"
          color="#6366f1"
          fontSize="12px"
          fontWeight="600"
          _hover={{ bg: "#f5f3ff" }}
          flexShrink={0}
        >
          Sign in →
        </Button>
      </HStack>
    </Box>
  );
}
