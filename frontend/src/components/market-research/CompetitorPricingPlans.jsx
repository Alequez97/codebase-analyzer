import { Badge, Box, Grid, HStack, Text } from "@chakra-ui/react";

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

export function CompetitorPricingPlans({ pricingPlans }) {
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
