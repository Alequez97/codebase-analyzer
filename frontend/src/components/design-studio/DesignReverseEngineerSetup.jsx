import { useState } from "react";
import { Box, Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { ScanLine } from "lucide-react";
import { ModelSelector } from "../FloatingChat/ModelSelector";

const EXAMPLES = [
  "Admin panel — all pages and sub-pages",
  "The checkout flow — cart, shipping, payment, and confirmation",
  "User management and roles pages",
];

export function DesignReverseEngineerSetup({
  isSubmitting,
  selectedModel,
  onModelChange,
  defaultModelLabel,
  onReverseEngineer,
  onDesignFromScratch,
}) {
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed) return;
    onReverseEngineer(trimmed);
  };

  const canSubmit = !isSubmitting && description.trim().length > 0;

  const bg = "linear-gradient(180deg, #fffaf3 0%, #f7fbff 44%, #eef5ff 100%)";

  return (
    <Box
      minH="calc(100vh - 49px)"
      bg={bg}
      position="relative"
      overflow="hidden"
      px={{ base: 4, md: 8 }}
      py={{ base: 8, md: 14 }}
    >
      {/* Background glows */}
      <Box
        position="absolute"
        top="-100px"
        right="-60px"
        w="320px"
        h="320px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0) 70%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-140px"
        left="-100px"
        w="380px"
        h="380px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 72%)"
        pointerEvents="none"
      />

      <VStack gap={8} maxW="760px" mx="auto">
        {/* Header */}
        <VStack gap={3} textAlign="center">
          <HStack
            gap={2}
            px={3}
            py={1.5}
            borderRadius="full"
            bg="rgba(251,191,36,0.14)"
            borderWidth="1px"
            borderColor="rgba(251,191,36,0.3)"
          >
            <ScanLine size={13} color="#b45309" />
            <Text
              fontSize="11px"
              fontWeight="800"
              color="orange.700"
              textTransform="uppercase"
              letterSpacing="0.1em"
            >
              Reverse Engineer
            </Text>
          </HStack>

          <Text
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight={{ base: "1.05", md: "0.97" }}
            letterSpacing="-0.055em"
            fontWeight="700"
            fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
            color="gray.900"
          >
            Recreate your existing UI
          </Text>
          <Text fontSize="md" color="gray.500" maxW="500px" lineHeight="1.65">
            Describe what part of the app to replicate. The AI scans your
            codebase, finds the relevant pages and styles, and produces a
            standalone buildable prototype with mock data.
          </Text>
        </VStack>

        {/* Main card */}
        <Box
          w="full"
          borderRadius="28px"
          bg="rgba(255,255,255,0.82)"
          borderWidth="1px"
          borderColor="rgba(148,163,184,0.22)"
          boxShadow="0 28px 72px rgba(15,23,42,0.09)"
          backdropFilter="blur(18px)"
          overflow="hidden"
        >
          <VStack align="stretch" gap={0}>
            <Box px={6} pt={6} pb={4}>
              <Box
                borderRadius="20px"
                borderWidth="1px"
                borderColor="rgba(148,163,184,0.28)"
                bg="white"
                overflow="hidden"
                _focusWithin={{
                  borderColor: "orange.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
                }}
              >
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  minH="140px"
                  resize="none"
                  placeholder="e.g. Admin panel — all pages and sub-pages"
                  borderRadius="0"
                  borderWidth="0"
                  bg="transparent"
                  px={5}
                  pt={4}
                  pb={3}
                  fontSize="md"
                  lineHeight="1.75"
                  disabled={isSubmitting}
                  _focusVisible={{ boxShadow: "none" }}
                  _disabled={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </Box>

              {/* Example chips */}
              <HStack gap={2} mt={3} flexWrap="wrap">
                <Text fontSize="xs" color="gray.400" flexShrink={0}>
                  Try:
                </Text>
                {EXAMPLES.map((ex) => (
                  <Box
                    key={ex}
                    as="button"
                    onClick={() => setDescription(ex)}
                    px={3}
                    py={1}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor="rgba(148,163,184,0.3)"
                    bg="rgba(248,250,252,0.8)"
                    fontSize="xs"
                    color="gray.600"
                    fontWeight="500"
                    cursor="pointer"
                    _hover={{
                      borderColor: "orange.300",
                      bg: "orange.50",
                      color: "orange.800",
                    }}
                    transition="all 0.12s"
                    textAlign="left"
                  >
                    {ex}
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Footer controls */}
            <HStack
              px={6}
              py={4}
              justify="space-between"
              align={{ base: "start", md: "center" }}
              flexDirection={{ base: "column", md: "row" }}
              gap={4}
              borderTopWidth="1px"
              borderColor="rgba(148,163,184,0.14)"
              bg="rgba(248,250,252,0.6)"
            >
              <Box minW={{ base: "full", md: "240px" }}>
                <Text
                  fontSize="9px"
                  fontWeight="800"
                  color="gray.500"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                  mb={1.5}
                >
                  Model
                </Text>
                <ModelSelector
                  value={selectedModel}
                  onChange={onModelChange}
                  defaultLabel={defaultModelLabel}
                />
              </Box>

              <Button
                bg="gray.950"
                color="white"
                borderRadius="full"
                px={6}
                _hover={{ bg: "black" }}
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!canSubmit}
                w={{ base: "full", md: "auto" }}
              >
                <ScanLine size={15} />
                Start Reverse Engineering
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Design from scratch link */}
        <HStack
          gap={1}
          opacity={0.6}
          _hover={{ opacity: 1 }}
          transition="opacity 0.15s"
        >
          <Text fontSize="sm" color="gray.500">
            Starting a new design?
          </Text>
          <Button
            variant="ghost"
            size="sm"
            color="gray.600"
            fontWeight="700"
            px={1}
            h="auto"
            py={0}
            _hover={{
              color: "gray.900",
              bg: "transparent",
              textDecoration: "underline",
            }}
            onClick={onDesignFromScratch}
          >
            Design from scratch →
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
