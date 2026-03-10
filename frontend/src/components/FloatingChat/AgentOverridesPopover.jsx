import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  IconButton,
  Popover,
  NativeSelect,
} from "@chakra-ui/react";
import { Settings } from "lucide-react";

const REASONING_OPTIONS = [
  { value: "", label: "Default" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "XHigh" },
];

/**
 * AgentOverridesPopover - Settings gear button that lets the user override
 * agent parameters like max tokens, reasoning effort, and temperature.
 *
 * @param {{ maxTokens: number|null, reasoningEffort: string|null, temperature: number|null }} overrides
 * @param {(overrides: object) => void} onChange
 */
export function AgentOverridesPopover({ overrides, onChange }) {
  const hasAnyOverride =
    overrides.maxTokens !== null ||
    overrides.reasoningEffort !== null ||
    overrides.temperature !== null;

  const set = (field, raw) => {
    const value = raw === "" || raw === null ? null : raw;
    onChange({ ...overrides, [field]: value });
  };

  return (
    <Popover.Root positioning={{ placement: "top-end" }}>
      <Popover.Trigger asChild>
        <IconButton
          size="xs"
          variant={hasAnyOverride ? "solid" : "ghost"}
          colorPalette={hasAnyOverride ? "blue" : "gray"}
          aria-label="Agent overrides"
          title="Override agent parameters"
          flexShrink={0}
        >
          <Settings size={13} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          width="220px"
          boxShadow="md"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
        >
          <Popover.Body p={3}>
            <VStack gap={3} align="stretch">
              <Text
                fontSize="11px"
                fontWeight="600"
                color="gray.500"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Agent Overrides
              </Text>

              {/* Max Tokens */}
              <Box>
                <Text fontSize="11px" color="gray.500" mb={1}>
                  Max Tokens
                </Text>
                <Input
                  size="xs"
                  type="number"
                  min={1}
                  placeholder="Default"
                  value={overrides.maxTokens ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("maxTokens", v === "" ? null : Number(v));
                  }}
                  borderRadius="md"
                />
              </Box>

              {/* Reasoning Effort */}
              <Box>
                <Text fontSize="11px" color="gray.500" mb={1}>
                  Reasoning Effort
                </Text>
                <NativeSelect.Root size="xs" variant="outline">
                  <NativeSelect.Field
                    value={overrides.reasoningEffort ?? ""}
                    onChange={(e) =>
                      set(
                        "reasoningEffort",
                        e.target.value === "" ? null : e.target.value,
                      )
                    }
                    fontSize="11px"
                  >
                    {REASONING_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>

              {/* Temperature */}
              <Box>
                <Text fontSize="11px" color="gray.500" mb={1}>
                  Temperature
                </Text>
                <Input
                  size="xs"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="Default"
                  value={overrides.temperature ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("temperature", v === "" ? null : Number(v));
                  }}
                  borderRadius="md"
                />
              </Box>

              {/* Reset link */}
              {hasAnyOverride && (
                <HStack justify="flex-end">
                  <Text
                    fontSize="10px"
                    color="blue.500"
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() =>
                      onChange({
                        maxTokens: null,
                        reasoningEffort: null,
                        temperature: null,
                      })
                    }
                  >
                    Reset to defaults
                  </Text>
                </HStack>
              )}
            </VStack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
