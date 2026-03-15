import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { ActivityEvent } from "./ActivityEvent";

export function ActivityFeed() {
  const activityEvents = useMarketResearchStore((s) => s.activityEvents);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const scrollRef = useRef(null);

  // Auto-scroll to the bottom whenever new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityEvents.length]);

  const handleClear = () => {
    // Visual-only clear — does not reset analysis state
    useMarketResearchStore.setState({ activityEvents: [] });
  };

  return (
    <Box
      w={{ base: "full", lg: "360px" }}
      flexShrink={0}
      borderLeftWidth="1px"
      borderColor="#e4e4e7"
      display="flex"
      flexDir="column"
      h="full"
    >
      {/* Feed header */}
      <HStack
        justify="space-between"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="#e4e4e7"
        flexShrink={0}
      >
        <HStack gap={2}>
          <Text fontSize="12px" fontWeight="700" color="#0f172a">
            Activity
          </Text>
          {isAnalyzing && (
            <Badge
              display="inline-flex"
              alignItems="center"
              gap={1}
              bg="#dcfce7"
              color="#15803d"
              fontSize="9px"
              fontWeight="700"
              px={1.5}
              py={0.5}
              borderRadius="9999px"
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
              Live
            </Badge>
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

      {/* Scrollable event list */}
      <VStack
        ref={scrollRef}
        align="stretch"
        gap={0}
        flex="1"
        overflowY="auto"
        px={4}
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
          <Box py={8} textAlign="center">
            <Text fontSize="11px" color="#94a3b8">
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
