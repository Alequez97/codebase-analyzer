# Codebase Analysis Task

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. WRITE THE FILE AND EXIT.**

You MUST use the /add command to add the output file, then write the content, then exit.

## DIRECTIVE

Write the complete JSON content to `.code-analysis/analysis/codebase-analysis.json`.

Use your repository map to identify major functional domains in the codebase.

## File to Create

`.code-analysis/analysis/codebase-analysis.json`

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

**YOUR TASK**: Create the file `.code-analysis/analysis/codebase-analysis.json` with the complete JSON structure.

**CRITICAL REQUIREMENTS**:

1. You MUST create/write the file `.code-analysis/analysis/codebase-analysis.json`
2. The file MUST contain valid JSON with the structure shown above
3. Do NOT just describe what should be done - ACTUALLY CREATE THE FILE
4. Do NOT ask questions or wait for confirmation - WRITE THE FILE NOW
5. Fill in the structure with your actual analysis of the codebase

**Example command you should execute**:

- Create the file with the exact path: `.code-analysis/analysis/codebase-analysis.json`
- Write the complete JSON structure with your analysis
