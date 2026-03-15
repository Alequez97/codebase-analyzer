import { Badge, Box, Grid, HStack, Text } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorCard } from "./CompetitorCard";

export function CompetitorsGrid() {
  const competitors = useMarketResearchStore((s) => s.competitors);
  const doneCount = competitors.filter((c) => c.status === "done").length;

  return (
    <Box>
      <HStack gap={2} mb={4}>
        <Text
          fontSize="10px"
          fontWeight="700"
          color="#94a3b8"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Competitors Discovered
        </Text>
        {competitors.length > 0 && (
          <HStack gap={1.5}>
            <Badge
              bg="#f1f5f9"
              color="#64748b"
              fontSize="10px"
              fontWeight="600"
              px={1.5}
              py={0.5}
              borderRadius="9999px"
            >
              {competitors.length} found
            </Badge>
            {doneCount > 0 && (
              <Badge
                bg="#dcfce7"
                color="#15803d"
                fontSize="10px"
                fontWeight="600"
                px={1.5}
                py={0.5}
                borderRadius="9999px"
              >
                {doneCount} analyzed
              </Badge>
            )}
          </HStack>
        )}
      </HStack>

      {competitors.length === 0 ? (
        <Box
          bg="white"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="#e2e8f0"
          p={10}
          textAlign="center"
        >
          <Text fontSize="12px" color="#94a3b8">
            Searching for competitors...
          </Text>
        </Box>
      ) : (
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          }}
          gap={3}
        >
          {competitors.map((competitor) => (
            <CompetitorCard key={competitor.id} competitor={competitor} />
          ))}
        </Grid>
      )}
    </Box>
  );
}
