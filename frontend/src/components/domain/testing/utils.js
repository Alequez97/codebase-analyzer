// Essential assertion types for common testing scenarios
export const ASSERTION_TYPES = [
  { value: "toBe", label: "To be (===)" },
  { value: "toEqual", label: "To equal (deep)" },
  { value: "toBeTruthy", label: "To be truthy" },
  { value: "toMatch", label: "To match" },
  { value: "resolves", label: "Resolves" },
  { value: "rejects", label: "Rejects" },
  { value: "toThrow", label: "To throw" },
  { value: "toHaveProperty", label: "To have property" },
  { value: "toBeVisible", label: "To be visible" },
];

// Utility to format assertion type for display
export function formatAssertionType(assertionType) {
  const option = ASSERTION_TYPES.find((opt) => opt.value === assertionType);
  return option ? option.label : assertionType;
}

export function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}
