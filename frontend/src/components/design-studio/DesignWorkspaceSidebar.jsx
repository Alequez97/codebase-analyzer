import { Box, Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { Layers, LayoutTemplate, Lightbulb, Wand2 } from "lucide-react";

export function DesignWorkspaceSidebar({
  panel,
  onPanelChange,
  prototypes,
  components,
  selectedUrl,
  onSelectUrl,
  prompt,
  onPromptChange,
  generationBrief,
  onGenerationBriefChange,
  onBrainstorm,
  onGenerate,
  isSubmitting,
}) {
  const items = panel === "prototype" ? prototypes : components;

  return (
    <Box
      w={{ base: "100%", lg: "320px" }}
      flexShrink={0}
      borderRightWidth={{ base: 0, lg: "1px" }}
      borderBottomWidth={{ base: "1px", lg: 0 }}
      borderColor="rgba(226, 232, 240, 0.9)"
      bg="rgba(255,255,255,0.92)"
      backdropFilter="blur(12px)"
      display="flex"
      flexDirection="column"
      p={4}
      gap={4}
    >
      <VStack align="stretch" gap={3}>
        <Text fontSize="xs" fontWeight="800" color="gray.500" letterSpacing="wide" textTransform="uppercase">
          Creative Direction
        </Text>
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          minH="148px"
          resize="vertical"
          borderRadius="22px"
          borderColor="rgba(148, 163, 184, 0.28)"
          bg="white"
          fontSize="sm"
          lineHeight="1.7"
          _focusVisible={{
            borderColor: "orange.400",
            boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)",
          }}
        />
        {generationBrief ? (
          <Textarea
            value={generationBrief}
            onChange={(event) => onGenerationBriefChange(event.target.value)}
            minH="110px"
            resize="vertical"
            borderRadius="22px"
            borderColor="rgba(148, 163, 184, 0.2)"
            bg="rgba(248,250,252,0.92)"
            fontSize="sm"
            lineHeight="1.7"
          />
        ) : null}
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            borderRadius="full"
            flex={1}
            onClick={onBrainstorm}
            loading={isSubmitting}
          >
            <Lightbulb size={14} />
            Brainstorm
          </Button>
          <Button
            size="sm"
            bg="gray.950"
            color="white"
            borderRadius="full"
            flex={1}
            _hover={{ bg: "black" }}
            onClick={onGenerate}
            loading={isSubmitting}
          >
            <Wand2 size={14} />
            Generate
          </Button>
        </HStack>
      </VStack>

      <VStack align="stretch" gap={3} flex={1} minH={0}>
        <HStack gap={1}>
          <Button
            size="xs"
            flex={1}
            variant={panel === "prototype" ? "solid" : "ghost"}
            colorPalette={panel === "prototype" ? "orange" : "gray"}
            borderRadius="full"
            onClick={() => onPanelChange("prototype")}
          >
            <LayoutTemplate size={12} />
            Prototypes
          </Button>
          <Button
            size="xs"
            flex={1}
            variant={panel === "components" ? "solid" : "ghost"}
            colorPalette={panel === "components" ? "orange" : "gray"}
            borderRadius="full"
            onClick={() => onPanelChange("components")}
          >
            <Layers size={12} />
            Components
          </Button>
        </HStack>

        <Box
          flex={1}
          minH={0}
          overflowY="auto"
          borderRadius="24px"
          borderWidth="1px"
          borderColor="rgba(226, 232, 240, 0.9)"
          bg="rgba(248, 250, 252, 0.88)"
          p={2}
        >
          {items.length === 0 ? (
            <Text fontSize="sm" color="gray.400" px={3} py={3}>
              Nothing generated in this panel yet.
            </Text>
          ) : (
            <VStack align="stretch" gap={1}>
              {items.map((item) => {
                const selected = selectedUrl === item.url;
                return (
                  <Box
                    key={item.id}
                    px={3}
                    py={3}
                    borderRadius="18px"
                    cursor="pointer"
                    bg={selected ? "orange.50" : "transparent"}
                    borderWidth="1px"
                    borderColor={selected ? "orange.200" : "transparent"}
                    onClick={() => onSelectUrl(item.url)}
                    _hover={{ bg: selected ? "orange.50" : "white" }}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight={selected ? "800" : "600"}
                      color={selected ? "orange.800" : "gray.700"}
                    >
                      {item.label}
                    </Text>
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
