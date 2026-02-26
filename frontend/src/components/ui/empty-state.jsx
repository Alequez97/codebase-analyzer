/**
 * EmptyState - Reusable component for displaying empty/no-data states
 * @param {Object} icon - Lucide icon component
 * @param {string} title - Main heading text
 * @param {string} description - Supporting description text
 * @param {string} variant - "bordered" (dashed border) or "simple" (no border)
 */
export function EmptyState({
  icon: Icon, // eslint-disable-line unused-imports/no-unused-vars
  title,
  description,
  variant = "bordered",
}) {
  const iconSize = variant === "bordered" ? 32 : 48;

  return (
    <Box
      textAlign="center"
      py={variant === "bordered" ? 8 : 6}
      px={variant === "bordered" ? 4 : 6}
      borderWidth={variant === "bordered" ? "2px" : undefined}
      borderStyle={variant === "bordered" ? "dashed" : undefined}
      borderColor={variant === "bordered" ? "gray.300" : undefined}
      borderRadius={variant === "bordered" ? "md" : undefined}
    >
      <VStack gap={3}>
        <Icon
          size={iconSize}
          style={{
            margin: "0 auto",
            color: "var(--chakra-colors-gray-400)",
          }}
        />
        <Text
          color="gray.600"
          fontSize={variant === "bordered" ? "sm" : "md"}
          fontWeight={variant === "bordered" ? "medium" : "normal"}
        >
          {title}
        </Text>
        <Text fontSize={variant === "bordered" ? "xs" : "sm"} color="gray.500">
          {description}
        </Text>
      </VStack>
    </Box>
  );
}
