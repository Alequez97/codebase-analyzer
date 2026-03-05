import { Box, IconButton } from "@chakra-ui/react";
import { Sparkles, X } from "lucide-react";
import { useAgentChatStore } from "../../store/useAgentChatStore";

const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.5), 0 8px 32px rgba(147, 51, 234, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(147, 51, 234, 0), 0 8px 32px rgba(147, 51, 234, 0.6); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(32px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(32px) rotate(-360deg); }
  }
  @keyframes orbit2 {
    from { transform: rotate(180deg) translateX(28px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(28px) rotate(-540deg); }
  }
  @keyframes sparkle-pop {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.4); opacity: 1; }
  }
  .chat-btn-idle {
    animation: float 3s ease-in-out infinite, glow-pulse 2.5s ease-in-out infinite;
  }
  .chat-btn-idle:hover {
    animation: none !important;
    transform: scale(1.12) translateY(-2px) !important;
  }
  .orbit-dot-1 {
    animation: orbit 4s linear infinite;
  }
  .orbit-dot-2 {
    animation: orbit2 6s linear infinite;
  }
  .sparkle-icon {
    animation: sparkle-pop 2s ease-in-out infinite;
  }
`;

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
    <>
      <style>{styles}</style>
      <Box position="fixed" bottom="28px" right="28px" zIndex={1000}>
        <Box position="relative" display="inline-block">
          {/* Decorative outer ring */}
          {!isOpen && (
            <Box
              position="absolute"
              inset="-5px"
              borderRadius="full"
              border="2px solid"
              borderColor="purple.300"
              opacity={0.5}
              pointerEvents="none"
              css={{
                animation: "glow-pulse 2.5s ease-in-out infinite",
              }}
            />
          )}

          {/* Orbiting sparkle particles */}
          {!isOpen && (
            <>
              <Box
                className="orbit-dot-1"
                position="absolute"
                top="50%"
                left="50%"
                marginTop="-4px"
                marginLeft="-4px"
                w="8px"
                h="8px"
                borderRadius="full"
                bg="purple.200"
                boxShadow="0 0 6px rgba(216, 180, 254, 0.9)"
                pointerEvents="none"
              />
              <Box
                className="orbit-dot-2"
                position="absolute"
                top="50%"
                left="50%"
                marginTop="-3px"
                marginLeft="-3px"
                w="6px"
                h="6px"
                borderRadius="full"
                bg="violet.300"
                boxShadow="0 0 5px rgba(167, 139, 250, 0.9)"
                pointerEvents="none"
              />
            </>
          )}

          <IconButton
            className={!isOpen ? "chat-btn-idle" : undefined}
            size="lg"
            borderRadius="full"
            color="white"
            onClick={handleClick}
            aria-label="Open AI chat"
            transition="all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
            width="60px"
            height="60px"
            css={{
              background: isOpen
                ? "linear-gradient(135deg, #374151 0%, #1f2937 100%)"
                : "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)",
              boxShadow: isOpen
                ? "0 4px 20px rgba(0,0,0,0.3)"
                : "0 8px 32px rgba(147, 51, 234, 0.45), 0 2px 8px rgba(109, 40, 217, 0.3)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              "&:hover": {
                background: isOpen
                  ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                  : "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)",
                boxShadow: isOpen
                  ? "0 4px 24px rgba(0,0,0,0.4)"
                  : "0 12px 40px rgba(168, 85, 247, 0.6), 0 4px 12px rgba(124, 58, 237, 0.4)",
              },
            }}
          >
            <Box
              transition="transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
              transform={isOpen ? "rotate(90deg) scale(1.1)" : "rotate(0deg)"}
            >
              {isOpen ? (
                <X size={22} />
              ) : (
                <Box className="sparkle-icon">
                  <Sparkles size={22} />
                </Box>
              )}
            </Box>
          </IconButton>

          {/* AI working indicator dot */}
          {isAiWorking && (
            <Box
              position="absolute"
              top="-2px"
              right="-2px"
              w="14px"
              h="14px"
              borderRadius="full"
              bg="emerald.400"
              border="2.5px solid white"
              boxShadow="0 0 8px rgba(52, 211, 153, 0.8)"
              css={{ animation: "glow-pulse 1.5s ease-in-out infinite" }}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
