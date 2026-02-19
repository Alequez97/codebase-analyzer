# Apply Missing Test - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to generate and write the missing test file based on the test recommendation.

## AVAILABLE TOOLS

You have access to these tools to work with the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns
- `write_file`: **REQUIRED** - Write the generated test file

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
- **Test File**: `{{TEST_FILE}}`
- **Test Type**: `{{TEST_TYPE}}`
- **Test Description**: `{{TEST_DESCRIPTION}}`
- **Test Scenarios**:
  {{#each TEST_SCENARIOS}}
  - {{this}}
    {{/each}}

## Source File to Test

**File**: `{{SOURCE_FILE}}`

This is the file that needs test coverage. You MUST read this file to understand:

- What functions/classes it exports
- What logic needs to be tested
- What dependencies it uses
- What error cases exist

## Task

**Step-by-step process**:

1. **Read the source file** using `read_file` tool to understand what needs to be tested
2. **Find existing test files** in the same directory or `__tests__/` to understand testing conventions
3. **Determine the testing framework** (Jest, Vitest, Mocha, etc.) from existing tests
4. **Generate the test file** following the same patterns as existing tests
5. **Write the test file** to `{{TEST_FILE}}` using the `write_file` tool

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
   - **AAA Pattern**: Each test must follow the Arrange, Act, Assert pattern with comments:
     ```javascript
     test("description", () => {
       // Arrange - Setup test data and dependencies
       // Act - Execute the code being tested
       // Assert - Verify the results
     });
     ```
   - Always place assertions under `// Assert` comment
     For tests that throw errors, use `// Act & Assert` when the act and assert are combined

3. **Test Scenarios**
   - Cover ALL scenarios listed in `{{TEST_SCENARIOS}}`
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

## Testing Framework Guidelines

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

## E// Arrange

    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    // Act
    const result = validateToken(validToken);

    // Assert
    expect(result).toBe(true);

});

test('should return false for token with invalid signature', () => {
// Arrange
const tokenWithBadSignature = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.INVALIDSIGNATURE';

    // Act
    const result = validateToken(tokenWithBadSignature);

    // Assert
    expect(result).toBe(false);

});

test('should return false for token with tampered payload', () => {
// Arrange
const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.TAMPERED.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    // Act
    const result = validateToken(tamperedToken);

    // Assert
    expect(result).toBe(false);

});

test('should return false for token with "none" algorithm', () => {
// Arrange
const noneAlgoToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.';

    // Act
    const result = validateToken(noneAlgoToken);

    // Assert
    expect(result).toBe(false);

});

test('should return false for expired token', () => {
// Arrange
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.4Adcj0p3O8P3PxhP6MxKQaqOXhLYjO1YJN1CjP1p_ns';

    // Act
    const result = validateToken(expiredToken);

    // Assert
    expect(result).toBe(false);

});

test('should throw error for null token', () => {
// Arrange
const nullToken = null;

    // Act & Assert
    expect(() => validateToken(nullToken)).toThrow('Token is required');

});

test('should throw error for empty string token', () => {
// Arrange
const emptyToken = '';

    // Act & Assert
    expect(() => validateToken(emptyTokeniOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.4Adcj0p3O8P3PxhP6MxKQaqOXhLYjO1YJN1CjP1p_ns';
    const result = validateToken(expiredToken);
    expect(result).toBe(false);

});

test('should throw error for null token', () => {
expect(() => validateToken(null)).toThrow('Token is required');
});Follow AAA Pattern** - EVERY test MUST use `// Arrange`, `// Act`, `// Assert` comments (or `// Act & Assert` for exceptions) 4. **Cover all scenarios** - Every scenario listed in `TEST_SCENARIOS` must have a test 5. **Use proper assertions** - Test actual behavior, not implementation details 6. **Make tests runnable** - Include all imports and setup needed to run the test 7. **Add helpful descriptions\*\* - Test names should clearly describe what is being tested
8 });
});

```

## Important Guidelines

1. **Read the source file FIRST** - You cannot write tests without understanding what the code does
2. **Match existing patterns** - Find and read other test files to match the project's testing style
3. **Cover all scenarios** - Every scenario listed in `TEST_SCENARIOS` must have a test
4. **Use proper assertions** - Test actual behavior, not implementation details
5. **Make tests runnable** - Include all imports and setup needed to run the test
6. **Add helpful descriptions** - Test names should clearly describe what is being tested
7. **Mock external dependencies** - Don't make real API calls, database queries, or file system operations in tests

## Task Execution

1. Use `read_file` to read the source file at `{{SOURCE_FILE}}`
2. Use `search_files` or `list_directory` to find existing test files and understand testing conventions
3. Use `read_file` to read 1-2 existing test files to understand framework and patterns
4. Generate a complete test file following the same patterns
5. Use `write_file` to save the test to: **`{{TEST_FILE}}`**

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** follow AAA pattern with `// Arrange`, `// Act`, `// Assert` comments in EVERY test
4. ✅ **MUST** cover ALL scenarios listed in `TEST_SCENARIOS`
5. ✅ **MUST** follow the same testing framework and patterns as existing tests
6. ✅ **MUST** include all necessary imports and setup
7. ✅ **MUST** make the test runnable (it should work when `npm test` is run)
8. ❌ **DO NOT** ask questions or wait for input
9. ❌ **DO NOT** just describe what should be done
10. ❌ **DO NOT** ask questions or wait for input
8. ❌ **DO NOT** just describe what should be done
9. ✅ **WRITE THE FILE NOW** using `write_file` tool and exit
```
