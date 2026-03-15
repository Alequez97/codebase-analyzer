import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { Activity, CheckCircle } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { MOCK_COMPETITORS } from "./constants";

// ---------------------------------------------------------------------------
// Hero section — dark indigo card with stats
// ---------------------------------------------------------------------------

const HERO_STATS = [
  { value: "7", label: "Competitors analyzed" },
  { value: "$25–$150", label: "Avg. pricing/seat" },
  { value: "5.6M+", label: "Total users" },
  { value: "4 min", label: "Analysis time" },
];

function HeroBanner({ idea }) {
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
        {HERO_STATS.map((stat) => (
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
// Opportunity card
// ---------------------------------------------------------------------------

const OPPORTUNITY_DIFFERENTIATORS = [
  {
    label: "AI-powered auto-fix",
    detail:
      "None of the competitors offer contextual, AI-driven code fixes beyond basic suggestions",
  },
  {
    label: "Logic bug detection",
    detail:
      "Current tools focus on known CVEs; gap exists for algorithmic and edge-case error detection",
  },
  {
    label: "Test generation",
    detail:
      "No competitor generates test cases; opportunity for AI-suggested unit/integration tests",
  },
  {
    label: "Usage-based pricing",
    detail:
      "Avoid per-seat model; charge per analysis or LOC scanned to lower barrier to entry",
  },
  {
    label: "Developer UX first",
    detail:
      "Snyk leads here; match or exceed their Git integration and PR workflow polish",
  },
];

function OpportunityCard() {
  return (
    <Box
      bg="white"
      borderWidth="1.5px"
      borderColor="#86efac"
      borderRadius="14px"
      p={6}
      mb={6}
    >
      {/* Header row */}
      <HStack gap={3} mb={4} align="start">
        <Box color="#16a34a" flexShrink={0} mt="1px">
          <CheckCircle size={22} strokeWidth={2.5} />
        </Box>
        <Box>
          <Text fontSize="16px" fontWeight="800" color="#15803d" mb={0.5}>
            Worth entering this market
          </Text>
          <Text fontSize="12px" color="#64748b" fontWeight="500">
            High confidence · Based on 7 competitor analyses
          </Text>
        </Box>
      </HStack>

      {/* Opportunity summary */}
      <Box mb={4} pl={9}>
        <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={1}>
          Market opportunity identified:
        </Text>
        <Text fontSize="13px" color="#374151" lineHeight="1.65">
          All existing competitors focus heavily on security scanning (CVE
          detection, dependency vulnerabilities) but lack AI-powered contextual
          bug fixes and logic error detection. Pricing ranges from
          $25–$150/dev/month, creating an opening for usage-based or freemium
          models.
        </Text>
      </Box>

      {/* Differentiators */}
      <Box pl={9}>
        <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={2.5}>
          Key differentiators to pursue:
        </Text>
        <VStack align="start" gap={2}>
          {OPPORTUNITY_DIFFERENTIATORS.map((item) => (
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
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Full competitive landscape table
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = [
  { key: "competitor", label: "Competitor", flex: 2.2 },
  { key: "pricing", label: "Pricing", flex: 1.2 },
  { key: "users", label: "Users", flex: 1 },
  { key: "aiAutoFix", label: "AI Auto-Fix", flex: 1.2 },
  { key: "logicBugs", label: "Logic Bugs", flex: 1.2 },
  { key: "testGen", label: "Test Gen", flex: 1 },
  { key: "marketPosition", label: "Market Position", flex: 1.3 },
];

const COMPETITOR_TABLE_META = {
  snyk: {
    pricing: "$25/dev/mo",
    users: "2.5M+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "Weak", bg: "#fff7ed", color: "#c2410c" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Leader", bg: "#f0fdf4", color: "#15803d" },
  },
  sonarqube: {
    pricing: "$150/mo team",
    users: "400K+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "Partial", bg: "#fff7ed", color: "#b45309" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Strong", bg: "#f0fdf4", color: "#15803d" },
  },
  codeclimate: {
    pricing: "$16/seat/mo",
    users: "100K+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Niche", bg: "#f8fafc", color: "#475569" },
  },
  deepsource: {
    pricing: "$30/dev/mo",
    users: "50K+",
    aiAutoFix: { label: "Basic", bg: "#fefce8", color: "#a16207" },
    logicBugs: { label: "Partial", bg: "#fff7ed", color: "#b45309" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Growing", bg: "#f0fdfa", color: "#0f766e" },
  },
  ghas: {
    pricing: "$49/user/mo",
    users: "1.2M+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "Weak", bg: "#fff7ed", color: "#c2410c" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Leader", bg: "#f0fdf4", color: "#15803d" },
  },
  codescene: {
    pricing: "$90/dev/mo",
    users: "20K+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "Behavioral", bg: "#f5f3ff", color: "#7c3aed" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Niche", bg: "#f8fafc", color: "#475569" },
  },
  qodana: {
    pricing: "$3.30/user/mo",
    users: "150K+",
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "Partial", bg: "#fff7ed", color: "#b45309" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "IDE-focused", bg: "#f8fafc", color: "#475569" },
  },
};

function StatusBadge({ badge }) {
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={0.5}
      borderRadius="5px"
      fontSize="11px"
      fontWeight="600"
      bg={badge.bg}
      color={badge.color}
    >
      {badge.label}
    </Box>
  );
}

function CompetitorTableRow({ competitor }) {
  const meta = COMPETITOR_TABLE_META[competitor.id] ?? {
    pricing: competitor.pricing + competitor.pricingPeriod,
    users: competitor.customers,
    aiAutoFix: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    logicBugs: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    testGen: { label: "No", bg: "#fef2f2", color: "#dc2626" },
    marketPosition: { label: "Niche", bg: "#f8fafc", color: "#475569" },
  };

  return (
    <HStack
      px={4}
      py={3}
      borderBottomWidth="1px"
      borderColor="#f1f5f9"
      _last={{ borderBottomWidth: 0 }}
      gap={0}
      _hover={{ bg: "#fafafa" }}
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
          {meta.pricing}
        </Text>
      </Box>

      {/* Users */}
      <Box flex={TABLE_COLUMNS[2].flex}>
        <Text fontSize="12px" fontWeight="600" color="#374151">
          {meta.users}
        </Text>
      </Box>

      {/* AI Auto-Fix */}
      <Box flex={TABLE_COLUMNS[3].flex}>
        <StatusBadge badge={meta.aiAutoFix} />
      </Box>

      {/* Logic Bugs */}
      <Box flex={TABLE_COLUMNS[4].flex}>
        <StatusBadge badge={meta.logicBugs} />
      </Box>

      {/* Test Gen */}
      <Box flex={TABLE_COLUMNS[5].flex}>
        <StatusBadge badge={meta.testGen} />
      </Box>

      {/* Market Position */}
      <Box flex={TABLE_COLUMNS[6].flex}>
        <StatusBadge badge={meta.marketPosition} />
      </Box>
    </HStack>
  );
}

function FullComparisonTable() {
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

        {MOCK_COMPETITORS.map((c) => (
          <CompetitorTableRow key={c.id} competitor={c} />
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
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Box maxW="1040px" mx="auto" px={6} pt="72px" pb={16}>
        {/* Hero banner */}
        <HeroBanner idea={idea} />

        {/* Opportunity verdict card */}
        <OpportunityCard />

        {/* Full competitive landscape table */}
        <FullComparisonTable />

        {/* Action buttons */}
        <HStack justify="center" gap={3} flexWrap="wrap" mt={10}>
          <Button
            bg="linear-gradient(135deg, #6366f1, #7c3aed)"
            color="white"
            fontSize="13px"
            fontWeight="700"
            borderRadius="9px"
            px={5}
            h="38px"
            _hover={{ opacity: 0.9 }}
          >
            Start building →
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
      </Box>
    </Box>
  );
}
