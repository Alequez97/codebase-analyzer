````markdown
# Domain Bugs & Security Analysis

Analyze **{{DOMAIN_NAME}}** files for bugs and security issues.

**Files:** `{{CODEBASE_PATH}}`
{{#each FILES}}- {{this}}
{{/each}}

{{#if INCLUDE_REQUIREMENTS}}Read `.code-analysis/domains/{{DOMAIN_ID}}/requirements/content.json` for context on intended behavior.
{{/if}}

## Output

Write to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "findings": [
    {
      "id": "BUG-001",
      "title": "...",
      "description": "What the issue is and why it matters",
      "type": "bug | security | quality",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "source": "path/to/file.js:42-58",
      "category": "logic | validation | security | performance | resource | null-safety | error-handling",
      "suggestedFix": "Short code snippet. For middleware/auth gaps name the existing middleware and show usage. Prose only if fix spans many files.",
      "impact": "What could go wrong"
    }
  ]
}
```

## What to Find

Logic bugs · null-safety · security (injection, XSS, auth, data exposure) · missing validation · race conditions · error handling gaps · resource leaks · performance issues (N+1, etc.)

Severity: **CRITICAL** = data loss / breach · **HIGH** = major breakage · **MEDIUM** = impaired functionality · **LOW** = minor / edge case

## Steps

1. Read all target files
   {{#if INCLUDE_REQUIREMENTS}}2. Read requirements for context
   {{/if}}3. Identify and record all findings
2. Write output to `{{OUTPUT_FILE}}`
3. Write `# Done` to `{{PROGRESS_FILE}}`
````

