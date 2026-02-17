# Codebase Analysis Task

## OBJECTIVE

Analyze the codebase and identify all major functional domains (business capabilities, features, modules).

## AVAILABLE TOOLS

You have access to these tools to explore the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns

## YOUR TASK

1. Use the available tools to explore the project structure
2. Identify all major functional domains in the codebase
3. Output a complete JSON analysis following the structure below

## OUTPUT FORMAT

You MUST output your analysis as a valid JSON object with this exact structure:

```json
{
  "timestamp": "2026-02-17T12:00:00.000Z",
  "summary": "Brief 2-3 sentence overview of what this platform/application does.",
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

## REQUIREMENTS

- Use current ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.sssZ format)
- **summary**: Brief 2-3 sentence overview describing what the platform does
- Identify ALL major functional domains (no limit on count)
- Use kebab-case for domain IDs (e.g., "user-authentication", "payment-processing")
- **priority**: P0 (critical), P1 (high), P2 (medium), P3 (low)
- **files**: List 3-8 main files per domain (paths relative to project root)
- **testCoverage**: Set to "none" for initial analysis
- **hasAnalysis**: Always set to false
- **businessPurpose**: Keep to 1 sentence per domain

## CRITICAL INSTRUCTIONS

1. Start by exploring the project structure using `list_directory` on "."
2. Identify major directories and file patterns
3. Read key files to understand functionality
4. Group related files into logical domains
5. Output ONLY the JSON structure - no additional text before or after
6. The JSON must be valid and parseable
7. Include all domains you discover - there's no limit

## EXAMPLE WORKFLOW

1. List root directory to see structure
2. Explore major subdirectories (src/, backend/, frontend/, etc.)
3. Search for key files (_.js, _.jsx, _.ts, _.tsx, etc.)
4. Read package.json and README if available
5. Identify functional groupings
6. Generate the JSON output

**Output your JSON analysis now.**
