import { Box, Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { Search, Zap } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { EXAMPLE_IDEAS } from "./constants";

const IS_TEST_MODE = import.meta.env.VITE_PRICING_TEST_MODE === "true";

export function IdeaInputCard() {
  const idea = useMarketResearchStore((s) => s.idea);
  const setIdea = useMarketResearchStore((s) => s.setIdea);
  const startAnalysis = useMarketResearchStore((s) => s.startAnalysis);
  const selectedPlan = useMarketResearchStore((s) => s.selectedPlan);
  const clearPlan = useMarketResearchStore((s) => s.clearPlan);

  const numCompetitors = selectedPlan?.numCompetitors ?? 10;

  return (
    <Box
      bg="white"
      borderRadius="16px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={8}
      boxShadow="0 1px 3px rgba(0,0,0,.05)"
    >
      <VStack gap={5} align="stretch">
        <VStack align="start" gap={1.5}>
          <Text
            fontSize="11px"
            fontWeight="600"
            color="#64748b"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Your idea
          </Text>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. An AI-powered Jira alternative for remote engineering teams that auto-prioritizes backlog based on git activity..."
            minH="120px"
            fontSize="13px"
            borderColor="#cbd5e1"
            borderRadius="8px"
            _focus={{
              borderColor: "#6366f1",
              boxShadow: "0 0 0 3px rgba(99,102,241,.1)",
            }}
            _placeholder={{ color: "#94a3b8" }}
          />
        </VStack>

        {/* Example idea chips */}
        <VStack align="start" gap={2}>
          <HStack gap={1.5}>
            <Text fontSize="11px" color="#64748b">
              Try:
            </Text>
          </HStack>
          <HStack gap={2} flexWrap="wrap">
            {EXAMPLE_IDEAS.map((example) => (
              <Button
                key={example}
                size="xs"
                variant="outline"
                borderColor="#ddd6fe"
                color="#6366f1"
                fontSize="11px"
                fontWeight="500"
                px={2.5}
                h="26px"
                borderRadius="6px"
                _hover={{ bg: "#f5f3ff", borderColor: "#c7d2fe" }}
                onClick={() => setIdea(example)}
              >
                + {example}
              </Button>
            ))}
          </HStack>
        </VStack>

        <Text fontSize="11px" color="#94a3b8">
          💡 Live market intelligence · ~{numCompetitors} competitors · ~5 min
        </Text>

        {IS_TEST_MODE && selectedPlan && (
          <HStack
            bg="#f0fdf4"
            borderWidth="1px"
            borderColor="#bbf7d0"
            borderRadius="8px"
            px={3}
            py={2}
            gap={2}
            fontSize="11px"
          >
            <Zap size={12} color="#16a34a" />
            <Text color="#166534" fontWeight="600">
              {selectedPlan.name} plan active
            </Text>
            <Text color="#4ade80">·</Text>
            <Text color="#166534">
              {selectedPlan.numCompetitors} competitors/report
            </Text>
            <Button
              ml="auto"
              size="xs"
              variant="ghost"
              color="#94a3b8"
              fontSize="10px"
              h="auto"
              minW="auto"
              p={0}
              _hover={{ color: "#64748b" }}
              onClick={clearPlan}
            >
              ✕ clear
            </Button>
          </HStack>
        )}

        <Button
          display="inline-flex"
          alignItems="center"
          gap={2}
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          color="white"
          borderRadius="10px"
          h="42px"
          fontSize="14px"
          fontWeight="600"
          boxShadow="0 2px 8px rgba(99,102,241,.3)"
          transition="all 0.15s"
          _hover={{
            opacity: 0.93,
            boxShadow: "0 4px 12px rgba(99,102,241,.4)",
          }}
          disabled={!idea.trim()}
          onClick={startAnalysis}
          w="full"
          opacity={!idea.trim() ? 0.5 : 1}
        >
          <Search size={16} strokeWidth={2.5} />
          Analyze Market
        </Button>
      </VStack>
    </Box>
  );
}
