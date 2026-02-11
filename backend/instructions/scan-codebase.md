# Scan Codebase - Instruction for AI Agent

## Objective

Analyze the target codebase and identify all major functional modules. Output a structured JSON file with discovered modules.

## Target Codebase

Path: `{{CODEBASE_PATH}}`

## Task

1. Scan the codebase structure
2. Identify major functional areas/modules based on:
   - Directory structure
   - File groupings
   - Controller/route patterns
   - Business logic boundaries

3. For each module, determine:
   - Module ID (kebab-case slug)
   - Module Name (human-readable)
   - Business Purpose (what it does)
   - Related Files (main files that implement this module)
   - Priority (P0=critical, P1=high, P2=medium, P3=low)
   - Test Coverage (none, partial, full)

## Output Format

Create file: `analysis-output/scan-results.json`

JSON structure:

```json
{
  "timestamp": "ISO 8601 timestamp",
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

- Focus on main business modules (not utilities or libraries)
- Group related files together
- Be concise in businessPurpose (1-2 sentences max)
- Use relative paths from codebase root
- Priority should reflect business criticality
- Set hasAnalysis to false (it will be updated later)
- If the codebase is very large, use your repository map to understand structure
- You can scan incrementally if needed - identify core modules first, then expand

## Example Modules

- user-authentication
- payment-processing
- inventory-management
- notification-service
- reporting-engine

Create the scan-results.json file now.
