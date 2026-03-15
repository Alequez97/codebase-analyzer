import { useState } from "react";
import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { Menu, Search, X } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

/**
 * Shared top navigation shell.
 * Accepts `left`, `center`, and `right` as ReactNode slots.
 */
export function Navbar({ left, center, right }) {
  return (
    <Box
      as="nav"
      position="fixed"
      top="52px"
      left="0"
      right="0"
      zIndex="100"
      bg="rgba(250,250,250,0.92)"
      backdropFilter="blur(8px)"
      borderBottomWidth="1px"
      borderColor="#e4e4e7"
      px={8}
      h="48px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
    >
      <HStack gap={0} flex="1">
        {left}
      </HStack>

      {center && (
        <HStack justify="center" flex="1">
          {center}
        </HStack>
      )}

      <HStack gap={2} flex="1" justify="flex-end">
        {right}
      </HStack>
    </Box>
  );
}

/**
 * Standard app navbar used across all market research pages.
 * Shows logo + nav links on desktop; collapses to burger on tablet/mobile.
 * Accepts `onLogoClick` and a `right` slot for page-specific actions.
 */
export function AppNavbar({ onLogoClick, right }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        as="nav"
        position="fixed"
        top="52px"
        left="0"
        right="0"
        zIndex="100"
        bg="rgba(250,250,250,0.92)"
        backdropFilter="blur(8px)"
        borderBottomWidth="1px"
        borderColor="#e4e4e7"
        px={{ base: 4, md: 8 }}
        h="48px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left: Logo + Nav links (desktop only) */}
        <HStack gap={0} flex="1">
          <NavLogo onClick={onLogoClick} />
        </HStack>

        {/* Right: page-specific actions (desktop only) */}
        {right && (
          <HStack
            display={{ base: "none", lg: "flex" }}
            gap={2}
            flex="1"
            justify="flex-end"
          >
            {right}
          </HStack>
        )}

        {/* Burger button (tablet + mobile) */}
        <Box display={{ base: "flex", lg: "none" }}>
          <Button
            variant="ghost"
            size="sm"
            color="#374151"
            borderRadius="7px"
            h="32px"
            w="32px"
            minW="32px"
            p={0}
            _hover={{ bg: "#f1f5f9" }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </Box>
      </Box>

      {/* Mobile / Tablet dropdown */}
      {open && (
        <Box
          display={{ base: "flex", lg: "none" }}
          flexDirection="column"
          position="fixed"
          top="100px"
          left="0"
          right="0"
          zIndex="99"
          bg="white"
          borderBottomWidth="1px"
          borderColor="#e4e4e7"
          boxShadow="0 4px 16px rgba(0,0,0,0.07)"
          px={4}
          py={3}
          gap={1}
        >
          {NAV_LINKS.map((label) => (
            <Button
              key={label}
              variant="ghost"
              justifyContent="flex-start"
              fontSize="14px"
              fontWeight="500"
              color="#374151"
              h="40px"
              borderRadius="8px"
              _hover={{ bg: "#f8fafc", color: "#0f172a" }}
              onClick={() => setOpen(false)}
            >
              {label}
            </Button>
          ))}
          {right && (
            <VStack
              align="stretch"
              gap={2}
              borderTopWidth="1px"
              borderColor="#f1f5f9"
              mt={1}
              pt={3}
            >
              {right}
            </VStack>
          )}
        </Box>
      )}
    </>
  );
}

/**
 * Reusable logo mark + brand name.
 */
export function NavLogo({ onClick }) {
  return (
    <HStack gap={2} cursor={onClick ? "pointer" : "default"} onClick={onClick}>
      <Box
        w="28px"
        h="28px"
        borderRadius="7px"
        bg="linear-gradient(135deg, #6366f1, #7c3aed)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
      >
        <Search size={14} strokeWidth={2.5} />
      </Box>
      <Text
        fontWeight="700"
        fontSize="14px"
        color="#0f172a"
        letterSpacing="-0.01em"
      >
        Researchio
        <Text
          as="sup"
          fontSize="8px"
          fontWeight="700"
          letterSpacing="0.08em"
          color="#6366f1"
          ml={0.5}
        >
          BETA
        </Text>
      </Text>
    </HStack>
  );
}

/**
 * Step-aware navbar for the market research flow.
 * Renders the correct right-slot and onLogoClick based on the current step.
 * Use this once in MarketResearchPage instead of copy-pasting AppNavbar in each page.
 */
export function MarketResearchNavbar() {
  const step = useMarketResearchStore((s) => s.step);
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);
  const goToInput = useMarketResearchStore((s) => s.goToInput);
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);

  const onLogoClick = step === "landing" ? undefined : goToLanding;

  let right;

  if (step === "landing" || step === "input") {
    right = (
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
      </HStack>
    );
  } else if (step === "analysis") {
    right = (
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
        _hover={{ bg: "#f1f5f9" }}
        onClick={resetAnalysis}
      >
        New Analysis
      </Button>
    );
  } else if (step === "summary") {
    right = (
      <HStack gap={2}>
        <HStack
          gap={2}
          px={2.5}
          py={1}
          borderRadius="7px"
          borderWidth="1px"
          borderColor="#e2e8f0"
          bg="white"
        >
          <Box
            w="20px"
            h="20px"
            borderRadius="50%"
            bg="linear-gradient(135deg, #6366f1, #7c3aed)"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="9px" fontWeight="700" color="white">
              J
            </Text>
          </Box>
          <Text fontSize="12px" fontWeight="500" color="#374151">
            john@example.com
          </Text>
          <Box
            px={1.5}
            py={0.5}
            borderRadius="4px"
            bg="#eff6ff"
            color="#2563eb"
            fontSize="10px"
            fontWeight="700"
          >
            Starter
          </Box>
        </HStack>
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
          _hover={{ bg: "#f1f5f9" }}
          onClick={resetAnalysis}
        >
          New Analysis
        </Button>
      </HStack>
    );
  }

  return <AppNavbar onLogoClick={onLogoClick} right={right} />;
}
