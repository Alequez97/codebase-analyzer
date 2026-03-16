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
  CheckCircle,
  Code2,
  FolderPlus,
  LayoutTemplate,
  Rocket,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCodebaseStore } from "../../store/useCodebaseStore";

const NEW_PROJECT_STEPS = [
  { icon: LayoutTemplate, label: "Shape your first screens and flows" },
  { icon: Code2, label: "Generate structure before writing boilerplate" },
  { icon: Rocket, label: "Move from blank canvas to build-ready fast" },
];

const ANALYZE_STEPS = [
  { icon: ScanSearch, label: "Discover functional domains" },
  { icon: Sparkles, label: "Surface bugs and security gaps" },
  { icon: CheckCircle, label: "Identify missing test coverage" },
];

const BUILD_FLOW = [
  { label: "Idea", dim: false },
  { label: "->", dim: true },
  { label: "Design", dim: false },
  { label: "->", dim: true },
  { label: "Build", dim: false },
  { label: "->", dim: true },
  { label: "Analyze", dim: false },
];

function FeatureList({ items, color, textColor = "gray.700" }) {
  return (
    <VStack align="start" gap={3} w="full">
      {items.map(({ icon: Icon, label }) => (
        <HStack key={label} gap={3} align="start">
          <Box color={color} flexShrink={0} pt={0.5}>
            <Icon size={15} strokeWidth={2} />
          </Box>
          <Text fontSize="sm" color={textColor}>
            {label}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

export function EmptyProjectState() {
  const navigate = useNavigate();
  const { analyzeCodebase } = useCodebaseStore();

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="calc(100vh - 52px)"
      bg="linear-gradient(180deg, #fff8ef 0%, #f8fbff 52%, #f4f7fb 100%)"
      px={{ base: 4, md: 6 }}
      py={{ base: 10, md: 14 }}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="-120px"
        left="-80px"
        w="280px"
        h="280px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(255,186,73,0.28) 0%, rgba(255,186,73,0) 72%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-160px"
        right="-80px"
        w="340px"
        h="340px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 74%)"
        pointerEvents="none"
      />

      <VStack gap={10} w="full" maxW="980px" position="relative">
        <VStack gap={3} textAlign="center">
          <Badge
            bg="whiteAlpha.900"
            color="orange.700"
            borderRadius="full"
            px={4}
            py={1.5}
            fontSize="xs"
            fontWeight="700"
            letterSpacing="wide"
            textTransform="uppercase"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.05)"
          >
            Fresh workspace
          </Badge>
          <Heading
            size="2xl"
            fontWeight="900"
            color="gray.900"
            letterSpacing="-1px"
            maxW="700px"
          >
            Start with a fresh build, or point us at an existing codebase.
          </Heading>
          <Text fontSize="md" color="gray.600" maxW="620px" lineHeight="tall">
            There are no source files here yet. Open the design workspace to
            kick off a new project, or analyze an existing directory instead.
          </Text>
        </VStack>

        <HStack
          gap={5}
          w="full"
          align="stretch"
          flexDirection={{ base: "column", md: "row" }}
        >
          <Box
            flex="1"
            color="white"
            borderRadius="2xl"
            overflow="hidden"
            position="relative"
            bg="linear-gradient(145deg, #ff8a00 0%, #ffb347 45%, #ffd86b 100%)"
            boxShadow="0 24px 70px rgba(249, 115, 22, 0.28)"
          >
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%)"
              pointerEvents="none"
            />
            <Box
              position="absolute"
              top="-40px"
              right="-30px"
              w="180px"
              h="180px"
              borderRadius="full"
              bg="rgba(255,255,255,0.16)"
              pointerEvents="none"
            />

            <Box p={6} position="relative">
              <VStack align="start" gap={5}>
                <HStack gap={3} align="start">
                  <Box
                    p={3}
                    borderRadius="xl"
                    bg="rgba(255,255,255,0.2)"
                    color="white"
                    flexShrink={0}
                    boxShadow="inset 0 1px 0 rgba(255,255,255,0.2)"
                  >
                    <FolderPlus size={22} strokeWidth={2} />
                  </Box>
                  <VStack align="start" gap={1}>
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontWeight="900" fontSize="lg" letterSpacing="-0.3px">
                        Start New Project
                      </Text>
                      <Badge
                        bg="rgba(17,24,39,0.16)"
                        color="white"
                        borderRadius="full"
                        fontSize="9px"
                        px={2}
                        fontWeight="800"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        Build First
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="rgba(255,255,255,0.86)">
                      Jump straight into shaping the product instead of staring
                      at an empty folder.
                    </Text>
                  </VStack>
                </HStack>

                <Separator borderColor="rgba(255,255,255,0.18)" />

                <FeatureList
                  items={NEW_PROJECT_STEPS}
                  color="white"
                  textColor="rgba(255,255,255,0.92)"
                />

                <Box
                  w="full"
                  bg="rgba(255,255,255,0.16)"
                  borderRadius="xl"
                  px={4}
                  py={3}
                  borderWidth="1px"
                  borderColor="rgba(255,255,255,0.18)"
                  backdropFilter="blur(10px)"
                >
                  <HStack gap={2} flexWrap="wrap">
                    {BUILD_FLOW.map(({ label, dim }, index) => (
                      <Text
                        key={`${label}-${index}`}
                        fontSize="xs"
                        fontWeight={dim ? "500" : "700"}
                        color={dim ? "rgba(255,255,255,0.65)" : "white"}
                      >
                        {label}
                      </Text>
                    ))}
                  </HStack>
                </Box>

                <Button
                  w="full"
                  size="lg"
                  bg="gray.950"
                  color="white"
                  borderRadius="xl"
                  fontWeight="800"
                  _hover={{ bg: "black" }}
                  _active={{ bg: "gray.900" }}
                  onClick={() => navigate("/design")}
                >
                  <Sparkles size={16} />
                  Start New Project
                  <ArrowRight size={15} />
                </Button>

                <Text
                  fontSize="xs"
                  color="rgba(17,24,39,0.65)"
                  textAlign="center"
                  w="full"
                  fontWeight="600"
                >
                  Open the design workspace and begin building immediately
                </Text>
              </VStack>
            </Box>
          </Box>

          <Box
            flex="1"
            bg="whiteAlpha.900"
            borderWidth="1px"
            borderColor="rgba(148, 163, 184, 0.28)"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 18px 50px rgba(15, 23, 42, 0.08)"
            backdropFilter="blur(10px)"
          >
            <Box h="4px" bg="linear-gradient(90deg, #93c5fd 0%, #dbeafe 100%)" />

            <Box p={6}>
              <VStack align="start" gap={5}>
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
                      You already have source files somewhere else to audit
                    </Text>
                  </VStack>
                </HStack>

                <Separator borderColor="gray.100" />

                <FeatureList items={ANALYZE_STEPS} color="blue.400" />

                <Box
                  w="full"
                  bg="blue.50"
                  borderRadius="lg"
                  px={4}
                  py={3}
                  borderWidth="1px"
                  borderColor="blue.100"
                >
                  <Text fontSize="xs" color="blue.700">
                    Point the tool at a directory that already contains source
                    files, then run analysis.
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
                  Runs in the background and updates automatically
                </Text>
              </VStack>
            </Box>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
}
