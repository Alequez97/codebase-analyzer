import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

export function PricingCard({ plan }) {
  const goToInput = useMarketResearchStore((s) => s.goToInput);

  return (
    <Box
      position="relative"
      bg="white"
      borderWidth="1px"
      borderColor={plan.featured ? "#6366f1" : "#e2e8f0"}
      borderRadius="14px"
      p={5}
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: "0 6px 20px rgba(0,0,0,.06)" }}
      boxShadow={
        plan.featured
          ? "0 0 0 4px rgba(99,102,241,.08), 0 8px 24px rgba(99,102,241,.12)"
          : "none"
      }
    >
      {plan.featured && (
        <Badge
          position="absolute"
          top="-11px"
          left="50%"
          transform="translateX(-50%)"
          bg="linear-gradient(135deg, #6366f1, #8b5cf6)"
          color="white"
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.06em"
          textTransform="uppercase"
          px={3}
          py={0.5}
          borderRadius="9999px"
          whiteSpace="nowrap"
        >
          Most popular
        </Badge>
      )}

      <VStack align="start" gap={3}>
        <Text fontSize="13px" fontWeight="700" color="#0f172a">
          {plan.name}
        </Text>

        <Badge
          display="inline-flex"
          alignItems="center"
          gap={1}
          bg="#f5f3ff"
          color="#6366f1"
          borderRadius="6px"
          px={2}
          py={0.5}
          fontSize="11px"
          fontWeight="600"
        >
          {plan.credits}
        </Badge>

        <HStack gap={0.5} align="baseline">
          <Text
            fontSize="30px"
            fontWeight="800"
            color="#0f172a"
            letterSpacing="-0.03em"
          >
            ${plan.price}
          </Text>
          <Text fontSize="12px" color="#94a3b8" fontWeight="400">
            /mo
          </Text>
        </HStack>

        <Text fontSize="12px" color="#64748b" lineHeight="1.4" minH="36px">
          {plan.tagline}
        </Text>

        <Button
          w="full"
          h="34px"
          borderRadius="8px"
          fontSize="12px"
          fontWeight="600"
          bg={
            plan.ctaStyle === "primary"
              ? "linear-gradient(135deg, #6366f1, #7c3aed)"
              : "white"
          }
          color={plan.ctaStyle === "primary" ? "white" : "#374151"}
          borderWidth={plan.ctaStyle === "outline" ? "1px" : "0"}
          borderColor="#e2e8f0"
          boxShadow={
            plan.ctaStyle === "primary"
              ? "0 2px 8px rgba(99,102,241,.3)"
              : "none"
          }
          _hover={{
            opacity: plan.ctaStyle === "primary" ? 0.9 : 1,
            bg: plan.ctaStyle === "outline" ? "#f8fafc" : undefined,
            borderColor: plan.ctaStyle === "outline" ? "#cbd5e1" : undefined,
          }}
          onClick={goToInput}
        >
          {plan.cta}
        </Button>

        <Box h="1px" bg="#f1f5f9" w="full" my={1} />

        <VStack align="start" gap={2} w="full">
          {plan.features.map((feat) => (
            <HStack
              key={feat.text}
              align="flex-start"
              gap={1.5}
              fontSize="11.5px"
              lineHeight="1.45"
              color={feat.included ? "#374151" : "#94a3b8"}
            >
              {feat.included ? (
                <Check
                  size={12}
                  color="#16a34a"
                  strokeWidth={2.5}
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
              ) : (
                <X
                  size={12}
                  color="#cbd5e1"
                  strokeWidth={2.5}
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
              )}
              <Text>{feat.text}</Text>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}
