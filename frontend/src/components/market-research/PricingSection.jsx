import {
  Badge,
  Box,
  Container,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertCircle, FlaskConical } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { PRICING_PLANS } from "./constants";
import { BillingToggle } from "./BillingToggle";
import { PricingCard } from "./PricingCard";

const IS_TEST_MODE = import.meta.env.VITE_PRICING_TEST_MODE === "true";

export function PricingSection() {
  const billingMode = useMarketResearchStore((s) => s.billingMode);
  const selectedPlan = useMarketResearchStore((s) => s.selectedPlan);
  const plans = PRICING_PLANS[billingMode];

  return (
    <Box
      bg="white"
      borderTopWidth="1px"
      borderColor="#f1f5f9"
      pt={10}
      pb={20}
      px={6}
    >
      <Container maxW="960px">
        <VStack gap={12} align="stretch">
          {/* Test mode banner */}
          {IS_TEST_MODE && (
            <HStack
              bg="#fffbeb"
              borderWidth="1px"
              borderColor="#fde68a"
              borderRadius="10px"
              p={3.5}
              gap={2.5}
              fontSize="12px"
              color="#92400e"
            >
              <FlaskConical size={14} style={{ flexShrink: 0 }} />
              <Text>
                <Text as="span" fontWeight="700">
                  Test mode active
                </Text>{" "}
                — click any plan to select it and test the subscription flow. No
                payment is processed.
                {selectedPlan && (
                  <Text as="span" fontWeight="600" ml={1}>
                    Active plan: {selectedPlan.name} (~
                    {selectedPlan.numCompetitors} competitors/report)
                  </Text>
                )}
              </Text>
            </HStack>
          )}
          <VStack gap={5} textAlign="center">
            <Text
              fontSize="11px"
              fontWeight="700"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="#6366f1"
            >
              PRICING
            </Text>
            <Heading
              fontSize="30px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              Simple, credit-based pricing
            </Heading>
            <Text fontSize="14px" color="#64748b">
              Each report costs 1 credit. Credits come with your plan — top up
              anytime.
            </Text>
            <HStack gap={1.5} fontSize="12px" color="#94a3b8">
              <AlertCircle size={12} />
              <Text>
                Credits reset monthly. Unused credits do not roll over.
              </Text>
            </HStack>
            <BillingToggle />
          </VStack>

          {/* Plans grid */}
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            }}
            gap={3.5}
            w="full"
          >
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </Grid>

          {/* Top-up note */}
          <HStack
            bg="#f8fafc"
            borderWidth="1px"
            borderColor="#e2e8f0"
            borderRadius="10px"
            p={4}
            gap={2.5}
            fontSize="12px"
            color="#64748b"
            align="center"
          >
            <Badge
              bg="#fef3c7"
              color="#92400e"
              fontSize="11px"
              fontWeight="700"
              px={2}
              py={0.5}
              borderRadius="5px"
            >
              Top-up
            </Badge>
            <Text>
              Need more credits mid-month? Buy{" "}
              <Text as="span" fontWeight="600" color="#0f172a">
                5 extra credits for $5
              </Text>{" "}
              on any paid plan — no plan change needed.
            </Text>
          </HStack>

          <Text fontSize="12px" color="#94a3b8" textAlign="center">
            All paid plans include a 7-day free trial. Cancel anytime.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
