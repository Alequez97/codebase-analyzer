# Domain Testing Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to analyze the domain files and output structured JSON with testing analysis.

## AVAILABLE TOOLS

You have access to these tools to explore the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns
- `write_file`: **REQUIRED** - Write your analysis output to the specified file

## Objective

Analyze the domain files to:

1. **Identify existing test files** - Find test files related to this domain
2. **Suggest missing tests** - Recommend tests that should be written based on requirements and code analysis
3. **Provide testing principles** - Strategic guidance for testing this domain

**IMPORTANT**: Do NOT calculate test coverage percentages. Coverage metrics come from actual test runners (Jest, Vitest, etc.), not AI analysis.

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Domain Name**: `{{DOMAIN_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

{{#if INCLUDE_REQUIREMENTS}}

## Requirements Context

The requirements analysis for this domain is available in `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`.

**USE THIS FILE**: Read the requirements file to understand what the code should do. Then:

1. Identify which requirements have tests and which don't
2. For requirements without tests, suggest what tests should be written
3. Prioritize test suggestions based on requirement priority
4. Map test suggestions to specific requirements

{{/if}}

## Task

**CRITICAL**: You MUST use the `read_file` tool to read ALL files listed above. You cannot analyze testing without reading the actual code.

**Step-by-step process**:

1. **Read each file** using the `read_file` tool (provide the file path from the list above)
   {{#if INCLUDE_REQUIREMENTS}}
2. **Read requirements** from `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`
3. **Identify existing test files** - Look for files with `.test.`, `.spec.`, `__tests__/` patterns
4. **Analyze test coverage** - Which requirements/features have tests, which don't
5. **Suggest missing tests** - Based on requirements and code paths that lack tests
6. **Output JSON** with all findings in the specified format
   {{else}}
7. **Identify existing test files** - Look for files with `.test.`, `.spec.`, `__tests__/` patterns
8. **Analyze what's tested** - Which code paths have tests, which don't
9. **Suggest missing tests** - Based on untested code paths and missing scenarios
10. **Output JSON** with all findings in the specified format
    {{/if}}

### What to Look For

When analyzing the code, identify:

1. **Existing Test Files**
   - Files ending with `.test.js`, `.test.ts`, `.spec.js`, `.spec.ts`
   - Files in `__tests__/` or `tests/` directories
   - What each test file covers
   - Test type: unit, integration, or e2e

2. **Missing Unit Tests** (for individual functions/modules)
   - Core business logic without tests
   - Validation functions without tests
   - Utility functions without tests
   - Edge cases not covered by existing tests
   - Error handling paths not tested

3. **Missing Integration Tests** (for component interactions)
   - API endpoints without tests
   - Database operations without tests
   - Service interactions without tests
   - Complete workflows not tested end-to-end

4. **Missing E2E Tests** (for user-facing features)
   - Critical user flows without E2E tests
   - Authentication/authorization flows
   - Payment or transaction flows
   - Multi-step processes

5. **Security Test Gaps**
   - Input validation not tested
   - Authentication/authorization not tested
   - SQL injection scenarios not tested
   - XSS scenarios not tested

6. **Testing Principles** for this domain
   - What makes testing this domain unique
   - Key areas that need special testing attention
   - Patterns to follow when writing tests

## Output Format

You MUST output your analysis as a valid JSON object with the following structure:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "existingTests": [
    {
      "file": "path/to/file.test.js",
      "description": "What this test file covers",
      "testType": "unit | integration | e2e"
    }
  ],
  "missingTests": {
    "unit": [
      {
        "id": "TEST-001",
        "description": "Clear description of what test should verify",
        "priority": "P0 | P1 | P2 | P3",
        "category": "security | validation | error-handling | business-logic | resilience",
        "suggestedTestFile": "path/to/file.test.js",
        "relatedRequirement": "REQ-001",
        "testCases": [
          {
            "scenario": "Specific scenario to test",
            "input": "What input data/conditions to test with",
            "expectedOutput": "What should happen",
            "assertionType": "toBeTruthy | toEqual | rejects | throws | etc"
          }
        ],
        "reason": "Why this test is important and what risk it mitigates"
      }
    ],
    "integration": [],
    "e2e": []
  },
  "testingPrinciples": {
    "description": "Testing principles and guidelines for this domain",
    "principles": [
      {
        "title": "Principle Title",
        "description": "Detailed description of the principle"
      }
    ]
  },
  "summary": {
    "totalExistingTests": 5,
    "totalMissingTests": 15,
    "missingByType": {
      "unit": 8,
      "integration": 5,
      "e2e": 2
    },
    "missingByPriority": {
      "P0": 3,
      "P1": 7,
      "P2": 5
    },
    "criticalGaps": ["Critical gap 1", "Critical gap 2"]
  }
}
```

