import { useState } from "react";
import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { LogOut, Menu, Search, User, X } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { useAuthStore } from "../../store/useAuthStore";

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
      {open && right && (
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
          <VStack align="stretch" gap={2}>
            {right}
          </VStack>
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
  const goToProfile = useMarketResearchStore((s) => s.goToProfile);
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);

  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const onLogoClick = step === "landing" ? undefined : goToLanding;

  const showNewAnalysis = step === "analysis" || step === "summary";

  const authControls = user ? (
    <Box
      display="flex"
      flexDirection={{ base: "column", lg: "row" }}
      gap={1.5}
      w={{ base: "100%", lg: "auto" }}
      alignItems={{ base: "stretch", lg: "center" }}
    >
      <HStack
        gap={1.5}
        px={2.5}
        py={1}
        borderRadius="7px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        bg="white"
        minW={0}
        cursor="pointer"
        _hover={{ bg: "#f8fafc", borderColor: "#c7d2fe" }}
        transition="all 0.12s"
        onClick={goToProfile}
      >
        <Box
          w="20px"
          h="20px"
          borderRadius="50%"
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <User size={11} color="white" strokeWidth={2.5} />
        </Box>
        <Text
          fontSize="12px"
          fontWeight="500"
          color="#374151"
          maxW="140px"
          truncate
        >
          {user.email}
        </Text>
      </HStack>
      <Button
        size="sm"
        variant="ghost"
        fontSize="12px"
        fontWeight="500"
        color="#64748b"
        borderRadius="7px"
        px={2}
        h="30px"
        gap={1}
        _hover={{ bg: "#fef2f2", color: "#dc2626" }}
        onClick={signOut}
        w={{ base: "100%", lg: "auto" }}
      >
        <LogOut size={13} />
        Sign out
      </Button>
    </Box>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      fontSize="13px"
      fontWeight="500"
      color="#52525b"
      borderRadius="7px"
      h="30px"
      px={3}
      w={{ base: "100%", lg: "auto" }}
      _hover={{ color: "#0f172a", bg: "#f8fafc" }}
      onClick={() => signIn({ email: "demo@example.com", name: "Demo User" })}
    >
      Sign in
    </Button>
  );

  return <AppNavbar onLogoClick={onLogoClick} right={authControls} />;
}
