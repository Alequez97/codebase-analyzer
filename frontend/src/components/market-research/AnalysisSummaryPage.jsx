import { Box, Button, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorDetails } from "./CompetitorDetails";
import { SummaryHeroBanner } from "./SummaryHeroBanner";
import { StartBuildingModal } from "./StartBuildingModal";
import { OpportunityCard } from "./OpportunityCard";
import { CompetitorComparisonTable } from "./CompetitorComparisonTable";

export function AnalysisSummaryPage() {
  const idea = useMarketResearchStore((s) => s.idea);
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);
  const competitors = useMarketResearchStore((s) => s.competitors);
  const report = useMarketResearchStore((s) => s.report);
  const selectedCompetitorId = useMarketResearchStore(
    (s) => s.selectedCompetitorId,
  );
  const selectCompetitor = useMarketResearchStore((s) => s.selectCompetitor);
  const clearSelectedCompetitor = useMarketResearchStore(
    (s) => s.clearSelectedCompetitor,
  );
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);

  const selectedCompetitor =
    competitors.find((c) => c.id === selectedCompetitorId) ?? null;

  if (selectedCompetitor) {
    return (
      <Box minH="100vh" bg="#f8fafc">
        <Box maxW="1040px" mx="auto" px={6} pt="72px" pb={16}>
          <CompetitorDetails
            competitor={selectedCompetitor}
            onBack={clearSelectedCompetitor}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Box maxW="1040px" mx="auto" px={6} pt="72px" pb={16}>
        <SummaryHeroBanner idea={idea} competitorCount={competitors.length} />

        <OpportunityCard
          opportunity={report?.opportunity}
          competitorCount={competitors.length}
          onStartBuilding={() => setBuildingModalOpen(true)}
        />

        <CompetitorComparisonTable
          competitors={competitors}
          onSelectCompetitor={selectCompetitor}
        />

        {/* Action buttons */}
        <HStack justify="center" gap={3} flexWrap="wrap" mt={10}>
          <Button
            variant="outline"
            fontSize="13px"
            fontWeight="600"
            borderColor="#e2e8f0"
            color="#374151"
            borderRadius="9px"
            px={4}
            h="38px"
            _hover={{ bg: "#f1f5f9" }}
          >
            Export full report
          </Button>
          <Button
            variant="outline"
            fontSize="13px"
            fontWeight="600"
            borderColor="#e2e8f0"
            color="#374151"
            borderRadius="9px"
            px={4}
            h="38px"
            _hover={{ bg: "#f1f5f9" }}
            onClick={resetAnalysis}
          >
            Run new analysis
          </Button>
        </HStack>

        <StartBuildingModal
          open={buildingModalOpen}
          onClose={() => setBuildingModalOpen(false)}
        />
      </Box>
    </Box>
  );
}
