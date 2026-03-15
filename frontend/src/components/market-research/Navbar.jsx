import { Box, HStack, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";

/**
 * Shared top navigation shell.
 * Accepts `left`, `center`, and `right` as ReactNode slots.
 */
export function Navbar({ left, center, right }) {
  return (
    <Box
      as="nav"
      position="fixed"
      top="0"
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
