# Domain Testing Analysis

## Your Task

Analyze testing for this domain. Output to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "existingTests": [
    {
      "filePath": "path/to/test.spec.js",
      "type": "unit | integration | e2e",
      "coveredFiles": ["file1.js", "file2.js"],
      "testCount": 10,
      "description": "What this test file covers"
    }
  ],
  "missingTests": [
    {
      "id": "TEST-001",
      "title": "Test for X functionality",
      "description": "What should be tested",
      "type": "unit | integration | e2e",
      "priority": "P0 | P1 | P2 | P3",
      "targetFile": "file.js",
      "relatedRequirement": "REQ-001",
      "testTemplate": "Optional code snippet"
    }
  ],
  "testingPrinciples": {
    "strategies": ["Strategy 1", "Strategy 2"],
    "criticalPaths": ["Path 1 needs thorough testing"],
    "recommendations": ["Recommendation 1"]
  }
}
```

**Do NOT calculate coverage percentages** - use test runner metrics instead.

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

Read `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json` to map requirements to tests and identify which requirements lack test coverage.
{{/if}}

## What to Analyze

1. **Existing Tests**
   - Find `.test.js`, `.spec.js`, `__tests__/` files
   - Identify what they cover
   - Classify as unit/integration/e2e

2. **Missing Unit Tests**
   - Core business logic
   - Validation functions
   - Edge cases

3. **Missing Integration Tests**
   - API endpoints
   - Database interactions
   - Component integration

4. **Missing E2E Tests**
   - Critical user flows
   - Multi-step processes

## Quality Rules for Suggested Tests

1. **Prefer deterministic assertions**

- Favor assertions about behavior and correctness (returned value, thrown error, persisted state, side effects).
- Avoid vague assertions like "works", "resolves", or "handles correctly" without a specific expected outcome.

2. **Avoid flaky time-based unit test checks**

- Do not suggest strict runtime thresholds in unit tests (for example: "must complete within 200ms").
- If performance is relevant, recommend a separate benchmark/performance test suite and label it clearly as performance-focused.

3. **Use realistic test mechanics**

- For expiry/rate-limit windows, prefer time mocking/fake timers over real waiting.
- For concurrency scenarios, suggest controlled parallel calls and deterministic assertions.

4. **Map test type to scope**

- Unit: pure logic, validation, error branches, deterministic behavior.
- Integration: API + DB/cache/service interactions and contracts.
- E2E: critical user journeys and observable UI/system outcomes.

5. **Security tests must be explicit**

- Include concrete attack vectors and expected rejection behavior (status code, error type/message, no privilege escalation).
- Prefer assertions that prove safe failure behavior when dependencies are unavailable.

## Test Priority

- **P0**: Critical business logic, security-sensitive code, data integrity
- **P1**: Core features, common user paths
- **P2**: Secondary features, less common scenarios
- **P3**: Edge cases, rare scenarios

## Execution

1. Read all files using `read_file`
2. Search for existing test files
   {{#if INCLUDE_REQUIREMENTS}}
3. Read requirements for context
4. Identify gaps between requirements and tests
5. Suggest missing tests
6. Save to `{{OUTPUT_FILE}}` using `write_file`
   {{else}}
7. Identify untested code paths
8. Suggest missing tests
9. Save to `{{OUTPUT_FILE}}` using `write_file`
   {{/if}}
