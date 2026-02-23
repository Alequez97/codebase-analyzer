/**
 * AI Chat Configuration for Different Domain Sections
 *
 * This file provides reusable configurations for the AISectionChat component
 * across different domain sections (Documentation, Requirements, Testing, etc.)
 *
 * Each configuration includes:
 * - sectionName: Display name
 * - sectionType: Type identifier for API calls
 * - initialGreeting: AI's greeting message
 * - samplePrompts: Example prompts to guide users
 * - inputPlaceholder: Placeholder text for input field
 */

export const DOCUMENTATION_CHAT_CONFIG = {
  sectionName: "Documentation",
  sectionType: "documentation",
  initialGreeting:
    "Hello! I'm your AI documentation assistant. I can help you improve, expand, or modify your documentation. What would you like to change?",
  samplePrompts: [
    "Add more detailed examples",
    "Make it more concise and clear",
    "Add a troubleshooting section",
    "Improve the getting started guide",
    "Add API reference documentation",
  ],
  inputPlaceholder:
    "Ask AI to improve your documentation... (e.g., 'Add more examples' or 'Make it more concise')",
};

export const REQUIREMENTS_CHAT_CONFIG = {
  sectionName: "Requirements",
  sectionType: "requirements",
  initialGreeting:
    "Hello! I'm your AI requirements assistant. I can help you refine, expand, or clarify your requirements. What would you like to change?",
  samplePrompts: [
    "Add acceptance criteria",
    "Make requirements more specific",
    "Add edge cases to consider",
    "Clarify non-functional requirements",
    "Add user stories",
  ],
  inputPlaceholder:
    "Ask AI to improve your requirements... (e.g., 'Add acceptance criteria' or 'Make it more specific')",
};

export const TESTING_CHAT_CONFIG = {
  sectionName: "Testing",
  sectionType: "testing",
  initialGreeting:
    "Hello! I'm your AI testing assistant. I can help you improve test coverage, add test cases, or refine existing tests. What would you like to change?",
  samplePrompts: [
    "Add edge case tests",
    "Improve test descriptions",
    "Add integration tests",
    "Suggest error handling tests",
    "Add performance test cases",
  ],
  inputPlaceholder:
    "Ask AI to improve your tests... (e.g., 'Add edge case tests' or 'Improve test descriptions')",
};

export const BUGS_SECURITY_CHAT_CONFIG = {
  sectionName: "Bugs & Security",
  sectionType: "bugs-security",
  initialGreeting:
    "Hello! I'm your AI security assistant. I can help you analyze security vulnerabilities, suggest fixes, or add security best practices. What would you like to know?",
  samplePrompts: [
    "Explain this vulnerability in detail",
    "Suggest alternative security approaches",
    "Add security best practices",
    "Review the proposed fix",
    "Add validation checks",
  ],
  inputPlaceholder:
    "Ask AI about security & bugs... (e.g., 'Explain this vulnerability' or 'Suggest a fix')",
};

export const DIAGRAMS_CHAT_CONFIG = {
  sectionName: "Diagrams",
  sectionType: "diagrams",
  initialGreeting:
    "Hello! I'm your AI diagram assistant. I can help you improve diagram clarity, add missing components, or suggest better visualizations. What would you like to change?",
  samplePrompts: [
    "Add more detail to this diagram",
    "Simplify the architecture diagram",
    "Add sequence diagram for this flow",
    "Improve component relationships",
    "Add data flow annotations",
  ],
  inputPlaceholder:
    "Ask AI to improve your diagrams... (e.g., 'Add more detail' or 'Simplify this diagram')",
};

/**
 * Get chat configuration for a specific section type
 * @param {string} sectionType - The section type
 * @returns {object} Chat configuration object
 */
export function getChatConfig(sectionType) {
  const configs = {
    documentation: DOCUMENTATION_CHAT_CONFIG,
    requirements: REQUIREMENTS_CHAT_CONFIG,
    testing: TESTING_CHAT_CONFIG,
    "bugs-security": BUGS_SECURITY_CHAT_CONFIG,
    diagrams: DIAGRAMS_CHAT_CONFIG,
  };

  return (
    configs[sectionType] || {
      sectionName: "Section",
      sectionType: sectionType,
      initialGreeting: "Hello! How can I help you improve this section?",
      samplePrompts: [
        "Add more details",
        "Make it clearer",
        "Improve organization",
        "Add examples",
        "Fix inconsistencies",
      ],
      inputPlaceholder: "Ask AI to improve this section...",
    }
  );
}

/**
 * Get context description for a section
 * @param {string} sectionType - The section type
 * @param {object} content - The current content object
 * @returns {string} Context description
 */
export function getContextDescription(sectionType, content) {
  if (!content) {
    return `AI will help you create ${sectionType}`;
  }

  const charCount = content.content?.length || 0;
  const descriptions = {
    documentation: `AI has access to your current documentation (${charCount} characters)`,
    requirements: `AI has access to your current requirements (${charCount} characters)`,
    testing: `AI has access to your current test cases (${charCount} characters)`,
    "bugs-security": `AI has access to identified issues (${charCount} characters)`,
    diagrams: `AI has access to your current diagrams (${charCount} characters)`,
  };

  return (
    descriptions[sectionType] ||
    `AI has access to your current ${sectionType} (${charCount} characters)`
  );
}
