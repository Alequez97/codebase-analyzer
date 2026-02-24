// Re-export all API modules
export * from "./status";
export * from "./project";
export * from "./codebase";
export * from "./domain";
export * from "./domain-documentation";
export * from "./domain-diagrams";
export * from "./domain-requirements";
export * from "./domain-bugs-security";
export * from "./domain-testing";
export * from "./tasks";
export * from "./domain-sections-chat";

// Default export for backward compatibility (if needed)
import * as status from "./status";
import * as project from "./project";
import * as codebase from "./codebase";
import * as domain from "./domain";
import * as domainDocumentation from "./domain-documentation";
import * as domainDiagrams from "./domain-diagrams";
import * as domainRequirements from "./domain-requirements";
import * as domainBugsSecurity from "./domain-bugs-security";
import * as domainTesting from "./domain-testing";
import * as tasks from "./tasks";
import * as domainSectionsChat from "./domain-sections-chat";

export default {
  ...status,
  ...project,
  ...codebase,
  ...domain,
  ...domainDocumentation,
  ...domainDiagrams,
  ...domainRequirements,
  ...domainBugsSecurity,
  ...domainTesting,
  ...tasks,
  ...domainSectionsChat,
};
