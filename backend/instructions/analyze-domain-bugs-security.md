# Domain Bugs & Security Analysis

## Your Task

Analyze domain files for bugs and security issues. Output to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "findings": [
    {
      "id": "BUG-001",
      "title": "Clear, concise title",
      "description": "What the issue is and why it matters",
      "type": "bug | security | quality",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "source": "path/to/file.js:42",
      "category": "logic | validation | security | performance | resource | null-safety | error-handling",
      "suggestedFix": "Short code snippet showing the fix. For middleware/auth issues, reference the existing middleware by name and show how to apply it. Use a prose description only when the fix spans many files or requires a large refactor.",
      "impact": "What could go wrong"
    }
  ]
}
```

## Available Tools

- `read_file`: Read file contents
- `list_directory`: List directory contents
- `search_files`: Find files by pattern
- `write_file`: Save output to `{{OUTPUT_FILE}}`

## Target Files

- **Codebase**: `{{CODEBASE_PATH}}`
- **Domain**: `{{DOMAIN_NAME}}` (ID: `{{DOMAIN_ID}}`)
- **Files**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

{{#if INCLUDE_REQUIREMENTS}}

## Requirements Reference

Read `.code-analysis/domains/{{DOMAIN_ID}}/requirements/content.json` to understand what the code should do, then identify where it falls short.
{{/if}}

## Writing a Good `suggestedFix`

- **Default: write a code snippet.** A short, focused example is almost always more useful than prose.
- **Middleware / shared utilities**: if the fix is adding an existing middleware or calling a shared helper, name it explicitly and show the one-line usage (e.g. `router.post('/login', checkAuth, checkPermission('admin'), handler)`).
- **Use prose only** when the fix is genuinely large — touches more than two or three files, requires a non-trivial refactor, or the core insight cannot be expressed as a snippet. In that case, keep the description concise and actionable.
- Never wrap a plain English sentence in a code block.

## What to Look For

1. **Logic Bugs** - Incorrect algorithms, flawed conditional logic
2. **Null Safety** - Missing null checks, potential crashes
3. **Security** - Injection risks, XSS, auth flaws, insecure storage
4. **Validation** - Missing input validation, type mismatches
5. **Race Conditions** - Concurrency issues
6. **Error Handling** - Missing error checks, improper exception handling
7. **Resource Leaks** - Unclosed connections, memory leaks
8. **Performance** - N+1 queries, inefficient algorithms

## Severity Levels

- **CRITICAL**: Data loss, security breaches, system crashes
- **HIGH**: Major functionality broken, significant security risk
- **MEDIUM**: Important features impaired, moderate security concern
- **LOW**: Minor issues, edge case problems

## Execution

1. Read all files using `read_file`
   {{#if INCLUDE_REQUIREMENTS}}
2. Read requirements for context
3. Identify bugs and security issues
4. Save to `{{OUTPUT_FILE}}` using `write_file`
5. Write `# Done` to `{{PROGRESS_FILE}}`
   {{else}}
6. Identify bugs and security issues
7. Save to `{{OUTPUT_FILE}}` using `write_file`
8. Write `# Done` to `{{PROGRESS_FILE}}`
   {{/if}}
