# Codebase Analysis Task

## DIRECTIVE

Create the file `.code-analysis/codebase-analysis.json` with domain discovery results.

Use your repository map to identify major functional domains in the codebase.

## File to Create

`.code-analysis/codebase-analysis.json`

## JSON Structure Required

```json
{
  "timestamp": "2026-02-13T12:00:00.000Z",
  "summary": "Brief project description. Next steps: analyze [domain-name] first.",
  "domains": [
    {
      "id": "example-domain",
      "name": "Example Domain",
      "businessPurpose": "What this domain does",
      "files": ["path/to/file.js"],
      "priority": "P0",
      "testCoverage": "none",
      "hasAnalysis": false
    }
  ]
}
```

## Rules

- Use current ISO 8601 timestamp
- Identify ALL major functional domains (no limit on count)
- For large apps, identify as many domains as needed to cover the application
- Use kebab-case for domain IDs
- Priority: P0 (critical), P1 (high), P2 (medium), P3 (low)
- List 1-5 main files per domain
- All domains have `"hasAnalysis": false`
- Keep businessPurpose to 1 sentence

## Execute

Write valid JSON to `.code-analysis/codebase-analysis.json` with the structure above. Create the file if it doesn't exist.
