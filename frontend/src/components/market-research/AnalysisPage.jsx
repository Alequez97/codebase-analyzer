import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { Navbar, NavLogo } from "./Navbar";
import { CompetitorsGrid } from "./CompetitorsGrid";
import { ActivityFeed } from "./ActivityFeed";
import { AnalysisStatsBar } from "./AnalysisStatsBar";

function AnalyzingBadge() {
  const competitors = useMarketResearchStore((s) => s.competitors);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const isAnalysisComplete = useMarketResearchStore(
    (s) => s.isAnalysisComplete,
  );
  const doneCount = competitors.filter((c) => c.status === "done").length;
  const total = competitors.length;

  if (isAnalysisComplete) {
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        bg="#dcfce7"
        color="#15803d"
        borderRadius="9999px"
        px={3}
        py={1}
        fontSize="11px"
        fontWeight="600"
      >
        ✓ Analysis complete — {total} competitors analyzed
      </Badge>
    );
  }

  if (isAnalyzing && total > 0) {
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        bg="#eff6ff"
        color="#1d4ed8"
        borderRadius="9999px"
        px={3}
        py={1}
        fontSize="11px"
        fontWeight="600"
      >
        <Box
          w="6px"
          h="6px"
          borderRadius="50%"
          bg="#3b82f6"
          css={{
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.4 },
            },
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        Analyzing — {doneCount} of {total} complete
      </Badge>
    );
  }

  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      bg="#f1f5f9"
      color="#64748b"
      borderRadius="9999px"
      px={3}
      py={1}
      fontSize="11px"
      fontWeight="600"
    >
      Starting analysis...
    </Badge>
  );
}

export function AnalysisPage() {
  const idea = useMarketResearchStore((s) => s.idea);
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);

  return (
    <Box minH="100vh" bg="#f8fafc" display="flex" flexDir="column">
      <Navbar
        left={<NavLogo onClick={goToLanding} />}
        center={<AnalyzingBadge />}
        right={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              fontSize="12px"
              fontWeight="600"
              borderColor="#e2e8f0"
              color="#374151"
              borderRadius="7px"
              px={3}
              h="30px"
              _hover={{ bg: "#f8fafc" }}
              onClick={resetAnalysis}
            >
              New Analysis
            </Button>
          </HStack>
        }
      />

      {/* Main content area — fills viewport below nav */}
      <Box
        display="flex"
        flex="1"
        mt="48px"
        overflow="hidden"
        h="calc(100vh - 48px - 56px)"
      >
        {/* Left: competitors scroll area */}
        <Box flex="1" overflowY="auto" p={6}>
          <VStack align="stretch" gap={5} maxW="1000px">
            <Box>
              <Text
                fontSize="22px"
                fontWeight="800"
                color="#0f172a"
                letterSpacing="-0.02em"
              >
                Market Analysis
              </Text>
              {idea && (
                <Text
                  fontSize="12px"
                  color="#64748b"
                  mt={1}
                  lineHeight="1.5"
                  maxW="600px"
                >
                  <Text as="span" fontWeight="600" color="#374151">
                    Analyzing:
                  </Text>{" "}
                  {idea}
                </Text>
              )}
            </Box>

            <CompetitorsGrid />
          </VStack>
        </Box>

        {/* Right: activity feed */}
        <ActivityFeed />
      </Box>

      {/* Bottom stats bar */}
      <AnalysisStatsBar />
    </Box>
  );
}
