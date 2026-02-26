# Domain Testing Analysis

## Your Task

Analyze testing for this domain. Output to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "existingTests": [
    {
      "file": "frontend/tests/domain/feature.test.js",
      "description": "What this test file covers",
      "testType": "unit | integration | e2e",
      "coveredFiles": ["file1.js", "file2.js"],
      "testCount": 10,
      "relatedRequirements": ["REQ-001"],
      "lastUpdated": "2026-01-01T00:00:00.000Z",
      "quality": "good | moderate | weak",
      "gaps": ["Optional short list of uncovered areas"],
      "notes": "Optional implementation details"
    }
  ],
  "missingTests": {
    "unit": [
      {
        "id": "TEST-001",
        "description": "What should be tested",
        "priority": "P0 | P1 | P2 | P3",
        "category": "security | resilience | validation | business-logic | data-integrity | performance | edge-case",
        "suggestedTestFile": "path/near/source-file.test.js",
        "relatedRequirement": "REQ-001",
        "scenarios": [
          {
            "scenario": "Short scenario title",
            "checks": [
              {
                "input": [{ "field": "fieldName", "value": "example value" }],
                "expectedOutput": "Deterministic expected result",
                "assertionType": "toBe | toEqual | toMatch | toHaveProperty | toThrow | rejects | resolves"
              }
            ]
          }
        ],
        "reason": "Why this test is missing and important"
      }
    ],
    "integration": [
      {
        "id": "TEST-101",
        "description": "Integration gap",
        "priority": "P0 | P1 | P2 | P3",
        "category": "security | resilience | validation | business-logic | data-integrity | performance | edge-case",
        "suggestedTestFile": "backend/tests/integration/domain/feature.integration.test.js",
        "relatedRequirement": "REQ-001",
        "scenarios": [],
        "reason": "Why this test is missing and important"
      }
    ],
    "e2e": [
      {
        "id": "TEST-201",
        "description": "E2E gap",
        "priority": "P0 | P1 | P2 | P3",
        "category": "security | resilience | validation | business-logic | data-integrity | performance | edge-case",
        "suggestedTestFile": "frontend/tests/e2e/domain/feature.test.js",
        "relatedRequirement": "REQ-001",
        "scenarios": [
          {
            "scenario": "End-to-end user flow",
            "checks": [
              {
                "input": [{ "field": "step", "value": "describe action" }],
                "expectedOutput": "Observable user-visible outcome",
                "assertionType": "toBeVisible | toContainText | toHaveURL"
              }
            ]
          }
        ],
        "reason": "Why this test is missing and important"
      }
    ]
  },
  "testingPrinciples": {
    "description": "Testing principles and guidelines for this domain",
    "principles": [
      {
        "title": "Principle title",
        "description": "Principle details"
      }
    ]
  },
  "summary": {
    "totalExistingTests": 0,
    "totalMissingTests": 0,
    "missingByType": {
      "unit": 0,
      "integration": 0,
      "e2e": 0
    },
    "missingByPriority": {
      "P0": 0,
      "P1": 0,
      "P2": 0
    },
    "criticalGaps": ["Short critical gap summary"]
  }
}
```

**Important:** `missingTests` MUST be an object with `unit`, `integration`, and `e2e` arrays. Do not output a flat array.

## Required Output Fields (Strict)

- For every `existingTests[]` item, include: `file`, `description`, `testType`.
- For every item in `missingTests.unit[]`, `missingTests.integration[]`, and `missingTests.e2e[]`, include:
  - `id`, `description`, `priority`, `category`, `suggestedTestFile`, `relatedRequirement`, `scenarios`, `reason`.
- `scenarios` must be a non-empty array.
- Each `scenarios[]` item must include: `scenario`, `checks` (non-empty).
- Each `checks[]` item must include: `input` (array of `{ field, value }`), `expectedOutput`, `assertionType`.
- Do not omit `suggestedTestFile` or `scenarios` for any missing-test entry.

## Suggested Test File Placement (Strict)

- `missingTests.unit[].suggestedTestFile` must be **near source files** (co-located), not in centralized test roots.
  - Allowed examples: `backend/models/flight_logs/flight_log.test.js`, `frontend/src/views/Aircraft/FlightLog/FlightLog.test.js`
  - Disallowed examples: `backend/tests/...`, `frontend/tests/...`
- `missingTests.integration[].suggestedTestFile` must be inside `backend/tests/**`.
  - Example: `backend/tests/integration/flight-logs/update-flight-log.integration.test.js`
- `missingTests.e2e[].suggestedTestFile` must be inside `frontend/tests/**`.
  - Example: `frontend/tests/e2e/flight-logs/flight-log-lifecycle.test.js`

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

## Scope Rules (Strict)

1. Treat the provided `Files` list as the primary analysis scope.
2. First, read/analyze files from that domain list and test files directly related to them.
3. Only expand beyond domain scope if required to resolve a concrete dependency used by those files.
4. Do not scan unrelated project areas.
5. Do not read task queue/state artifacts (for example `.code-analysis/tasks/**`).
6. Do not use example/mock analysis folders as source data (for example `.code-analysis-example/**`).
7. Keep exploration minimal: prioritize targeted `search_files` patterns over broad directory traversal.

### Recommended search-first workflow

- Search unit tests near the source files first (co-located `*.test.js`).
- Search integration tests in `backend/tests/**`.
- Search e2e tests in `frontend/tests/**`.
- Prefer `*.test.js` naming. Do not suggest `.spec.js` files.
- Read only the most relevant tests and source files needed to identify coverage gaps.
- If extra files are needed, read only a small number of directly connected dependencies.

### Suggested path output rules

- For `unit` missing tests, output co-located paths only (not `backend/tests/**` and not `frontend/tests/**`).
- For `integration` missing tests, output `backend/tests/**` paths only.
- For `e2e` missing tests, output `frontend/tests/**` paths only.

{{#if INCLUDE_REQUIREMENTS}}

## Requirements Reference

Read `.code-analysis/domains/{{DOMAIN_ID}}/requirements/content.json` to map requirements to tests and identify which requirements lack test coverage.
{{/if}}

## What to Analyze

1. **Existing Tests**

- Find unit tests co-located near the tested files using `*.test.js`
- Find integration tests under `backend/tests/**`
- Find e2e tests under `frontend/tests/**`
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

1. Start with the provided domain file list (`{{#each FILES}}{{this}}, {{/each}}`) and read only relevant files first.
2. Search for existing test files related to domain files.
   {{#if INCLUDE_REQUIREMENTS}}
3. Read requirements for context.
4. Identify gaps between requirements and tests.
5. Suggest missing tests.
6. Save to `{{OUTPUT_FILE}}` using `write_file`.
   {{else}}
7. Identify untested code paths.
8. Suggest missing tests.
9. Save to `{{OUTPUT_FILE}}` using `write_file`.
   {{/if}}
