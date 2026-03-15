import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { Navbar, NavLogo } from "./Navbar";
import { IdeaInputCard } from "./IdeaInputCard";
import { SignInNotice } from "./SignInNotice";
import { InputStatsFooter } from "./InputStatsFooter";

export function IdeaInputPage() {
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);
  const goToInput = useMarketResearchStore((s) => s.goToInput);

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Navbar
        left={<NavLogo onClick={goToLanding} />}
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

      <Container maxW="680px" py={16} pt="80px">
        <VStack gap={8} align="stretch">
          {/* Page header */}
          <VStack gap={3} textAlign="center">
            <Heading
              fontSize="36px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              What&apos;s your{" "}
              <Box
                as="span"
                bg="linear-gradient(135deg, #6366f1, #a855f7)"
                bgClip="text"
                css={{ WebkitTextFillColor: "transparent" }}
              >
                idea?
              </Box>
            </Heading>
            <Text fontSize="14px" color="#64748b">
              Describe it below — we&apos;ll find competitors, map gaps, and
              give you a verdict.
            </Text>
          </VStack>

          <IdeaInputCard />
          <SignInNotice />
          <InputStatsFooter />
        </VStack>
      </Container>
    </Box>
  );
}
