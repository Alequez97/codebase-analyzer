import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowRight,
  BarChart2,
  CheckCircle,
  Lightbulb,
  ScanSearch,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCodebaseStore } from "../../store/useCodebaseStore";

const RESEARCH_STEPS = [
  { icon: BarChart2, label: "Market sizing & opportunity" },
  { icon: TrendingUp, label: "Competitor landscape" },
  { icon: CheckCircle, label: "Verdict: worth building?" },
];

export function EmptyProjectState() {
  const navigate = useNavigate();
  const { analyzeCodebase } = useCodebaseStore();

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="calc(100vh - 52px)"
      bg="gray.50"
      px={6}
    >
      <VStack gap={10} w="full" maxW="880px">
        {/* Headline */}
        <VStack gap={3} textAlign="center">
          <Badge
            colorPalette="violet"
            variant="subtle"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="xs"
            fontWeight="600"
            letterSpacing="wide"
            textTransform="uppercase"
          >
            Empty project detected
          </Badge>
          <Heading
            size="2xl"
            fontWeight="800"
            color="gray.900"
            letterSpacing="-0.5px"
          >
            Where do you want to start?
          </Heading>
          <Text fontSize="md" color="gray.500" maxW="520px" lineHeight="tall">
            This project has no source files yet. Choose a path — validate your
            idea first, or dive straight into building.
          </Text>
        </VStack>

        {/* Two-path cards */}
        <HStack
          gap={5}
          w="full"
          align="stretch"
          flexDirection={{ base: "column", md: "row" }}
        >
          {/* ── Market Research card (primary) ─────────────────────────── */}
          <Box
            flex="1"
            bg="white"
            borderWidth="2px"
            borderColor="violet.200"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 4px 24px rgba(109,40,217,.08)"
            position="relative"
          >
            {/* Top accent stripe */}
            <Box
              h="4px"
              bgGradient="to-r"
              gradientFrom="violet.400"
              gradientTo="blue.400"
            />

            <Box p={6}>
              <VStack align="start" gap={5}>
                {/* Header */}
                <HStack gap={3}>
                  <Box
                    p={2.5}
                    bg="violet.50"
                    borderRadius="xl"
                    color="violet.600"
                    flexShrink={0}
                  >
                    <Lightbulb size={22} strokeWidth={1.8} />
                  </Box>
                  <VStack align="start" gap={0.5}>
                    <HStack gap={2}>
                      <Text fontWeight="800" fontSize="lg" color="gray.900">
                        Market Research
                      </Text>
                      <Badge
                        colorPalette="violet"
                        variant="subtle"
                        borderRadius="full"
                        fontSize="9px"
                        px={2}
                        fontWeight="700"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        Recommended
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">
                      Validate your idea before writing a line of code
                    </Text>
                  </VStack>
                </HStack>

                <Separator borderColor="gray.100" />

                {/* What it does */}
                <VStack align="start" gap={3} w="full">
                  {RESEARCH_STEPS.map(({ icon: Icon, label }) => (
                    <HStack key={label} gap={3}>
                      <Box color="violet.400" flexShrink={0}>
                        <Icon size={15} strokeWidth={2} />
                      </Box>
                      <Text fontSize="sm" color="gray.600">
                        {label}
                      </Text>
                    </HStack>
                  ))}
                </VStack>

                {/* Flow hint */}
                <Box
                  w="full"
                  bg="violet.50"
                  borderRadius="lg"
                  px={4}
                  py={3}
                  borderWidth="1px"
                  borderColor="violet.100"
                >
                  <HStack gap={2} flexWrap="wrap">
                    {[
                      { label: "Research", dim: false },
                      { label: "→", dim: true },
                      { label: "Design", dim: false },
                      { label: "→", dim: true },
                      { label: "Code", dim: false },
                      { label: "→", dim: true },
                      { label: "Analyze", dim: false },
                      { label: "→", dim: true },
                      { label: "Maintain", dim: false },
                    ].map(({ label, dim }, i) => (
                      <Text
                        key={i}
                        fontSize="xs"
                        fontWeight={dim ? "400" : "600"}
                        color={dim ? "violet.300" : "violet.700"}
                      >
                        {label}
                      </Text>
                    ))}
                  </HStack>
                </Box>

                {/* CTA */}
                <Button
                  w="full"
                  size="lg"
                  colorPalette="violet"
                  borderRadius="xl"
                  fontWeight="700"
                  onClick={() => navigate("/market-research")}
                >
                  <Lightbulb size={16} />
                  Start Research
                  <ArrowRight size={15} />
                </Button>
                <Text
                  fontSize="xs"
                  color="gray.400"
                  textAlign="center"
                  w="full"
                >
                  AI-powered market validation in minutes
                </Text>
              </VStack>
            </Box>
          </Box>

          {/* ── Analyze existing codebase card (secondary) ─────────────── */}
          <Box
            flex="1"
            bg="white"
            borderWidth="1.5px"
            borderColor="gray.200"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 2px 8px rgba(0,0,0,.05)"
          >
            <Box h="4px" bg="gray.100" />

            <Box p={6}>
              <VStack align="start" gap={5}>
                {/* Header */}
                <HStack gap={3}>
                  <Box
                    p={2.5}
                    bg="blue.50"
                    borderRadius="xl"
                    color="blue.500"
                    flexShrink={0}
                  >
                    <ScanSearch size={22} strokeWidth={1.8} />
                  </Box>
                  <VStack align="start" gap={0.5}>
                    <Text fontWeight="800" fontSize="lg" color="gray.900">
                      Analyze Existing Code
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      You already have source files to audit
                    </Text>
                  </VStack>
                </HStack>

                <Separator borderColor="gray.100" />

                <VStack align="start" gap={3} w="full">
                  {[
                    { icon: ScanSearch, label: "Discover functional domains" },
                    { icon: BarChart2, label: "Surface bugs & security gaps" },
                    {
                      icon: CheckCircle,
                      label: "Identify missing test coverage",
                    },
                  ].map(({ icon: Icon, label }) => (
                    <HStack key={label} gap={3}>
                      <Box color="blue.400" flexShrink={0}>
                        <Icon size={15} strokeWidth={2} />
                      </Box>
                      <Text fontSize="sm" color="gray.600">
                        {label}
                      </Text>
                    </HStack>
                  ))}
                </VStack>

                <Box
                  w="full"
                  bg="blue.50"
                  borderRadius="lg"
                  px={4}
                  py={3}
                  borderWidth="1px"
                  borderColor="blue.100"
                >
                  <Text fontSize="xs" color="blue.600">
                    Point the tool at a directory that already contains source
                    files, then analyze.
                  </Text>
                </Box>

                <Button
                  w="full"
                  size="lg"
                  colorPalette="blue"
                  variant="outline"
                  borderRadius="xl"
                  fontWeight="700"
                  onClick={analyzeCodebase}
                >
                  <ScanSearch size={16} />
                  Analyze Codebase
                </Button>
                <Text
                  fontSize="xs"
                  color="gray.400"
                  textAlign="center"
                  w="full"
                >
                  Runs in the background — results appear automatically
                </Text>
              </VStack>
            </Box>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
}
