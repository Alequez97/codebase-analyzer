# Apply Missing Test - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your job is to generate the missing test file, write it, **run it to verify it passes**, and fix any failures before finishing.

## Available Tools

You have access to these tools:

- **`read_file`**: Read file contents (use this to examine source files and example tests)
- **`list_directory`**: List directory contents (use to find test files)
- **`write_file`**: Write the generated test file (REQUIRED - use this to save the test)
- **`execute_command`**: Run the test suite to validate your test file passes (REQUIRED - must be used after writing the test)

## Objective

Generate a complete, working test file based on the test recommendation. The test should:

1. **Follow project testing conventions** - Use the same testing framework and patterns as existing tests
2. **Be comprehensive** - Cover all scenarios listed in the test recommendation
3. **Be runnable and passing** - Include all necessary imports, setup, and teardown; confirmed by running `execute_command`
4. **Follow best practices** - Use proper assertions, mocking, and test structure

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Test ID**: `{{TEST_ID}}`
- **Test File Path**: `{{TEST_FILE}}`
- **Test Type**: `{{TEST_TYPE}}`
- **Test Description**: `{{TEST_DESCRIPTION}}`
- **Source File**: `{{SOURCE_FILE}}`
- **Scenario Titles**:
  {{#each TEST_SCENARIOS}}
  - {{this}}
    {{/each}}

- **Detailed Test Cases (authoritative)**:

```json
{{TEST_SCENARIOS_JSON}}
```

## Task Workflow

**Follow these steps EXACTLY**:

### Step 1: Read the Source File

Use `read_file` to read `{{SOURCE_FILE}}` to understand:

- What functions/classes/routes it exports
- What logic needs to be tested
- What dependencies it uses
- What error cases exist

### Step 2: Find Example Test Files

Use `list_directory` to explore directories like:

- `tests/`
- `test/`
- `__tests__/`
- `backend/tests/`
- `src/tests/`

Look for files matching patterns:

- `*.test.js`, `*.test.ts`
- `*.spec.js`, `*.spec.ts`

**For integration tests**: Prioritize files in `integration/` or `e2e/` directories
**For unit tests**: Prioritize files NOT in `integration/` or `e2e/` directories

### Step 3: Study Example Test Files

Use `read_file` to read 1-2 example test files to understand:

- What testing framework is used (Jest, Vitest, Mocha, etc.)
- How tests are structured (describe blocks, test/it blocks)
- How imports are written
- How mocking is done
- What assertion style is used

Also read `package.json` (and workspace package files if relevant) to confirm available test dependencies before generating imports.

### Step 4: Generate the Test File

Create a complete test file that:

- Follows the same framework and patterns as the examples
- Covers ALL scenarios and checks from `TEST_SCENARIOS_JSON` above
- Uses proper AAA pattern (Arrange, Act, Assert)
- Includes all necessary imports
- Is ready to run with `npm test`

### Step 5: Write the Test File

**CRITICAL**: Use `write_file` to save the generated test to: **`{{TEST_FILE}}`**

This is MANDATORY - the task is not complete until you write the file.

### Step 6: Run the Tests

After writing the file, use `execute_command` to run the test and verify it passes.

Choose the most targeted command that exercises only your new test file, for example:

- **Jest / Vitest**: `npx jest {{TEST_FILE}} --no-coverage` or `npx vitest run {{TEST_FILE}}`
- **Mocha**: `npx mocha {{TEST_FILE}}`
- **Pytest**: `pytest {{TEST_FILE}}`
- If you are unsure of the runner, check `package.json` → `scripts.test` and adapt accordingly.

**If the tests PASS** (exit code 0): the task is complete — stop here.

### Step 7: Fix Failures and Re-run

If the tests FAIL:

1. Read the error output carefully — identify the root cause (import path wrong, wrong assertion, missing mock, etc.)
2. Use `write_file` to overwrite `{{TEST_FILE}}` with the corrected test code
3. Use `execute_command` again to re-run the tests
4. Repeat until all tests pass or you have exhausted reasonable fixes (max 3 fix iterations)

**Common failure causes**:

- Wrong import path → check the source file's actual location with `list_directory`
- Missing dependency → read `package.json` and adjust mocking strategy
- Incorrect mock → read the source file again to understand the actual API shape
- Wrong assertion value → run the code mentally and adjust the expectation

### What to Include in the Generated Test

1. **Imports**
   - Testing framework imports (describe, test, expect, etc.)
   - Source file imports (the code being tested)
   - Mocking utilities if needed (jest.mock, vi.mock, etc.)
   - Required dependencies

2. **Test Structure**
   - `describe` block for the module/function being tested
   - `test` or `it` blocks for each scenario
   - Proper setup (`beforeEach`) and teardown (`afterEach`) if needed
   - **AAA Pattern**: Each test MUST follow the Arrange, Act, Assert pattern with comments:
     ```javascript
     test("description", () => {
       // Arrange - Setup test data and dependencies
       // Act - Execute the code being tested
       // Assert - Verify the results
     });
     ```
   - For tests that throw errors, use `// Act & Assert` when the act and assert are combined

3. **Test Scenarios**

- Cover ALL scenarios and checks listed in `TEST_SCENARIOS_JSON`
  - Add additional edge cases that make sense
  - Test both success and failure paths

4. **Assertions**
   - Use appropriate matchers (toBe, toEqual, toThrow, etc.)
   - Test the actual behavior, not implementation details
   - Clear assertion messages when helpful

5. **Mocking** (if needed)
   - Mock external dependencies (database, APIs, file system)
   - Mock timers if testing time-based logic
   - Provide mock data that's realistic

## Integration Test Constraints (Strict)

When `TEST_TYPE` is `integration` or the target file path is under `integration/`:

1. Use `supertest` for HTTP endpoint testing (request/response assertions).
2. Prefer importing the existing exported application (for example `app`, `server`, or equivalent) instead of creating a new custom app/server harness in the test.
3. Do not mount controllers directly onto a custom test app unless there is no exported app entry point available.
4. If fallback local app setup is unavoidable, document it in a short comment and mirror production middleware/route wiring as closely as possible.
5. Never call real external HTTP services in tests.
6. Mock outbound HTTP requests with `nock` when available in project dependencies.
7. If the project already uses a different HTTP-mocking library in existing tests, follow that existing convention consistently.
8. Include setup/cleanup to prevent mock leakage between tests (for example `beforeEach`/`afterEach` cleanup).

## Testing Framework Examples

### For Jest/Vitest

```javascript
import { describe, test, expect, beforeEach, vi } from "vitest"; // or from '@jest/globals'
import { functionToTest } from "./sourceFile";

describe("functionToTest", () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  test("should do something when given valid input", () => {
    // Arrange
    const input = "valid input";

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe("expected output");
  });

  test("should throw error when given invalid input", () => {
    // Arrange
    const invalidInput = null;

    // Act & Assert
    expect(() => functionToTest(invalidInput)).toThrow(
      "Expected error message",
    );
  });

  test("should handle edge case", () => {
    // Arrange
    const emptyInput = "";

    // Act
    const result = functionToTest(emptyInput);

    // Assert
    expect(result).toBe("default value");
  });
});
```

### For Integration Tests

```javascript
import request from "supertest";
import app from "../../app";
import db from "../../db";

describe("POST /api/endpoint", () => {
  beforeEach(async () => {
    await db.clearTestData();
  });

  test("should create resource with valid data", async () => {
    // Arrange
    const validData = { name: "Test", value: 123 };

    // Act
    const response = await request(app)
      .post("/api/endpoint")
      .send(validData)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({
      name: "Test",
      value: 123,
    });
  });

  test("should return 400 when data is invalid", async () => {
    // Arrange
    const invalidData = { invalidField: "value" };

    // Act
    const response = await request(app)
      .post("/api/endpoint")
      .send(invalidData)
      .expect(400);

    // Assert
    expect(response.body.error).toBeDefined();
  });
});
```

## CRITICAL REQUIREMENTS

**MUST DO**:

1. ✅ Follow AAA pattern with `// Arrange`, `// Act`, `// Assert` comments in EVERY test
2. ✅ Cover ALL scenarios listed in `TEST_SCENARIOS`
3. ✅ Follow the same testing framework and patterns as the example test files
4. ✅ Include all necessary imports and setup
5. ✅ Write the completed test file to `{{TEST_FILE}}` using `write_file`
6. ✅ **Run the test file** with `execute_command` after writing it — tests MUST pass before you finish
7. ✅ **Fix and re-run** if tests fail (up to 3 times) before declaring the task complete
8. ✅ For integration tests, use `supertest` and avoid real network calls
9. ✅ Mock outbound HTTP interactions (prefer `nock` unless project conventions require another library)
10. ✅ For integration tests, use the real exported app wiring by default (not a hand-rolled test server harness)

**MUST NOT DO**:

7. ❌ DO NOT ask questions or wait for input
8. ❌ DO NOT ask for files - they are already provided
9. ❌ DO NOT just describe what should be done - write the file
10. ❌ DO NOT use Markdown code blocks in your response - write the actual file
11. ❌ DO NOT make live HTTP calls to third-party services in tests
12. ❌ DO NOT default to creating a new custom test app/server harness in integration tests when an existing app export exists
13. ❌ DO NOT declare the task complete if the tests are still failing

## Final Step

1. Write the test file to **`{{TEST_FILE}}`** using `write_file`
2. Run it with `execute_command` (e.g. `npx jest {{TEST_FILE}} --no-coverage`)
3. If it passes — you are done. Stop.
4. If it fails — read the error, fix the file, re-run. Repeat up to 3 times.

Generate the complete, runnable test code and write it now.
