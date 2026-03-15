import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowLeft, CheckCircle, ExternalLink, XCircle } from "lucide-react";

function CompetitorLogo({ competitor }) {
  return (
    <Box
      w="44px"
      h="44px"
      borderRadius="10px"
      bg={competitor.logoBg}
      borderWidth="1px"
      borderColor={`${competitor.logoColor}33`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <Text
        fontSize="11px"
        fontWeight="800"
        color={competitor.logoColor}
        letterSpacing="-0.02em"
      >
        {competitor.logoChar}
      </Text>
    </Box>
  );
}

function StatCard({ label, value }) {
  return (
    <Box
      bg="#f8fafc"
      borderRadius="10px"
      borderWidth="1px"
      borderColor="#f1f5f9"
      px={3.5}
      py={3}
    >
      <Text
        fontSize="9px"
        fontWeight="700"
        color="#94a3b8"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={1}
      >
        {label}
      </Text>
      <Text fontSize="13px" fontWeight="700" color="#0f172a" lineHeight="1.3">
        {value}
      </Text>
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="9px"
      fontWeight="700"
      color="#94a3b8"
      textTransform="uppercase"
      letterSpacing="0.08em"
      mb={3}
    >
      {children}
    </Text>
  );
}

function FeaturesCard({ features }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Features detected</SectionLabel>
      <VStack align="stretch" gap={4}>
        {features.map((group) => (
          <Box key={group.category}>
            <Text fontSize="11px" fontWeight="700" color="#475569" mb={1.5}>
              {group.category}
            </Text>
            <VStack align="stretch" gap={1}>
              {group.items.map((item) => (
                <HStack key={item} gap={2} align="start">
                  <Box
                    w="5px"
                    h="5px"
                    borderRadius="50%"
                    bg="#22c55e"
                    mt="5px"
                    flexShrink={0}
                  />
                  <Text fontSize="12px" color="#374151" lineHeight="1.5">
                    {item}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

function MissingFeaturesCard({ missingFeatures }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>What's missing</SectionLabel>
      <VStack align="stretch" gap={1.5}>
        {missingFeatures.map((item) => (
          <HStack key={item} gap={2} align="start">
            <Box mt="1px" flexShrink={0}>
              <XCircle size={13} color="#f87171" strokeWidth={2} />
            </Box>
            <Text fontSize="12px" color="#374151" lineHeight="1.5">
              {item}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Box mt={4} pt={4} borderTopWidth="1px" borderColor="#f1f5f9">
        <Text fontSize="11px" color="#94a3b8" fontStyle="italic">
          These gaps represent potential differentiation opportunities.
        </Text>
      </Box>
    </Box>
  );
}

function PricingPlansSection({ pricingPlans }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Pricing plans</SectionLabel>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: `repeat(${Math.min(pricingPlans.length, 2)}, 1fr)`,
          md: `repeat(${Math.min(pricingPlans.length, 4)}, 1fr)`,
        }}
        gap={3}
      >
        {pricingPlans.map((plan) => (
          <Box
            key={plan.name}
            borderRadius="10px"
            borderWidth={plan.highlight ? "2px" : "1px"}
            borderColor={plan.highlight ? "#6366f1" : "#e2e8f0"}
            bg={plan.highlight ? "#fafafe" : "#f8fafc"}
            p={3.5}
            position="relative"
          >
            {plan.highlight && (
              <Badge
                position="absolute"
                top="-10px"
                left="50%"
                transform="translateX(-50%)"
                bg="#6366f1"
                color="white"
                fontSize="9px"
                fontWeight="700"
                px={2}
                py={0.5}
                borderRadius="9999px"
                whiteSpace="nowrap"
              >
                Most popular
              </Badge>
            )}
            <Text
              fontSize="11px"
              fontWeight="700"
              color={plan.highlight ? "#6366f1" : "#374151"}
              mb={1.5}
            >
              {plan.name}
            </Text>
            <HStack gap={0} align="baseline" mb={1.5}>
              <Text
                fontSize="18px"
                fontWeight="800"
                color="#0f172a"
                lineHeight="1"
              >
                {plan.price}
              </Text>
              {plan.period && (
                <Text fontSize="10px" color="#94a3b8" ml={0.5}>
                  {plan.period}
                </Text>
              )}
            </HStack>
            <Text fontSize="11px" color="#64748b" lineHeight="1.5">
              {plan.note}
            </Text>
          </Box>
        ))}
      </Grid>
    </Box>
  );
}

function StrengthsWeaknessesSection({ strengths, weaknesses }) {
  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={5}
      >
        <SectionLabel>Strengths</SectionLabel>
        <VStack align="stretch" gap={2}>
          {strengths.map((item) => (
            <HStack key={item} gap={2.5} align="start">
              <Box mt="1px" flexShrink={0}>
                <CheckCircle size={13} color="#16a34a" strokeWidth={2} />
              </Box>
              <Text fontSize="12px" color="#374151" lineHeight="1.55">
                {item}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>

      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={5}
      >
        <SectionLabel>Weaknesses</SectionLabel>
        <VStack align="stretch" gap={2}>
          {weaknesses.map((item) => (
            <HStack key={item} gap={2.5} align="start">
              <Box mt="1px" flexShrink={0}>
                <XCircle size={13} color="#ef4444" strokeWidth={2} />
              </Box>
              <Text fontSize="12px" color="#374151" lineHeight="1.55">
                {item}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>
    </Grid>
  );
}

function CompanyInfoCard({ details, competitor }) {
  const linkEntries = Object.entries(details.links || {});

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Company info</SectionLabel>

      <Grid templateColumns="repeat(2, 1fr)" rowGap={3} columnGap={4}>
        {[
          { label: "Founded", value: details.founded },
          { label: "Country", value: details.country },
          { label: "Funding", value: details.funding },
          { label: "Employees", value: details.employees },
          { label: "Business model", value: details.business },
          { label: "Target market", value: details.targetMarket },
        ].map(({ label, value }) => (
          <Box key={label}>
            <Text
              fontSize="9px"
              fontWeight="700"
              color="#94a3b8"
              textTransform="uppercase"
              letterSpacing="0.06em"
              mb={0.5}
            >
              {label}
            </Text>
            <Text fontSize="12px" color="#374151">
              {value}
            </Text>
          </Box>
        ))}
      </Grid>

      {linkEntries.length > 0 && (
        <Box mt={4} pt={4} borderTopWidth="1px" borderColor="#f1f5f9">
          <Text
            fontSize="9px"
            fontWeight="700"
            color="#94a3b8"
            textTransform="uppercase"
            letterSpacing="0.06em"
            mb={2.5}
          >
            Links
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {linkEntries.map(([key, url]) => (
              <Button
                key={key}
                as="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="outline"
                fontSize="11px"
                fontWeight="500"
                color="#374151"
                borderColor="#e2e8f0"
                borderRadius="7px"
                h="26px"
                px={2.5}
                _hover={{ bg: "#f8fafc", borderColor: "#cbd5e1" }}
                textTransform="capitalize"
              >
                {key}
              </Button>
            ))}
          </HStack>
        </Box>
      )}
    </Box>
  );
}

export function CompetitorDetails({ competitor, onBack }) {
  const { details } = competitor;

  return (
    <VStack align="stretch" gap={5}>
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        alignSelf="start"
        fontSize="12px"
        fontWeight="600"
        color="#64748b"
        px={2}
        h="30px"
        _hover={{ bg: "#f1f5f9", color: "#0f172a" }}
        onClick={onBack}
      >
        <ArrowLeft size={13} style={{ marginRight: "6px" }} />
        Competitors
      </Button>

      {/* Header card */}
      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={5}
      >
        <HStack justify="space-between" align="start" mb={4}>
          <HStack gap={3}>
            <CompetitorLogo competitor={competitor} />
            <VStack align="start" gap={0.5}>
              <HStack gap={2}>
                <Text
                  fontSize="20px"
                  fontWeight="800"
                  color="#0f172a"
                  letterSpacing="-0.025em"
                >
                  {competitor.name}
                </Text>
                <Badge
                  bg="#dcfce7"
                  color="#15803d"
                  fontSize="10px"
                  fontWeight="600"
                  px={2}
                  py={0.5}
                  borderRadius="9999px"
                >
                  ✓ Done
                </Badge>
              </HStack>
              <Text fontSize="12px" color="#94a3b8">
                {competitor.url}
              </Text>
            </VStack>
          </HStack>

          <Button
            as="a"
            href={`https://${competitor.url}`}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="outline"
            fontSize="12px"
            fontWeight="600"
            borderColor="#e2e8f0"
            color="#374151"
            borderRadius="8px"
            h="32px"
            px={3}
            _hover={{ bg: "#f8fafc", borderColor: "#cbd5e1" }}
          >
            Visit site
            <ExternalLink size={12} style={{ marginLeft: "5px" }} />
          </Button>
        </HStack>

        <Text fontSize="13px" color="#374151" lineHeight="1.65" mb={4}>
          {competitor.description}
        </Text>

        {/* Stats row */}
        <Grid
          templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
          gap={3}
          mb={4}
        >
          <StatCard label="Customers" value={competitor.customers} />
          <StatCard label="Founded" value={details.founded} />
          <StatCard label="Country" value={details.country} />
          <StatCard label="Funding" value={details.funding} />
        </Grid>

        {/* Tags */}
        <HStack gap={1.5} flexWrap="wrap">
          {competitor.tags.map((tag) => (
            <Badge
              key={tag}
              bg="#f8fafc"
              borderWidth="1px"
              borderColor="#e2e8f0"
              color="#52525b"
              fontSize="10px"
              fontWeight="500"
              px={2}
              py={0.5}
              borderRadius="6px"
            >
              {tag}
            </Badge>
          ))}
        </HStack>
      </Box>

      {/* Features row */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        <FeaturesCard features={details.features} />
        <MissingFeaturesCard missingFeatures={details.missingFeatures} />
      </Grid>

      {/* Pricing */}
      <PricingPlansSection pricingPlans={details.pricingPlans} />

      {/* Strengths / Weaknesses */}
      <StrengthsWeaknessesSection
        strengths={details.strengths}
        weaknesses={details.weaknesses}
      />

      {/* Company info */}
      <CompanyInfoCard details={details} competitor={competitor} />
    </VStack>
  );
}
