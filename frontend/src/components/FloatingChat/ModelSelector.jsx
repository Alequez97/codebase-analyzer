import { NativeSelect } from "@chakra-ui/react";
import { MODELS_BY_PROVIDER } from "../../constants/models";

/**
 * ModelSelector - Compact model chooser for the chat input area.
 *
 * Shows a styled grouped select with:
 *  - "Default (ModelName)" option (uses the task-type model from server config)
 *  - Per-provider optgroups with individual models
 *
 * @param {string|null} value - Currently selected model ID, or null for Default
 * @param {(model: string|null) => void} onChange - Called with model ID or null
 * @param {string|null} defaultLabel - Display name of the server default model for this task
 */
export function ModelSelector({ value, onChange, defaultLabel }) {
  const isOverridden = !!value;
  const defaultOptionLabel = defaultLabel
    ? `Default (${defaultLabel})`
    : "Default";

  return (
    <NativeSelect.Root
      size="xs"
      variant="outline"
      colorPalette={isOverridden ? "blue" : "gray"}
      flex={1}
      minW={0}
    >
      <NativeSelect.Field
        value={value ?? "default"}
        onChange={(e) =>
          onChange(e.target.value === "default" ? null : e.target.value)
        }
        fontSize="11px"
        fontWeight={isOverridden ? "500" : "normal"}
        color={isOverridden ? "blue.600" : "gray.500"}
        bg={isOverridden ? "blue.50" : "white"}
        borderColor={isOverridden ? "blue.300" : "gray.200"}
        cursor="pointer"
        _focus={{ outline: "none", boxShadow: "none" }}
      >
        <option value="default">{defaultOptionLabel}</option>
        {MODELS_BY_PROVIDER.map(({ provider, label, models }) => (
          <optgroup key={provider} label={label}>
            {models.map(({ value: v, label: l }) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </optgroup>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}
