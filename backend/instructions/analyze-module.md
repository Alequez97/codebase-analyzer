# Analyze Module - Instruction for AI Agent

## Objective

Perform deep analysis of a specific module to identify requirements, bugs, security issues, and generate fixes.

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Module ID**: `{{MODULE_ID}}`
- **Module Name**: `{{MODULE_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

## Task

1. **Extract Requirements**: Identify what the module is supposed to do
2. **Find Bugs**: Detect logical errors, race conditions, edge cases
3. **Security Analysis**: Find vulnerabilities, injection points, auth issues
4. **Generate Fixes**: Propose code changes to fix identified issues

## Analysis Depth

- Read all specified files thoroughly
- Check for common patterns (error handling, validation, etc.)
- Consider security best practices
- Identify missing tests
- Look for code smells

## Handling Large Modules

If you encounter token limits:

1. Focus on the most critical files first
2. Use your repository map knowledge to understand context
3. Analyze high-risk areas (auth, data handling, external inputs)
4. You can work incrementally - analyze critical files, output results, then continue with remaining files
5. Prioritize security issues > bugs > code quality

## Output Format

Create file: `analysis-output/modules/{{MODULE_ID}}.json`

JSON structure:

```json
{
  "moduleId": "{{MODULE_ID}}",
  "moduleName": "{{MODULE_NAME}}",
  "timestamp": "ISO 8601 timestamp",

  "requirements": [
    {
      "id": "REQ-001",
      "description": "What the code should do",
      "source": "Where this requirement is evident",
      "confidence": "HIGH|MEDIUM|LOW",
      "priority": "P0|P1|P2|P3"
    }
  ],

  "bugs": [
    {
      "id": "BUG-001",
      "severity": "critical|high|medium|low",
      "type": "race-condition|error-handling|logic|edge-case",
      "location": {
        "file": "relative/path/to/file.js",
        "line": 42
      },
      "description": "What the bug is",
      "recommendation": "How to fix it",
      "fixable": true,
      "fixId": "FIX-001"
    }
  ],

  "securityIssues": [
    {
      "id": "SEC-001",
      "severity": "critical|high|medium|low",
      "category": "injection|auth|crypto|data-exposure|etc",
      "location": {
        "file": "relative/path/to/file.js",
        "line": 42
      },
      "vulnerability": "What the vulnerability is",
      "exploit": "How it could be exploited",
      "fixable": true,
      "fixId": "FIX-002"
    }
  ],

  "fixes": [
    {
      "id": "FIX-001",
      "targetIssue": "BUG-001",
      "file": "relative/path/to/file.js",
      "description": "What this fix does",
      "oldCode": "Code to replace (with context)",
      "newCode": "Replacement code",
      "applied": false
    }
  ],

  "recommendations": [
    "Add input validation for X",
    "Implement rate limiting",
    "Add unit tests for edge cases"
  ]
}
```

## Guidelines for Fixes

- Include 3-5 lines of context in oldCode/newCode
- Make fixes atomic (one issue at a time)
- Ensure newCode is syntactically correct
- Set applied to false
- Link fixes to specific issues via fixId

## Severity Levels

- **Critical**: Immediate action required, system at risk
- **High**: Serious issue, should fix soon
- **Medium**: Moderate impact, fix when possible
- **Low**: Minor issue, nice to have

Create the module analysis file now.