### Field Descriptions

**Top-level fields**:

- **domainId**: The domain identifier (use `{{DOMAIN_ID}}`)
- **domainName**: Human-readable domain name (use `{{DOMAIN_NAME}}`)
- **existingTests**: Array of test files found in the codebase
- **missingTests**: Categorized list of tests that should be written
- **testingPrinciples**: Strategic testing guidance for this domain
- **summary**: High-level summary of testing status

**Existing test fields**:

- **file**: Path to the test file
- **description**: Brief description of what this test covers
- **testType**: Type of test (unit, integration, e2e)

**Missing test fields**:

- **id**: Unique identifier (TEST-001, TEST-002, etc.)
- **description**: Clear description of what the test should verify
- **priority**:
  - `P0`: Critical (security, data integrity, core flows)
  - `P1`: High (important business logic, common scenarios)
  - `P2`: Medium (standard features, edge cases)
  - `P3`: Low (nice-to-have, rare scenarios)
- **category**: Type of test (security, validation, error-handling, business-logic, resilience)
- **suggestedTestFile**: Where this test should be written
  - For unit tests: Use `.test.js` suffix next to the source file (e.g., `utils/helper.test.js` for `utils/helper.js`)
  - For integration tests: Use `tests/integration/` directory
  - For e2e tests: Use `tests/e2e/` directory
- **relatedRequirement**: Requirement ID this test verifies (if applicable)
- **testCases**: Array of specific test cases to write, each with:
  - `scenario`: Brief description of what this test case verifies
  - `input`: Specific input data, conditions, or function parameters to test with
  - `expectedOutput`: What should happen / what the test should verify
  - `assertionType`: Jest/Vitest assertion method (toBeTruthy, toEqual, rejects, throws, toContain, etc.)
- **reason**: Why this test is important (what risk it mitigates, what bug it prevents)

## Writing Guidelines

1. **Be Specific and Actionable** - Each test suggestion should be specific enough to write
2. **Prioritize Correctly**:
   - P0: Security vulnerabilities, data corruption, authentication failures, critical business flows
   - P1: Important business logic, common user workflows, payment processing
   - P2: Standard features, validation, edge cases
   - P3: Nice-to-have, cosmetic, rare scenarios
3. **Focus on Risk** - Prioritize tests that prevent the most serious failures
4. **Provide Context** - Explain WHY each test is needed, not just WHAT to test
5. **Map to Requirements** - When requirements are available, link tests to specific requirements
6. **Consider Test Types**:
   - **Unit**: Fast, isolated, test individual functions/modules
   - **Integration**: Test component interactions (API + database, service + cache)
   - **E2E**: Test complete user flows through the UI
7. **Be Realistic** - Suggest tests that can actually be written, not theoretical perfection
8. **Testing Principles** - Identify unique aspects of this domain that affect testing strategy

## Example Output

