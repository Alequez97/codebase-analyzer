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

Also read `package.json` (and workspace package files if relevant) to:

- Confirm which test framework and assertion libraries are available
- Check whether required packages for the test type are present (e.g. `mongodb-memory-server`, `supertest`, `nock` for integration tests)

### Step 3b: Install Missing Dependencies

If `package.json` is missing required packages for your test, install them before writing the test:

- Use `execute_command` with e.g. `npm install mongodb-memory-server --save-dev` or `npm install supertest --save-dev`
- If `package.json` has no `test` script, add one with `npm pkg set scripts.test="jest"` (or the appropriate runner)
- Only install packages that are genuinely absent from `package.json` — do not reinstall what is already there
- If `node_modules` does not exist at all, run `npm install` first

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

## Integration Test Constraints

When `TEST_TYPE` is `integration` or the target file path is under `integration/`:

1. Use a real database — if the project uses MongoDB, spin up `mongodb-memory-server` for the test suite and seed required data in `beforeEach`/`afterAll`
2. Use the real exported app (e.g. `app`, `server`) with `supertest` for HTTP assertions — do not replace it with a hand-rolled test harness
3. Use real middleware (auth, validation, etc.) — generate valid tokens/sessions as needed instead of mocking middleware
4. Only stub genuine external I/O boundaries that cannot be run locally: third-party HTTP APIs (mock with `nock`), cloud storage (e.g. AWS S3), email/SMS services
5. Clean up database state after each test to keep tests isolated
6. Follow any existing integration test conventions already present in the project

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

### For Integration Tests (MongoDB + supertest)

```javascript
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../app";
import User from "../../models/user";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/endpoint", () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
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
    expect(response.body).toMatchObject({ name: "Test", value: 123 });
    const saved = await MyModel.findById(response.body._id);
    expect(saved).not.toBeNull();
  });
});
```

## Critical Requirements

1. Follow the AAA pattern with `// Arrange`, `// Act`, `// Assert` comments in every test
2. Cover all scenarios listed in `TEST_SCENARIOS`
3. Match the testing framework and patterns found in the existing test files
4. Include all necessary imports and setup
5. Write the file content directly using `write_file` — no prose descriptions, no markdown code blocks
6. Run the test with `execute_command` after writing — the task is only complete when tests pass
7. Fix and re-run if tests fail (up to 3 iterations)
8. For integration tests: use the real database (spin up `mongodb-memory-server` if the project uses MongoDB — install it first if absent), use the real exported app, and use `supertest` for HTTP assertions — do not mock the database layer or application models

## Final Step

1. Write the test file to **`{{TEST_FILE}}`** using `write_file`
2. Run it with `execute_command` (e.g. `npx jest {{TEST_FILE}} --no-coverage`)
3. If it passes — write `# Done` to `{{PROGRESS_FILE}}`, then stop.
4. If it fails — read the error, fix the file, re-run. Repeat up to 3 times.

Generate the complete, runnable test code and write it now.
