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

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function sortByPriority(tests = []) {
  return tests
    .slice()
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
    );
}
