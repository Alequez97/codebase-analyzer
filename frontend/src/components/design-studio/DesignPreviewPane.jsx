import { Box, Button, Center, HStack, Text, VStack } from "@chakra-ui/react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { DesignTaskConsole } from "./DesignTaskConsole";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390 },
];

export function DesignPreviewPane({
  selectedUrl,
  viewport,
  onViewportChange,
  currentTask,
  message,
  error,
}) {
  const activeViewport =
    VIEWPORTS.find((item) => item.id === viewport) ?? VIEWPORTS[0];

  return (
    <Box flex={1} display="flex" flexDirection="column" minW={0}>
      <HStack
        justify="space-between"
        px={5}
        py={4}
        borderBottomWidth="1px"
        borderColor="rgba(226, 232, 240, 0.9)"
        bg="rgba(255,255,255,0.7)"
        backdropFilter="blur(10px)"
      >
        <VStack align="start" gap={0}>
          <Text fontSize="sm" fontWeight="800" color="gray.900">
            Live Preview
          </Text>
          <Text fontSize="xs" color="gray.500">
            Generated files are served directly from `.code-analysis/design/`.
          </Text>
        </VStack>

        <HStack gap={2}>
          {VIEWPORTS.map(({ id, label, icon: Icon, width }) => (
            <Button
              key={id}
              size="xs"
              borderRadius="full"
              variant={viewport === id ? "solid" : "ghost"}
              colorPalette={viewport === id ? "orange" : "gray"}
              onClick={() => onViewportChange(id)}
            >
              <Icon size={12} />
              {label}
              {width && (
                <Text as="span" fontSize="10px" opacity={0.7}>
                  {width}px
                </Text>
              )}
            </Button>
          ))}
        </HStack>
      </HStack>

      <Box
        flex={1}
        bg="linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)"
        overflow="auto"
        px={{ base: 3, md: 5 }}
        py={{ base: 4, md: 5 }}
      >
        <VStack align="stretch" gap={5} minH="100%">
          {selectedUrl ? (
            <Center flex={1}>
              <Box
                w={activeViewport.width ? `${activeViewport.width}px` : "100%"}
                h={activeViewport.width ? "calc(100vh - 210px)" : "100%"}
                minH="560px"
                borderRadius={activeViewport.width ? "22px" : "24px"}
                overflow="hidden"
                bg="white"
                boxShadow="0 30px 80px rgba(15, 23, 42, 0.14)"
                borderWidth="1px"
                borderColor="rgba(226, 232, 240, 0.85)"
              >
                <iframe
                  src={selectedUrl}
                  title="Design Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  }}
                />
              </Box>
            </Center>
          ) : (
            <Center flex={1} minH="560px">
              <Text color="gray.400" fontSize="sm">
                Select a generated design to preview it.
              </Text>
            </Center>
          )}

          <DesignTaskConsole
            title="Design Notes"
            statusText={currentTask?.message || null}
            isRunning={
              currentTask?.status === "running" || currentTask?.status === "pending"
            }
            message={message}
            error={error}
          />
        </VStack>
      </Box>
    </Box>
  );
}
