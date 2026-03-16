import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { FileText } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

export function SignInNotice() {
  const setStep = useMarketResearchStore((s) => s.setStep);
  const step = useMarketResearchStore((s) => s.step);
  const setReturnStep = useAuthStore((s) => s.setReturnStep);

  const handleSignIn = () => {
    setReturnStep(step);
    setStep("login");
  };

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
      boxShadow="0 1px 3px rgba(0,0,0,.05)"
    >
      <HStack gap={2.5} align="start">
        <FileText
          size={20}
          color="#6366f1"
          strokeWidth={2}
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <VStack align="start" gap={1.5} flex="1">
          <Text fontSize="13px" fontWeight="600" color="#0f172a">
            Your reports will appear here
          </Text>
          <Text fontSize="11px" color="#64748b" lineHeight="1.5">
            Sign in to your profile to save results and access your full report
            history.
          </Text>
          <Button
            size="xs"
            fontSize="11px"
            fontWeight="600"
            bg="#6366f1"
            color="white"
            borderRadius="6px"
            px={3}
            h="26px"
            _hover={{ bg: "#4f46e5" }}
            onClick={handleSignIn}
          >
            Sign in
          </Button>
        </VStack>
      </HStack>
    </Box>
  );
}
