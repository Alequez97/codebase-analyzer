# Scan Codebase - Instruction for AI Agent

## Objective

**Phase 1: Quick Analysis**
Provide a short codebase recap and identify all major functional modules. Output a structured JSON file.

## Target Codebase

Path: `{{CODEBASE_PATH}}`

## Task

**IMPORTANT**: You MUST create the file `.code-analysis/scan-results.json` with the structure below. This is not optional.

1. **Quick Codebase Recap**: Briefly understand what this project does (1-2 sentences)
2. **Identify Modules**: Find major functional areas based on:
   - Directory structure
   - File groupings
   - Controller/route patterns
   - Business logic boundaries
3. **Suggest Next Steps**: In the summary field, suggest what should be analyzed next

For each module, determine:

- Module ID (kebab-case slug)
- Module Name (human-readable)
- Business Purpose (what it does)
- Related Files (main files that implement this module)
- Priority (P0=critical, P1=high, P2=medium, P3=low)
- Test Coverage (none, partial, full)

## Output Format

**YOU MUST CREATE THIS FILE**: `.code-analysis/scan-results.json`

JSON structure (write this exact structure to the file):

```json
{
  "timestamp": "ISO 8601 timestamp",
  "summary": "Brief 1-2 sentence project description and suggested next steps",
  "modules": [
    {
      "id": "module-id",
      "name": "Module Name",
      "businessPurpose": "What this module does",
      "files": ["path/to/file1.js", "path/to/file2.js"],
      "priority": "P0|P1|P2|P3",
      "testCoverage": "none|partial|full",
      "hasAnalysis": false
    }
  ]
}
```

## Guidelines

- **ACTION REQUIRED**: Create/edit the `.code-analysis/scan-results.json` file with valid JSON
- Focus on main business modules (not utilities or libraries)
- Group related files together
- Be concise in businessPurpose (1-2 sentences max)
- Use relative paths from codebase root
- Priority should reflect business criticality
- Set hasAnalysis to false (it will be updated later)
- Add a helpful summary suggesting what to analyze first
- If the codebase is very large, use your repository map to understand structure
- Identify 5-10 core modules maximum for initial scan

## Example Modules

- user-authentication
- payment-processing
- inventory-management
- notification-service
- reporting-engine

## ACTION REQUIRED

Create the `.code-analysis/scan-results.json` file NOW with the structure above. Do not just describe what you would put in it - actually create the file.
