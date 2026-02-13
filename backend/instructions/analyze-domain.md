# Analyze Domain - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to write `.code-analysis/domains/{{DOMAIN_ID}}.json` and exit.

## Objective

**IMPORTANT**: Perform deep analysis and CREATE a structured JSON file with findings.

Analyze a specific domain to identify requirements, bugs, security issues, and generate actionable fixes.

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Domain Name**: `{{DOMAIN_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

## Task

**IMPORTANT**: You MUST create the file `.code-analysis/domains/{{DOMAIN_ID}}.json` with the structure below. This is not optional.

1. **Extract Requirements**: Identify what the domain is supposed to do
2. **Find Bugs**: Detect logical errors, race conditions, edge cases
3. **Security Analysis**: Find vulnerabilities, injection points, auth issues
4. **Generate Fixes**: Propose code changes to fix identified issues

## Analysis Depth

- Read all specified files thoroughly
- Check for common patterns (error handling, validation, etc.)
- Consider security best practices
- Identify missing tests
- Look for code smells

## Handling Large Domains

If you encounter token limits:

1. Focus on the most critical files first
2. Use your repository map knowledge to understand context
3. Analyze high-risk areas (auth, data handling, external inputs)
4. You can work incrementally - analyze critical files, output results, then continue with remaining files
5. Prioritize security issues > bugs > code quality

## Output Format

**YOU MUST CREATE THIS FILE**: `.code-analysis/domains/{{DOMAIN_ID}}.json`

JSON structure (write this exact structure to the file):

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
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

## ACTION REQUIRED

**YOUR TASK**: Create the file `.code-analysis/domains/{{DOMAIN_ID}}.json` with the complete analysis.

**CRITICAL REQUIREMENTS**:

1. You MUST create/write the file `.code-analysis/domains/{{DOMAIN_ID}}.json`
2. The file MUST contain valid JSON with the complete structure shown above
3. Do NOT just describe what should be done - ACTUALLY CREATE THE FILE
4. Do NOT ask questions or wait for confirmation - WRITE THE FILE NOW
5. Perform thorough analysis and fill in all sections (requirements, bugs, securityIssues, fixes, recommendations)

**Example file path**: `.code-analysis/domains/{{DOMAIN_ID}}.json`

**What to include**:

- domainId: "{{DOMAIN_ID}}"
- domainName: "{{DOMAIN_NAME}}"
- timestamp: current ISO 8601 timestamp
- Complete analysis with requirements, bugs, security issues, fixes, and recommendations
