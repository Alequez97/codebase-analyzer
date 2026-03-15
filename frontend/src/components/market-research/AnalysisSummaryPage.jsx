import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Activity, CheckCircle, Code2, GitBranch, Wrench, Zap } from "lucide-react";
import { useState } from "react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorDetails } from "./CompetitorDetails";

// ---------------------------------------------------------------------------
// Hero section — dark indigo card with stats
// ---------------------------------------------------------------------------

function HeroBanner({ idea, competitorCount }) {
  const heroStats = [
    { value: String(competitorCount ?? 0), label: "Competitors analyzed" },
    { value: "High", label: "Confidence level" },
  ];
  return (
    <Box
      bg="linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)"
      borderRadius="16px"
      p={6}
      mb={6}
      position="relative"
      overflow="hidden"
    >
      {/* Background subtle grid */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.04}
        backgroundImage="radial-gradient(circle, white 1px, transparent 1px)"
        backgroundSize="24px 24px"
        pointerEvents="none"
      />

      {/* Analysis complete badge */}
      <Box position="absolute" top={5} right={5}>
        <HStack
          gap={1.5}
          bg="rgba(22,163,74,0.18)"
          borderWidth="1px"
          borderColor="rgba(22,163,74,0.4)"
          borderRadius="20px"
          px={3}
          py={1}
        >
          <Box w="6px" h="6px" borderRadius="50%" bg="#4ade80" />
          <Text fontSize="11px" fontWeight="600" color="#4ade80">
            Analysis complete
          </Text>
        </HStack>
      </Box>

      {/* Title */}
      <HStack gap={2.5} mb={2}>
        <Box color="#818cf8">
          <Activity size={18} strokeWidth={2} />
        </Box>
        <Text
          fontSize="20px"
          fontWeight="800"
          color="white"
          letterSpacing="-0.02em"
        >
          Market Analysis Complete
        </Text>
      </HStack>

      {/* Idea subtitle */}
      {idea && (
        <Text fontSize="13px" color="#c7d2fe" mb={5} maxW="520px">
          {idea}
        </Text>
      )}

      {/* Stats row */}
      <HStack gap={3} flexWrap="wrap">
        {heroStats.map((stat) => (
          <Box
            key={stat.label}
            bg="rgba(255,255,255,0.07)"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.1)"
            borderRadius="10px"
            px={4}
            py={3}
            minW="120px"
          >
            <Text
              fontSize="22px"
              fontWeight="800"
              color="white"
              letterSpacing="-0.02em"
              lineHeight="1.1"
            >
              {stat.value}
            </Text>
            <Text
              fontSize="10px"
              fontWeight="600"
              color="#94a3b8"
              mt={0.5}
              textTransform="uppercase"
              letterSpacing="0.04em"
            >
              {stat.label}
            </Text>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Start Building modal
// ---------------------------------------------------------------------------

const PLATFORM_FEATURES = [
  {
    icon: Code2,
    title: "AI Codebase Analyzer",
    description:
      "Deep static analysis powered by Claude — finds logic bugs, security issues, and dead code across your entire repo.",
  },
  {
    icon: Zap,
    title: "Auto-Fix Engine",
    description:
      "One-click AI fixes with full context. No copy-pasting from ChatGPT — changes land directly in your codebase.",
  },
  {
    icon: GitBranch,
    title: "PR-level Review",
    description:
      "Every pull request gets an AI reviewer that understands your architecture and flags real problems, not noise.",
  },
  {
    icon: Wrench,
    title: "Ongoing Maintenance",
    description:
      "Continuous refactor suggestions, dependency upgrades, and tech-debt tracking — your codebase stays healthy automatically.",
  },
];

function StartBuildingModal({ open, onClose }) {
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => !open && onClose()} size="lg" motionPreset="slide-in-bottom">
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="20px" overflow="hidden" mx={4}>
            {/* Header */}
            <Box
              bg="linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)"
              px={7}
              py={6}
            >
              <HStack justify="space-between" align="start">
                <Box>
                  <Text
                    fontSize="22px"
                    fontWeight="800"
                    color="white"
                    letterSpacing="-0.02em"
                    mb={1}
                  >
                    Build it with JFS
                  </Text>
                  <Text fontSize="13px" color="rgba(255,255,255,0.75)" fontWeight="500">
                    The AI platform that builds, maintains, and analyzes your code
                  </Text>
                </Box>
                <CloseButton
                  size="sm"
                  color="white"
                  opacity={0.7}
                  _hover={{ opacity: 1, bg: "whiteAlpha.200" }}
                  onClick={onClose}
                />
              </HStack>
            </Box>

            {/* Body */}
            <Dialog.Body px={7} py={6} bg="white">
              <Text fontSize="13px" color="#64748b" mb={5} lineHeight="1.6">
                Your market research shows a clear gap. JFS gives you the exact
                AI-powered tools to fill it — from day one to production.
              </Text>

              <VStack gap={4} align="stretch">
                {PLATFORM_FEATURES.map(({ icon: Icon, title, description }) => (
                  <HStack key={title} gap={4} align="start">
                    <Box
                      w="38px"
                      h="38px"
                      borderRadius="10px"
                      bg="linear-gradient(135deg, #ede9fe, #ddd6fe)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      color="#7c3aed"
                    >
                      <Icon size={17} strokeWidth={2} />
                    </Box>
                    <Box>
                      <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={0.5}>
                        {title}
                      </Text>
                      <Text fontSize="12px" color="#64748b" lineHeight="1.55">
                        {description}
                      </Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </Dialog.Body>

            {/* Footer */}
            <Box
              px={7}
              py={5}
              borderTopWidth="1px"
              borderColor="#f1f5f9"
              bg="white"
            >
              <Button
                w="full"
                h="44px"
                bg="linear-gradient(135deg, #6366f1, #7c3aed)"
                color="white"
                fontSize="14px"
                fontWeight="700"
                borderRadius="11px"
                _hover={{ opacity: 0.9 }}
                mb={2.5}
              >
                Get early access →
              </Button>
              <Text textAlign="center" fontSize="11px" color="#94a3b8">
                Free to start · No credit card required
              </Text>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Opportunity card
// ---------------------------------------------------------------------------

const VERDICT_STYLES = {
  "worth-entering": { borderColor: "#86efac", iconColor: "#16a34a", labelColor: "#15803d", label: "Worth entering this market" },
  "risky": { borderColor: "#fcd34d", iconColor: "#d97706", labelColor: "#92400e", label: "Risky — proceed with caution" },
  "crowded": { borderColor: "#fca5a5", iconColor: "#dc2626", labelColor: "#991b1b", label: "Crowded market — tough entry" },
};

function OpportunityCard({ opportunity, competitorCount, onStartBuilding }) {
  const verdict = opportunity?.verdict ?? "worth-entering";
  const styles = VERDICT_STYLES[verdict] ?? VERDICT_STYLES["worth-entering"];
  const differentiators = opportunity?.differentiators ?? [];
  const summary = opportunity?.summary ?? "";
  const confidence = opportunity?.confidence ?? "high";

  return (
    <Box
      bg="white"
      borderWidth="1.5px"
      borderColor={styles.borderColor}
      borderRadius="14px"
      p={6}
      mb={6}
    >
      {/* Header row */}
      <HStack gap={3} mb={4} align="start">
        <Box color={styles.iconColor} flexShrink={0} mt="1px">
          <CheckCircle size={22} strokeWidth={2.5} />
        </Box>
        <Box>
          <Text fontSize="16px" fontWeight="800" color={styles.labelColor} mb={0.5}>
            {styles.label}
          </Text>
          <Text fontSize="12px" color="#64748b" fontWeight="500">
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence · Based on {competitorCount ?? 0} competitor {(competitorCount ?? 0) === 1 ? "analysis" : "analyses"}
          </Text>
        </Box>
      </HStack>

      {summary && (
        <Box mb={4} pl={9}>
          <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={1}>
            Market opportunity identified:
          </Text>
          <Text fontSize="13px" color="#374151" lineHeight="1.65">
            {summary}
          </Text>
        </Box>
      )}

      {differentiators.length > 0 && (
        <Box pl={9}>
          <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={2.5}>
            Key differentiators to pursue:
          </Text>
          <VStack align="start" gap={2}>
            {differentiators.map((item) => (
              <HStack key={item.label} align="start" gap={2.5}>
                <Text
                  fontSize="13px"
                  color="#16a34a"
                  fontWeight="700"
                  flexShrink={0}
                  mt="1px"
                >
                  ✓
                </Text>
                <Text fontSize="13px" color="#374151" lineHeight="1.55">
                  <Text as="span" fontWeight="700" color="#0f172a">
                    {item.label}
                  </Text>{" "}
                  —{" "}
                  <Text as="span" color="#4b5563">
                    {item.detail}
                  </Text>
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* CTA */}
      <Box mt={5}>
        <Button
          w="full"
          h="46px"
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          color="white"
          fontSize="14px"
          fontWeight="700"
          borderRadius="10px"
          _hover={{ opacity: 0.9 }}
          onClick={onStartBuilding}
        >
          Start building →
        </Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Full competitive landscape table
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = [
  { key: "competitor", label: "Competitor", flex: 2.2 },
  { key: "pricing", label: "Pricing", flex: 1.2 },
  { key: "customers", label: "Users", flex: 1 },
  { key: "tags", label: "Tags", flex: 2 },
];

function CompetitorTableRow({ competitor, onClick }) {
  return (
    <HStack
      px={4}
      py={3}
      borderBottomWidth="1px"
      borderColor="#f1f5f9"
      _last={{ borderBottomWidth: 0 }}
      gap={0}
      cursor="pointer"
      onClick={onClick}
      _hover={{ bg: "#f1f5f9" }}
    >
      {/* Competitor name */}
      <HStack gap={2.5} flex={TABLE_COLUMNS[0].flex} minW={0}>
        <Box
          w="28px"
          h="28px"
          borderRadius="7px"
          bg={competitor.logoBg}
          color={competitor.logoColor}
          fontWeight="800"
          fontSize="9px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {competitor.logoChar}
        </Box>
        <Text fontSize="13px" fontWeight="600" color="#0f172a" noOfLines={1}>
          {competitor.name}
        </Text>
      </HStack>

      {/* Pricing */}
      <Box flex={TABLE_COLUMNS[1].flex}>
        <Text fontSize="12px" fontWeight="600" color="#374151">
          {competitor.pricing}{competitor.pricingPeriod}
        </Text>
      </Box>

      {/* Customers */}
      <Box flex={TABLE_COLUMNS[2].flex}>
        <Text fontSize="12px" fontWeight="600" color="#374151">
          {competitor.customers}
        </Text>
      </Box>

      {/* Tags */}
      <HStack flex={TABLE_COLUMNS[3].flex} gap={1} flexWrap="wrap">
        {(competitor.tags ?? []).slice(0, 3).map((tag) => (
          <Box
            key={tag}
            px={2}
            py={0.5}
            borderRadius="5px"
            fontSize="10px"
            fontWeight="600"
            bg="#f1f5f9"
            color="#475569"
          >
            {tag}
          </Box>
        ))}
      </HStack>
    </HStack>
  );
}

function FullComparisonTable({ competitors, onSelectCompetitor }) {
  return (
    <Box>
      <Text fontSize="15px" fontWeight="700" color="#0f172a" mb={3}>
        Competitive Landscape — Full Comparison
      </Text>
      <Box
        borderWidth="1px"
        borderColor="#e2e8f0"
        borderRadius="12px"
        overflow="hidden"
        bg="white"
      >
        {/* Header */}
        <HStack
          px={4}
          py={2.5}
          bg="#f8fafc"
          borderBottomWidth="1px"
          borderColor="#e2e8f0"
          gap={0}
        >
          {TABLE_COLUMNS.map((col) => (
            <Text
              key={col.key}
              flex={col.flex}
              fontSize="10px"
              fontWeight="700"
              color="#94a3b8"
              textTransform="uppercase"
              letterSpacing="0.07em"
            >
              {col.label}
            </Text>
          ))}
        </HStack>

        {competitors.map((c) => (
          <CompetitorTableRow key={c.id} competitor={c} onClick={() => onSelectCompetitor(c.id)} />
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnalysisSummaryPage() {
  const idea = useMarketResearchStore((s) => s.idea);
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);
  const competitors = useMarketResearchStore((s) => s.competitors);
  const report = useMarketResearchStore((s) => s.report);
  const selectedCompetitorId = useMarketResearchStore((s) => s.selectedCompetitorId);
  const selectCompetitor = useMarketResearchStore((s) => s.selectCompetitor);
  const clearSelectedCompetitor = useMarketResearchStore((s) => s.clearSelectedCompetitor);
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
        {/* Hero banner */}
        <HeroBanner idea={idea} competitorCount={competitors.length} />

        {/* Opportunity verdict card */}
        <OpportunityCard
          opportunity={report?.opportunity}
          competitorCount={competitors.length}
          onStartBuilding={() => setBuildingModalOpen(true)}
        />

        {/* Full competitive landscape table */}
        <FullComparisonTable competitors={competitors} onSelectCompetitor={selectCompetitor} />

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