```json
{
  "domainId": "user-auth",
  "domainName": "User Authentication",
  "existingTests": [
    {
      "file": "backend/validators/password.test.js",
      "description": "Tests password validation rules including length and character requirements",
      "testType": "unit"
    },
    {
      "file": "backend/utils/tokenManager.test.js",
      "description": "Tests JWT token generation and validation",
      "testType": "unit"
    },
    {
      "file": "tests/integration/auth/login.test.js",
      "description": "Integration tests for login flow",
      "testType": "integration"
    }
  ],
  "missingTests": {
    "unit": [
      {
        "id": "TEST-001",
        "description": "Test JWT token validation with malformed tokens and security attack vectors",
        "priority": "P0",
        "category": "security",
        "suggestedTestFile": "backend/utils/tokenManager.test.js",
        "relatedRequirement": "REQ-003",
        "testCases": [
          {
            "scenario": "Token with invalid signature",
            "input": "JWT token with valid structure but invalid signature: 'eyJhbGc...invalid'",
            "expectedOutput": "Should throw TokenInvalidError",
            "assertionType": "rejects.toThrow"
          },
          {
            "scenario": "Token with tampered payload",
            "input": "Valid token with modified userId in payload",
            "expectedOutput": "Should reject and throw signature verification error",
            "assertionType": "rejects.toThrow"
          },
          {
            "scenario": "Token with 'none' algorithm",
            "input": "JWT with alg: 'none' header (common attack vector)",
            "expectedOutput": "Should reject tokens without proper algorithm",
            "assertionType": "rejects.toThrow"
          },
          {
            "scenario": "Token with expired timestamp",
            "input": "Token with exp timestamp in the past",
            "expectedOutput": "Should throw TokenExpiredError",
            "assertionType": "rejects.toThrow"
          }
        ],
        "reason": "Current tests only validate happy path. Missing tests for common JWT attack vectors that could allow unauthorized access"
      },
      {
        "id": "TEST-002",
        "description": "Test rate limiter behavior when Redis is unavailable",
        "priority": "P0",
        "category": "resilience",
        "suggestedTestFile": "backend/middleware/rateLimiter.test.js",
        "relatedRequirement": "REQ-002",
        "testCases": [
          {
            "scenario": "Redis connection timeout",
            "input": "Mock Redis client to timeout after 5 seconds",
            "expectedOutput": "Should fail-safe: either block all requests or allow with warning logged",
            "assertionType": "toBeDefined"
          },
          {
            "scenario": "Redis connection refused",
            "input": "Mock Redis client.connect() to throw ECONNREFUSED",
            "expectedOutput": "Should handle gracefully without crashing the app",
            "assertionType": "not.toThrow"
          },
          {
            "scenario": "Rate limiter fails to increment counter",
            "input": "Mock Redis incr() to fail",
            "expectedOutput": "Should fail-safe and log error without exposing security bypass",
            "assertionType": "toBeTruthy"
          }
        ],
        "reason": "No tests for rate limiter failure scenarios. System must fail safely when Redis is down to prevent complete service outage OR security bypass"
      }
    ],
    "integration": [
      {
        "id": "TEST-101",
        "description": "Test complete login flow with rate limiting triggered by failed attempts",
        "priority": "P0",
        "category": "security",
        "suggestedTestFile": "tests/integration/auth/rateLimiting.test.js",
        "relatedRequirement": "REQ-002",
        "testCases": [
          {
            "scenario": "6 consecutive failed login attempts trigger rate limit",
            "input": "POST /auth/login with wrong password 6 times for same IP",
            "expectedOutput": "7th attempt should return 429 Too Many Requests",
            "assertionType": "toEqual"
          },
          {
            "scenario": "Rate limit persists for configured duration",
            "input": "After rate limit triggered, wait 14 minutes and try again",
            "expectedOutput": "Should still be rate limited (15 min window)",
            "assertionType": "toEqual"
          },
          {
            "scenario": "Successful login resets failed attempt counter",
            "input": "3 failed attempts, then 1 successful login, then 5 more failed",
            "expectedOutput": "Should not trigger rate limit (counter reset after success)",
            "assertionType": "not.toEqual"
          }
        ],
        "reason": "Rate limiting is critical for preventing brute force attacks. Need end-to-end test of Redis, middleware, and controller working together"
      }
    ],
    "e2e": [
      {
        "id": "TEST-201",
        "description": "Complete user registration and email verification flow",
        "priority": "P1",
        "category": "critical-path",
        "suggestedTestFile": "tests/e2e/auth/registration.spec.js",
        "relatedRequirement": "REQ-007",
        "testCases": [
          {
            "scenario": "User registers with valid credentials",
            "input": "Fill registration form with email: 'newuser@test.com', password: 'Test123!@#'",
            "expectedOutput": "Should show success message and redirect to 'check email' page",
            "assertionType": "toContain"
          },
          {
            "scenario": "Verification email is sent",
            "input": "Check test email inbox for verification email",
            "expectedOutput": "Should receive email with verification link",
            "assertionType": "toBeDefined"
          },
          {
            "scenario": "User clicks verification link",
            "input": "Navigate to verification link from email",
            "expectedOutput": "Should confirm email and show 'Email verified' message",
            "assertionType": "toContain"
          },
          {
            "scenario": "User can login after verification",
            "input": "Login with verified email and password",
            "expectedOutput": "Should successfully authenticate and redirect to dashboard",
            "assertionType": "toContain"
          },
          {
            "scenario": "User cannot login before verification",
            "input": "Register new user but don't verify, attempt login immediately",
            "expectedOutput": "Should show 'Email not verified' error",
            "assertionType": "toContain"
          }
        ],
        "reason": "Registration is the entry point for all users. Need E2E test covering UI, backend, and email service"
      }
    ]
  },
  "testingPrinciples": {
    "description": "Testing principles and guidelines for this domain",
    "principles": [
      {
        "title": "Security-First Testing",
        "description": "All authentication code must have comprehensive security tests covering attack vectors like SQL injection, token theft, and brute force attacks"
      },
      {
        "title": "Fail-Safe Design",
        "description": "When external dependencies fail (Redis, database, email), tests should verify the system fails safely - either denying access or allowing degraded functionality, never exposing vulnerabilities"
      },
      {
        "title": "Test Realistic Scenarios",
        "description": "Tests should cover real-world scenarios including concurrent requests, token expiration edge cases, and network failures"
      }
    ]
  },
  "summary": {
    "totalExistingTests": 3,
    "totalMissingTests": 12,
    "missingByType": {
      "unit": 6,
      "integration": 4,
      "e2e": 2
    },
    "missingByPriority": {
      "P0": 4,
      "P1": 5,
      "P2": 3
    },
    "criticalGaps": [
      "No tests for JWT token attack vectors",
      "No tests for rate limiter failure scenarios",
      "Missing E2E tests for registration flow"
    ]
  }
}
```

