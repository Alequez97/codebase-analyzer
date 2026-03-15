import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Spinner,
  Center,
} from "@chakra-ui/react";
import {
  Layers,
  LayoutTemplate,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
];

async function fetchManifest() {
  const res = await fetch("/api/design/manifest");
  if (!res.ok) throw new Error("Failed to load design manifest");
  return res.json();
}

export default function DesignPage() {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // "prototype" | "components"
  const [panel, setPanel] = useState("prototype");
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [viewport, setViewport] = useState("desktop");

  const iframeRef = useRef(null);
  const activeViewport = VIEWPORTS.find((v) => v.id === viewport);

  useEffect(() => {
    fetchManifest()
      .then((data) => {
        setManifest(data);
        const first =
          data.prototypes[0]?.url ?? data.components[0]?.url ?? null;
        setSelectedUrl(first);
        if (data.components.length > 0 && data.prototypes.length === 0) {
          setPanel("components");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const items =
    manifest == null
      ? []
      : panel === "prototype"
        ? manifest.prototypes
        : manifest.components;

  if (loading) {
    return (
      <Center h="60vh">
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="60vh">
        <Text color="red.500">{error}</Text>
      </Center>
    );
  }

  const isEmpty =
    manifest.prototypes.length === 0 && manifest.components.length === 0;

  return (
    <Box display="flex" h="calc(100vh - 49px)" overflow="hidden">
      {/* Sidebar */}
      <Box
        w="200px"
        flexShrink={0}
        borderRightWidth="1px"
        borderColor="gray.200"
        bg="gray.50"
        display="flex"
        flexDirection="column"
        py={3}
      >
        {/* Panel toggle */}
        <HStack gap={1} px={3} mb={3}>
          <Button
            size="xs"
            flex={1}
            variant={panel === "prototype" ? "solid" : "ghost"}
            colorPalette={panel === "prototype" ? "blue" : "gray"}
            onClick={() => {
              setPanel("prototype");
              setSelectedUrl(manifest.prototypes[0]?.url ?? null);
            }}
          >
            <LayoutTemplate size={11} />
            Prototype
          </Button>
          <Button
            size="xs"
            flex={1}
            variant={panel === "components" ? "solid" : "ghost"}
            colorPalette={panel === "components" ? "blue" : "gray"}
            onClick={() => {
              setPanel("components");
              setSelectedUrl(manifest.components[0]?.url ?? null);
            }}
          >
            <Layers size={11} />
            Components
          </Button>
        </HStack>

        {/* Item list */}
        <VStack gap={0} align="stretch" flex={1} overflowY="auto">
          {items.length === 0 ? (
            <Text fontSize="xs" color="gray.400" px={3}>
              None found
            </Text>
          ) : (
            items.map((item) => (
              <Box
                key={item.id}
                px={3}
                py={2}
                cursor="pointer"
                fontSize="sm"
                fontWeight={selectedUrl === item.url ? "semibold" : "normal"}
                color={selectedUrl === item.url ? "blue.700" : "gray.700"}
                bg={selectedUrl === item.url ? "blue.50" : "transparent"}
                borderLeftWidth="2px"
                borderLeftColor={
                  selectedUrl === item.url ? "blue.500" : "transparent"
                }
                _hover={{ bg: "gray.100" }}
                onClick={() => setSelectedUrl(item.url)}
              >
                {item.label}
              </Box>
            ))
          )}
        </VStack>
      </Box>

      {/* Preview area */}
      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        {/* Viewport toolbar */}
        {!isEmpty && (
          <HStack
            gap={1}
            px={3}
            py={2}
            borderBottomWidth="1px"
            borderColor="gray.200"
            bg="white"
            justify="center"
          >
            {VIEWPORTS.map(({ id, label, icon: Icon, width }) => (
              <Button
                key={id}
                size="xs"
                variant={viewport === id ? "solid" : "ghost"}
                colorPalette={viewport === id ? "blue" : "gray"}
                onClick={() => setViewport(id)}
                title={width ? `${width}px` : "Full width"}
              >
                <Icon size={12} />
                {label}
                {width && (
                  <Text as="span" fontSize="10px" opacity={0.7} ml={1}>
                    {width}px
                  </Text>
                )}
              </Button>
            ))}
          </HStack>
        )}

        {/* Canvas */}
        <Box flex={1} bg="gray.100" position="relative" overflow="auto">
          {isEmpty ? (
            <Center h="100%" flexDirection="column" gap={3}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.500">
                No design files yet
              </Text>
              <Text
                fontSize="sm"
                color="gray.400"
                maxW="320px"
                textAlign="center"
              >
                Design prototypes and component previews will appear here once
                generated. HTML files in{" "}
                <Text as="span" fontFamily="mono" fontSize="xs">
                  .code-analysis/design/
                </Text>{" "}
                are served automatically.
              </Text>
            </Center>
          ) : selectedUrl ? (
            <Center
              h={activeViewport.width ? "auto" : "100%"}
              minH="100%"
              py={activeViewport.width ? 4 : 0}
            >
              <Box
                w={activeViewport.width ? `${activeViewport.width}px` : "100%"}
                h={activeViewport.width ? "calc(100vh - 120px)" : "100%"}
                bg="white"
                boxShadow={activeViewport.width ? "lg" : "none"}
                borderRadius={activeViewport.width ? "md" : "none"}
                overflow="hidden"
                position="relative"
                transition="width 0.2s ease"
              >
                {activeViewport.width && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h="20px"
                    bg="gray.200"
                    display="flex"
                    alignItems="center"
                    px={2}
                    gap={1}
                    zIndex={1}
                    borderTopRadius="md"
                  >
                    <Box w={2} h={2} borderRadius="full" bg="red.400" />
                    <Box w={2} h={2} borderRadius="full" bg="yellow.400" />
                    <Box w={2} h={2} borderRadius="full" bg="green.400" />
                    <Text fontSize="10px" color="gray.500" ml={1}>
                      {activeViewport.label} — {activeViewport.width}px
                    </Text>
                  </Box>
                )}
                <iframe
                  ref={iframeRef}
                  src={selectedUrl}
                  title="Design Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                    marginTop: activeViewport.width ? "20px" : "0",
                  }}
                />
              </Box>
            </Center>
          ) : (
            <Center h="100%">
              <Text color="gray.400" fontSize="sm">
                Select an item from the sidebar
              </Text>
            </Center>
          )}
        </Box>
      </Box>
    </Box>
  );
}
