# Domain Refactoring & Testing Analysis

## Your Task

Analyze refactoring needs and testing for this domain. Output to **`{{OUTPUT_FILE}}`**:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",

  "refactoringRecommendations": [
    {
      "id": "REFACTOR-001",
      "priority": "P0 | P1 | P2 | P3",
      "category": "extract-business-logic | reduce-complexity | improve-modularity | enhance-testability | decouple-dependencies | extract-validation",
      "title": "Clear refactoring title",
      "targetFile": "path/to/file.js",
      "targetFunction": "functionName",
      "startLine": 100,
      "endLine": 150,
      "issue": "What architectural problem prevents testing",
      "extractionPlan": {
        "newServiceFile": "path/to/new-service.js",
        "extractedFunctions": [
          {
            "name": "extractedFunctionName",
            "purpose": "What this function does",
            "params": ["param1", "param2"],
            "returns": "returnType"
          }
        ]
      },
      "benefits": [
        "Specific benefit 1",
        "Specific benefit 2"
      ],
      "unblocks": ["TEST-001", "TEST-002"],
      "estimatedEffort": "30 minutes",
      "status": "pending"
    }
  ],

  "existingTests": [
    {
      "file": "frontend/tests/domain/feature.test.js",
      "description": "Brief summary of what this test file covers",
      "testType": "unit | integration | e2e"
    }
  ],
  "missingTests": {
    "unit": [
      {
        "id": "TEST-001",
        "blockedBy": "REFACTOR-001",  // Optional: refactoring ID that must be applied first
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
      // Same schema as unit tests
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
      // Same schema as unit/integration tests
      // Use { "field": "step", "value": "action" } for E2E checks input
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

## Refactoring Recommendations (Priority: Testability)

Before identifying missing tests, **analyze code for testability barriers**. Recommend refactorings that:

### When to Recommend Refactoring

1. **Business Logic in Controllers/Presenters**
   - Controllers with 50+ lines of logic that should be in services
   - Complex calculations, transformations, or algorithms in HTTP handlers
   - Data merging, validation, or aggregation logic mixed with request/response handling

2. **Untestable Code Structures**
   - Functions that require database connections for testing simple logic
   - Circular dependencies preventing module isolation
   - Global state or singletons that prevent parallel testing

3. **Complexity That Hinders Testing**
   - Functions exceeding 50 lines with multiple responsibilities
   - Deeply nested conditionals (3+ levels) that are hard to test exhaustively
   - Mixed concerns (UI + data + API logic in one file)

### Refactoring Categories

- **extract-business-logic**: Move logic from controllers to services/utilities
- **reduce-complexity**: Break down large functions into testable units
- **improve-modularity**: Separate concerns to enable isolated testing
- **enhance-testability**: Remove hard dependencies (DB, HTTP) from pure logic
- **decouple-dependencies**: Break circular or tight coupling
- **extract-validation**: Move validation logic to reusable validators

### Refactoring Priority

- **P0**: Blocks critical security or data-integrity tests
- **P1**: Blocks main business workflow tests
- **P2**: Blocks secondary feature tests
- **P3**: Code quality improvement, no tests blocked

### Extraction Plan Requirements

For each refactoring:

1. **Be specific**: Provide exact file, function, and line numbers
2. **Show the plan**: Name the new service file and extracted functions
3. **Explain benefits**: How this enables testing (e.g., "enables fast unit tests without DB")
4. **Link to tests**: Use `unblocks` field to reference TEST-IDs that require this refactoring

### Important: Link Refactoring to Tests

- If a test requires refactoring first, use `blockedBy` field in missing test
- Tests marked as blocked should have clear scenarios but note they can't be implemented yet
- Refactoring `unblocks` array should list all TEST-IDs that will become implementable

**Important:** `missingTests` MUST be an object with `unit`, `integration`, and `e2e` arrays. Do not output a flat array.

## Required Output Fields (Strict)

- For every `existingTests[]` item, include: `file`, `description`, `testType`.
  - Keep `existingTests` entries **minimal** - just file path, brief description, and type. Don't analyze in depth.
  - Focus analysis effort on `missingTests`.
- For every item in `missingTests.unit[]`, `missingTests.integration[]`, and `missingTests.e2e[]`, include:
  - `id`, `description`, `priority`, `category`, `suggestedTestFile`, `relatedRequirement`, `scenarios`, `reason`.
- `scenarios` must be a non-empty array.
- Each `scenarios[]` item must include: `scenario`, `checks` (non-empty).
- Each `checks[]` item must include: `input` (array of `{ field, value }`), `expectedOutput`, `assertionType`.
- For e2e checks, represent user actions as `input` items with `field: "step"` and the action in `value`.
- The `value` in each `input` item must be a **raw JSON value** (object, array, string, number, boolean) — **never a JSON-encoded string**. ✅ Correct: `{ "field": "status", "value": {"minutes": 1000} }`
- JSON must use valid key-value syntax. Do not output invalid objects like `{ "step", "value": "..." }`.
- Do not omit `suggestedTestFile` or `scenarios` for any missing-test entry.

## Test Description Guidelines

**Write specific, actionable descriptions** that explain WHAT is being tested and WHY it matters:

- ❌ **Too vague**: "Aircraft status is updated and update_date is refreshed"
- ✅ **Specific**: "updateAircraftStatus merges engine status by position without duplicating entries and refreshes timestamp"

- ❌ **Too vague**: "Create aircraft with valid data"
- ✅ **Specific**: "POST /aircraft returns 201 and creates linked Permission and MaintenanceProgramRevision records"

- ❌ **Too vague**: "Test validation"
- ✅ **Specific**: "POST /aircraft returns 400 with error details when required fields are missing"

Include:

- The specific function/endpoint being tested
- The key behavior or edge case
- Business impact when relevant (e.g., "prevents duplicate entries", "ensures data isolation")

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

## What Makes a Valuable Test (Critical Guidance)

### High-Value Tests (PRIORITIZE THESE)

Focus on tests that **protect business value** and **catch real bugs**:

1. **Business Logic & Calculations**
   - Complex algorithms and transformations
   - Multi-step business workflows
   - State transitions and lifecycle management
   - Conditional logic with multiple branches
   - Data aggregations and computations

2. **Authorization & Security**
   - Permission checks and access control
   - Role-based restrictions
   - Data isolation between users/tenants
   - Authentication flows and token handling
   - Input sanitization and injection prevention

3. **Error Handling & Edge Cases**
   - Error paths in business workflows
   - Boundary conditions (empty, null, max values)
   - Race conditions and concurrency issues
   - Network failures and retry logic
   - Invalid state transitions

4. **Integration Points**
   - **API contracts**: Verify correct status codes (400, 401, 403, etc.) and error message format
   - Database transactions and consistency
   - External service interactions and error handling
   - Message queuing and async operations

5. **Critical User Workflows**
   - End-to-end business processes
   - Multi-step operations that modify state
   - Time-sensitive or scheduled operations
   - Payment/financial transactions

### Low-Value Tests (AVOID OR DEPRIORITIZE)

**Do NOT suggest tests for:**

1. **Unit Tests on Model/Schema Validation**
   - ❌ **Unit test on Mongoose model**: "Verify that aircraft.serial field is required"
   - ❌ **Unit test on Mongoose model**: "Test that email field validates format"
   - ❌ **Unit test on Mongoose model**: "Check that maxLength is enforced on registration"
   - **Why avoid**: These test framework/ORM behavior, not your business logic
   - **Important**: API contract validation in integration tests is DIFFERENT (see examples below)

2. **Trivial Getters/Setters**
   - ❌ "Test that getName() returns name"
   - ❌ "Verify setStatus() sets status"

3. **Framework/Library Behavior**
   - ❌ "Test that Mongoose saves to database"
   - ❌ "Verify Express routes correctly"

4. **Obvious Happy Paths** (unless complex)
   - ❌ "Test basic CRUD with valid data"
   - Only suggest if there's non-trivial business logic involved

### Important Distinction: Unit vs Integration Validation Tests

- ❌ **BAD (Unit test on model)**: Testing Mongoose schema validators directly

  ```javascript
  // DON'T suggest this - tests framework, not business logic
  it("should require serial field", async () => {
    const aircraft = new Aircraft({
      /* no serial */
    });
    await expect(aircraft.save()).rejects.toThrow();
  });
  ```

- ✅ **GOOD (Integration test on API)**: Testing API contract and error responses
  ```javascript
  // DO suggest this - tests API behavior and user-facing contracts
  it("POST /aircraft returns 400 when serial is missing", async () => {
    const response = await request(app)
      .post("/aircraft")
      .send({ registration: "ABC123" }); // missing serial
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("serial");
  });
  ```

**The difference**: Integration tests verify the **entire API contract** (status codes, error messages, request/response flow), while unit tests on models just duplicate framework validation.

### Test Suggestion Guidelines

When suggesting a missing test:

1. **Ask**: "Would this test catch a bug that could harm the business?"
2. **Ask**: "Does this test verify custom business logic (not framework behavior)?"
3. **Ask**: "What corner case or error scenario does this protect against?"

If the answer to all three is "no" or "nothing specific", **skip that test**.

### Examples: Good vs Bad Test Suggestions

#### ❌ BAD (Unit Test on Mongoose Schema)

```json
{
  "id": "TEST-001",
  "description": "Validate aircraft schema constraints and field requirements",
  "category": "data-integrity",
  "suggestedTestFile": "backend/models/aircraft.test.js",
  "reason": "Ensure required fields are properly validated"
}
```

**Why bad**: Tests Mongoose schema validators, not business logic. Framework responsibility.

#### ✅ GOOD (Integration Test for API Contract)

```json
{
  "id": "TEST-101",
  "description": "POST /aircraft validation returns 400 with clear errors for missing required fields",
  "category": "validation",
  "suggestedTestFile": "backend/tests/integration/aircraft/create-aircraft-validation.integration.test.js",
  "reason": "Verifies API contract: users receive proper error messages when submitting invalid data. Protects user experience and API consumers."
}
```

**Why good**: Tests the entire API contract (status codes, error format, user-facing behavior), not just model validation.

#### ✅ GOOD (Business Logic with Edge Cases)

```json
{
  "id": "TEST-002",
  "description": "Aircraft status transitions respect maintenance lock rules",
  "category": "business-logic",
  "suggestedTestFile": "backend/services/aircraft/aircraft-lifecycle.test.js",
  "reason": "Critical business rule: aircraft in maintenance cannot be assigned to flights. Bug could cause safety issues and scheduling conflicts."
}
```

**Why good**: Tests custom business rule with real consequences.

#### ❌ BAD (Trivial CRUD)

```json
{
  "id": "TEST-003",
  "description": "Create aircraft with valid data",
  "suggestedTestFile": "backend/controllers/aircraft.test.js",
  "reason": "Basic CRUD operation should work"
}
```

**Why bad**: No edge cases, no business logic, just framework behavior.

#### ✅ GOOD (Authorization Corner Case)

```json
{
  "id": "TEST-004",
  "description": "Prevent pilots from editing aircraft assigned to other airlines",
  "category": "security",
  "suggestedTestFile": "backend/middleware/authorization/aircraft-access.test.js",
  "reason": "Multi-tenant authorization bug: users should only access their airline's aircraft. Bug could expose competitor data."
}
```

**Why good**: Tests authorization with business context and data isolation.

#### ❌ BAD (Framework Responsibility)

```json
{
  "id": "TEST-005",
  "description": "Test that registration field accepts valid format",
  "suggestedTestFile": "backend/models/aircraft.test.js",
  "reason": "Field validation is important"
}
```

**Why bad**: Regex validation is tested by the validation library.

#### ✅ GOOD (Complex Business Calculation)

```json
{
  "id": "TEST-006",
  "description": "Calculate aircraft utilization rate with partial month edge cases",
  "category": "business-logic",
  "suggestedTestFile": "backend/services/analytics/utilization-calculator.test.js",
  "reason": "Complex calculation involving flight hours, downtime, and calendar boundaries. Bug could cause incorrect billing or capacity planning."
}
```

**Why good**: Tests complex calculation with edge cases that affect business decisions.

## What to Analyze

0. **Refactoring Needs (Analyze First)**
   - Identify controllers/handlers with 50+ lines of business logic
   - Find functions mixing HTTP/DB concerns with pure business logic
   - Look for complex algorithms or calculations in wrong layers
   - Identify code that requires DB/HTTP to test simple logic
   - Check for circular dependencies or tight coupling preventing testing
   - **Output refactorings that would unlock better testing**

1. **Existing Tests**

- Find unit tests co-located near the tested files using `*.test.js`
- Find integration tests under `backend/tests/**`
- Find e2e tests under `frontend/tests/**`
- Identify what they cover
- Classify as unit/integration/e2e

2. **Missing Unit Tests** (High-Value Focus)
   - **Business logic** with conditional branches
   - **Calculations and transformations**
   - **Authorization and permission checks**
   - **Error handling in business workflows**
   - **State transitions and lifecycle management**
   - **Complex validation** (not schema-level, but business rules)

3. **Missing Integration Tests** (High-Value Focus)
   - **API contract validation**: Proper status codes (400, 401, 403, 404, 500) and error messages for invalid inputs
   - API endpoints with **business logic**
   - **Transaction boundaries** and data consistency
   - **Authorization enforcement** at API layer (e.g., ensure 403 when user lacks permission)
   - Integration between multiple services/modules
   - **Error scenarios** in API workflows (network failures, database errors, timeouts)
   - **Side effects**: Verify database state, notifications sent, logs written

4. **Missing E2E Tests**
   - **Critical user journeys** that modify important state
   - **Multi-step business processes**
   - **Security-sensitive workflows** (admin actions, permissions)
   - **Payment or financial operations**

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

6. **Integration test tooling conventions**

- For backend HTTP integration tests, prefer `supertest` for endpoint-level assertions.
- Prefer tests that exercise the real exported backend app/router wiring; avoid controller-only harnesses as the default recommendation.
- Do not rely on live external HTTP services in integration tests.
- Prefer `nock` for mocking outbound HTTP interactions unless the codebase already has an established alternative.

5. **Security tests must be explicit**

- Include concrete attack vectors and expected rejection behavior (status code, error type/message, no privilege escalation).
- Prefer assertions that prove safe failure behavior when dependencies are unavailable.

## Test Priority Guidelines

Assign priority based on **business impact**, not code complexity:

- **P0** (Critical - Test First):
  - Authorization/permission checks that prevent unauthorized access
  - Financial calculations or payment processing
  - Data integrity checks that prevent corruption
  - Security vulnerabilities (injection, XSS, CSRF)
  - Critical business rules that affect money, compliance, or user safety

- **P1** (High - Core Features):
  - Main business workflows with complex logic
  - Common user operations with state changes
  - Error handling in critical paths
  - Multi-step processes with failure recovery

- **P2** (Medium - Secondary Features):
  - Less common but still important business scenarios
  - Edge cases in core features
  - Non-critical integrations
  - Performance optimizations

- **P3** (Low - Nice to Have):
  - Rare edge cases with minimal business impact
  - Optional features
  - Cosmetic or UI-only logic
  - **Schema validation tests** (framework responsibility)

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
