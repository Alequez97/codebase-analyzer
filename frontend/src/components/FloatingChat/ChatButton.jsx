import { Box, IconButton, Badge } from "@chakra-ui/react";
import { MessageCircle } from "lucide-react";
import { useAgentChatStore } from "../../store/useAgentChatStore";

/**
 * ChatButton - Fixed floating button in the bottom-right corner
 * Only rendered on domain detail pages
 *
 * Shows a badge when the AI is actively working on a task.
 */
export function ChatButton({ domainId }) {
  const { isOpen, isAiWorking, openChat, closeChat } = useAgentChatStore();

  const handleClick = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat(domainId);
    }
  };

  return (
    <Box position="fixed" bottom="24px" right="24px" zIndex={1000}>
      <Box position="relative" display="inline-block">
        <IconButton
          size="lg"
          borderRadius="full"
          boxShadow="lg"
          bg={isOpen ? "gray.700" : "blue.500"}
          color="white"
          onClick={handleClick}
          aria-label="Open AI chat"
          _hover={{
            bg: isOpen ? "gray.800" : "blue.600",
            transform: "scale(1.05)",
          }}
          transition="all 0.2s"
          width="56px"
          height="56px"
        >
          <MessageCircle size={22} />
        </IconButton>

        {isAiWorking && (
          <Box
            position="absolute"
            top="-2px"
            right="-2px"
            w={3}
            h={3}
            borderRadius="full"
            bg="green.400"
            border="2px solid white"
            animation="pulse 2s infinite"
          />
        )}
      </Box>
    </Box>
  );
}
