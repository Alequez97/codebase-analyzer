export function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function sortByPriority(tests = []) {
  return tests.slice().sort((a, b) => {
    const aBlockedRank = a?.blockedBy ? 1 : 0;
    const bBlockedRank = b?.blockedBy ? 1 : 0;

    if (aBlockedRank !== bBlockedRank) {
      return aBlockedRank - bBlockedRank;
    }

    return (
      (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    );
  });
}
