/**
 * Domain utility functions
 */

/**
 * Sort domains by priority (P0 > P1 > P2 > P3)
 * @param {Array} domains - Array of domain objects
 * @returns {Array} Sorted array of domains
 */
export function sortDomainsByPriority(domains) {
  if (!Array.isArray(domains)) return domains;

  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };

  return [...domains].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] ?? 999;
    const priorityB = priorityOrder[b.priority] ?? 999;
    return priorityA - priorityB;
  });
}

/**
 * Convert kebab-case string to display name (sentence case)
 * @param {string} str - Kebab-case string (e.g., "extract-business-logic")
 * @returns {string} Display name (e.g., "Extract business logic")
 */
export function kebabCaseToDisplayName(str) {
  if (!str) return "";
  const words = str.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
