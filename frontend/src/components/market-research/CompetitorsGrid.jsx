import { Box, Grid, Text } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorCard } from "./CompetitorCard";

export function CompetitorsGrid() {
  const competitors = useMarketResearchStore((s) => s.competitors);

  if (competitors.length === 0) {
    return (
      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={14}
        textAlign="center"
      >
        <Text fontSize="12px" color="#94a3b8">
          Searching for competitors...
        </Text>
      </Box>
    );
  }

  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "repeat(2, 1fr)",
        xl: "repeat(3, 1fr)",
      }}
      gap={4}
    >
      {competitors.map((competitor) => (
        <CompetitorCard key={competitor.id} competitor={competitor} />
      ))}
    </Grid>
  );
}
