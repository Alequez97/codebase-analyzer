import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { ActivityEvent } from "./ActivityEvent";

export function ActivityFeed() {
  const activityEvents = useMarketResearchStore((s) => s.activityEvents);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityEvents.length]);

  const handleClear = () => {
    useMarketResearchStore.setState({ activityEvents: [] });
  };

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        px={5}
        py={3}
        borderBottomWidth="1px"
        borderColor="#f1f5f9"
      >
        <HStack gap={2.5}>
          <Text fontSize="12px" fontWeight="700" color="#0f172a">
            Activity
          </Text>
          {isAnalyzing && (
            <HStack
              gap={1.5}
              bg="#f0fdf4"
              borderRadius="9999px"
              px={2}
              py={0.5}
            >
              <Box
                w="5px"
                h="5px"
                borderRadius="50%"
                bg="#16a34a"
                css={{
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                  },
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <Text fontSize="9px" fontWeight="700" color="#15803d">
                Live
              </Text>
            </HStack>
          )}
          <Text fontSize="10px" color="#94a3b8">
            {activityEvents.length} events
          </Text>
        </HStack>

        <Button
          variant="ghost"
          size="xs"
          fontSize="11px"
          color="#94a3b8"
          _hover={{ color: "#64748b" }}
          onClick={handleClear}
        >
          Clear
        </Button>
      </HStack>

      {/* Event list */}
      <VStack
        ref={scrollRef}
        align="stretch"
        gap={0}
        maxH="600px"
        overflowY="auto"
        px={5}
        py={2}
        css={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: "#e2e8f0",
            borderRadius: "2px",
          },
        }}
      >
        {activityEvents.length === 0 ? (
          <Box py={12} textAlign="center">
            <Text fontSize="12px" color="#94a3b8">
              Events will appear here as the AI works...
            </Text>
          </Box>
        ) : (
          activityEvents.map((event) => (
            <ActivityEvent key={event.id} event={event} />
          ))
        )}
      </VStack>
    </Box>
  );
}
