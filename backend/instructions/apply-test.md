# Apply Missing Test - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to generate and write the missing test file based on the test recommendation.

## Available Tools

You have access to these tools:

- **`read_file`**: Read file contents (use this to examine source files and example tests)
- **`list_directory`**: List directory contents (use to find test files)
- **`write_file`**: Write the generated test file (REQUIRED - use this to save the test)

## Objective

Generate a complete, working test file based on the test recommendation. The test should:

1. **Follow project testing conventions** - Use the same testing framework and patterns as existing tests
2. **Be comprehensive** - Cover all scenarios listed in the test recommendation
3. **Be runnable** - Include all necessary imports, setup, and teardown
4. **Follow best practices** - Use proper assertions, mocking, and test structure

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Test ID**: `{{TEST_ID}}`
- **Test File Path**: `{{TEST_FILE}}`
- **Test Type**: `{{TEST_TYPE}}`
- **Test Description**: `{{TEST_DESCRIPTION}}`
- **Source File**: `{{SOURCE_FILE}}`
- **Test Scenarios to Cover**:
  {{#each TEST_SCENARIOS}}
  - {{this}}
    {{/each}}

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

### Step 4: Generate the Test File

Create a complete test file that:

- Follows the same framework and patterns as the examples
- Covers ALL scenarios listed in `TEST_SCENARIOS` above
- Uses proper AAA pattern (Arrange, Act, Assert)
- Includes all necessary imports
- Is ready to run with `npm test`

### Step 5: Write the Test File

**CRITICAL**: Use `write_file` to save the generated test to: **`{{TEST_FILE}}`**

This is MANDATORY - the task is not complete until you write the file.

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
   - Cover ALL scenarios listed above in `TEST_SCENARIOS`
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
5. ✅ Make the test runnable (it should work when `npm test` is run)
6. ✅ Write the completed test file to `{{TEST_FILE}}` and exit

**MUST NOT DO**:

7. ❌ DO NOT ask questions or wait for input
8. ❌ DO NOT ask for files - they are already provided
9. ❌ DO NOT just describe what should be done - write the file
10. ❌ DO NOT use Markdown code blocks in your response - write the actual file

## Final Step

**IMMEDIATELY write the test file to `{{TEST_FILE}}` using the `write_file` tool and exit.**

The file path is: **`{{TEST_FILE}}`**

Generate the complete, runnable test code and write it now.
