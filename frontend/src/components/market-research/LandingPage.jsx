import { Box, Button, HStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { Navbar, NavLogo } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { FeaturePills } from "./FeaturePills";
import { SocialProof } from "./SocialProof";
import { PricingSection } from "./PricingSection";

export function LandingPage() {
  const goToInput = useMarketResearchStore((s) => s.goToInput);

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Navbar
        left={
          <HStack gap={0}>
            <NavLogo />
            <Button
              variant="ghost"
              size="sm"
              fontSize="13px"
              fontWeight="500"
              color="#52525b"
              ml={1}
              _hover={{ color: "#0f172a" }}
            >
              Pricing
            </Button>
          </HStack>
        }
        right={
          <HStack gap={2}>
            <Button
              variant="ghost"
              size="sm"
              fontSize="13px"
              fontWeight="500"
              color="#52525b"
              _hover={{ color: "#0f172a" }}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              bg="#0f172a"
              color="white"
              fontSize="13px"
              fontWeight="600"
              borderRadius="7px"
              px={3.5}
              h="32px"
              _hover={{ bg: "#1e293b" }}
              onClick={goToInput}
            >
              Get started free
            </Button>
          </HStack>
        }
      />

      <HeroSection />
      <FeaturePills />
      <SocialProof />
      <PricingSection />
    </Box>
  );
}
