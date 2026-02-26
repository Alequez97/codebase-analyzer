# Domain Requirements Analysis

## Your Task

Analyze domain files and extract business requirements. Output to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Clear, testable requirement",
      "category": "business-rule | validation | behavior | edge-case | integration | error-handling",
      "priority": "P0 | P1 | P2 | P3",
      "source": "path/to/file.js:42",
      "confidence": "HIGH | MEDIUM | LOW",
      "relatedCode": "Optional code snippet"
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

{{#if USER_CONTEXT}}

## User Context

{{USER_CONTEXT}}
{{/if}}

{{#if INCLUDE_DOCUMENTATION}}

## Documentation Reference

Read `.code-analysis/domains/{{DOMAIN_ID}}/documentation/content.md` and `.code-analysis/domains/{{DOMAIN_ID}}/documentation/metadata.json` to understand the business context, then extract requirements that align with documented functionality and risk areas.
{{/if}}

## What to Extract

Look for:

1. **Business Rules** - Core logic, algorithms, decision points
2. **Validation** - Input checks, constraints, type validation
3. **Behaviors** - Expected outputs for given inputs
4. **Edge Cases** - Boundary conditions, null/empty handling
5. **Integration Points** - API calls, database queries, external services
6. **Error Handling** - Try-catch blocks, error checks

## Priority Levels

- **P0**: Critical business logic, security, data integrity
- **P1**: Important features, common use cases
- **P2**: Secondary features, edge cases
- **P3**: Nice-to-have, low-impact scenarios

## Execution

1. Read all files using `read_file`
   {{#if INCLUDE_DOCUMENTATION}}
2. Read documentation for context
3. Extract requirements from code
4. Save to `{{OUTPUT_FILE}}` using `write_file`
   {{else}}
5. Extract requirements from code
6. Save to `{{OUTPUT_FILE}}` using `write_file`
   {{/if}}