## Task Execution

1. Use the available tools to read and analyze ALL files listed in the "Files to Analyze" section
   {{#if INCLUDE_REQUIREMENTS}}
2. Read the requirements file from `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`
3. Identify existing test files and what they cover
4. Identify missing tests based on requirements and code analysis
5. Provide testing principles
6. Use the `write_file` tool to save the analysis to: **`{{OUTPUT_FILE}}`**
   {{else}}
7. Identify existing test files and what they cover
8. Identify missing tests based on code analysis
9. Provide testing principles
10. Use the `write_file` tool to save the analysis to: **`{{OUTPUT_FILE}}`**
    {{/if}}

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** use `write_file` tool to save the output to: `{{OUTPUT_FILE}}`
2. ✅ **MUST** output valid JSON matching the specified schema
3. ✅ **MUST** analyze ALL files listed in the "Files to Analyze" section
4. ✅ **MUST** identify existing test files in the codebase
5. ✅ **MUST** suggest missing tests with clear descriptions and priorities
6. ✅ **MUST** provide test scenarios for each missing test
7. ✅ **MUST** explain WHY each test is important (risk mitigation)
8. ✅ **MUST** follow the file naming convention:
   - Unit tests: `filename.test.js` next to source file
   - Integration tests: `tests/integration/domain/feature.test.js`
   - E2E tests: `tests/e2e/domain/flow.spec.js`
9. ❌ **DO NOT** calculate test coverage percentages - that's for test runners
10. ❌ **DO NOT** ask questions or wait for input
11. ❌ **DO NOT** just describe what should be done
12. ✅ **WRITE THE FILE NOW** using `write_file` tool and exit
