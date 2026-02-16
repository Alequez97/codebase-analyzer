# Detailed Domain Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to write `.code-analysis/domains/{{DOMAIN_ID}}.json` and exit.

## Objective

Perform comprehensive domain analysis to generate:

1. **Documentation**: Business purpose and architectural overview
2. **Requirements**: Business logic rules extracted from code
3. **Testing**: Current coverage, existing tests, missing tests, and recommendations

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Domain Name**: `{{DOMAIN_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

## Task Breakdown

### 1. Documentation Analysis

Read all domain files and generate:

- **Business Purpose**: What this domain does and why it matters (Markdown format)
- **Core Responsibilities**: Key functions and capabilities
- **Architecture**: How components work together
- **Risk Areas**: Critical paths that need special attention

**Format**: Rich Markdown with headings, lists, code examples

### 2. Requirements Extraction

Analyze code to identify business rules:

- What the code is supposed to do (not bugs, but expected behavior)
- Business logic patterns
- Validation rules
- State management requirements
- Error handling requirements

Each requirement should have:

- Unique ID (REQ-001, REQ-002, etc.)
- Clear description of the business rule
- Source file/location where it's implemented or evident
- Confidence level (HIGH/MEDIUM/LOW)
- Priority (P0 for critical, P1 for important, P2 for nice-to-have)

### 3. Testing Analysis

Perform comprehensive test analysis:

#### Current Coverage

Calculate or estimate:

- Overall coverage percentage
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

#### Existing Tests

Identify existing test files:

- Test file paths
- Number of tests in each file
- Pass rate (if determinable)
- Last run timestamp (if available)

#### Missing Tests

Identify gaps in test coverage:

- Critical paths without tests
- Edge cases not covered
- Error scenarios not tested
- Integration points without tests

Each missing test should include:

- Unique ID (MISS-001, MISS-002, etc.)
- Description of what needs to be tested
- Priority (P0/P1/P2)
- Estimated effort (Low/Medium/High)
- Suggested test file (extend existing or create new)

#### Recommendations

General test improvement suggestions:

- Test strategies to adopt
- Coverage goals
- Test types needed (unit, integration, E2E)
- Testing best practices

## Output Format

**YOU MUST CREATE THIS FILE**: `.code-analysis/domains/{{DOMAIN_ID}}.json`

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "timestamp": "ISO 8601 timestamp",

  "documentation": {
    "businessPurpose": "# Domain Name\n\nMarkdown-formatted comprehensive documentation...\n\n## Core Responsibilities\n- Responsibility 1\n- Responsibility 2\n\n## Architecture\n\nDescribe how it works...\n\n## Risk Focus\n\nWhat could go wrong..."
  },

  "requirements": [
    {
      "id": "REQ-001",
      "description": "Detailed description of what the code should do",
      "source": "path/to/file.js or component name",
      "confidence": "HIGH|MEDIUM|LOW",
      "priority": "P0|P1|P2"
    }
  ],

  "testing": {
    "currentCoverage": {
      "overall": "65%",
      "statements": "68%",
      "branches": "60%",
      "functions": "70%",
      "lines": "65%"
    },
    "existingTests": [
      {
        "file": "path/to/test.spec.js",
        "testsCount": 5,
        "passRate": "100%",
        "lastRun": "ISO 8601 timestamp or null"
      }
    ],
    "missingTests": [
      {
        "id": "MISS-001",
        "description": "What needs to be tested",
        "priority": "P0|P1|P2",
        "estimatedEffort": "Low|Medium|High",
        "suggestedTestFile": "path/to/existing.test.js or path/to/new.test.js"
      }
    ],
    "recommendations": [
      "Add integration test for X",
      "Increase branch coverage to 80%",
      "Add performance tests for Y"
    ]
  },

  "tests": [
    {
      "id": "TEST-001",
      "scenario": "Brief description of existing test",
      "type": "unit|integration|e2e",
      "priority": "P0|P1|P2",
      "testFile": "path/to/test.js"
    }
  ],

  "recommendations": [
    "General recommendations for domain improvement",
    "Code quality suggestions",
    "Performance optimization ideas"
  ]
}
```

## Analysis Guidelines

### Documentation

- Write in **clear, professional Markdown**
- Use proper heading hierarchy (# ## ###)
- Include code examples where helpful (use backticks)
- Focus on business value, not implementation details
- Explain WHY this domain exists, not just WHAT it does

### Requirements

- Extract actual business rules from the code
- Look for validation logic, state machines, business workflows
- Identify constraints and invariants
- Focus on "should" and "must" behaviors
- Don't confuse requirements with bugs (requirements = expected behavior)

### Testing Coverage

- If test files exist, analyze them
- If Jest/Vitest coverage reports exist, use them
- Otherwise, estimate based on:
  - Number of functions/methods
  - Number of branches/conditions
  - Number of existing tests
- Be honest about gaps in coverage

### Missing Tests

- Prioritize critical paths (P0)
- Look for untested error handling
- Identify missing edge case tests
- Check for missing integration tests
- **IMPORTANT**: If test files exist, suggest extending them rather than creating new files

### Test File Identification

- Look for files matching patterns: `*.test.js`, `*.spec.js`, `*.test.ts`, `*.spec.ts`
- Check common test directories: `__tests__/`, `test/`, `tests/`
- Identify the test framework (Jest, Vitest, Mocha, etc.)

## Prioritization

### Requirements Priority

- **P0**: Critical business rules that must work correctly
- **P1**: Important features, serious if broken
- **P2**: Nice-to-have, minor business impact

### Testing Priority

- **P0**: Critical paths, security, data integrity, user-facing features
- **P1**: Important but not critical, error scenarios, edge cases
- **P2**: Nice-to-have, rare scenarios, minor improvements

## ACTION REQUIRED

**YOUR TASK**: Create `.code-analysis/domains/{{DOMAIN_ID}}.json` with complete analysis.

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** create/write the file `.code-analysis/domains/{{DOMAIN_ID}}.json`
2. ✅ **MUST** use the exact JSON structure shown above
3. ✅ **MUST** write rich Markdown in `documentation.businessPurpose`
4. ✅ **MUST** extract real requirements from code analysis
5. ✅ **MUST** analyze test coverage and identify gaps
6. ✅ **MUST** identify existing test files to avoid duplication
7. ❌ **DO NOT** ask questions or wait for input
8. ❌ **DO NOT** just describe what should be done
9. ✅ **WRITE THE FILE NOW** and exit

## Example Values

**Good Documentation.businessPurpose**:

```markdown
# User Authentication Domain

Handles user login, session management, and access control for the platform.

## Core Responsibilities

- Validate user credentials against database
- Generate and manage JWT tokens
- Enforce role-based access control (RBAC)
- Handle password reset workflows

## Architecture

Uses a middleware-based approach with passport.js for strategy management.
Session tokens are stored in Redis for quick validation.

## Risk Focus

Security is paramount. Any authentication bypass could compromise the entire system.
```

**Good Requirement**:

```json
{
  "id": "REQ-001",
  "description": "User passwords must be hashed with bcrypt (10 rounds) before storage in database",
  "source": "auth/password-service.js:23",
  "confidence": "HIGH",
  "priority": "P0"
}
```

**Good Missing Test**:

```json
{
  "id": "MISS-001",
  "description": "Test login failure with invalid password returns 401 status",
  "priority": "P0",
  "estimatedEffort": "Low",
  "suggestedTestFile": "auth/auth-controller.test.js"
}
```

## Final Reminder

**THIS IS NOT A DRY RUN. WRITE THE ACTUAL FILE NOW.**

File path: `.code-analysis/domains/{{DOMAIN_ID}}.json`

Expected sections:

- ✅ documentation.businessPurpose (rich Markdown)
- ✅ requirements[] (business rules from code)
- ✅ testing.currentCoverage (coverage metrics)
- ✅ testing.existingTests[] (identified test files)
- ✅ testing.missingTests[] (gaps in coverage)
- ✅ testing.recommendations[] (improvement suggestions)
- ✅ tests[] (list of existing test scenarios)
- ✅ recommendations[] (general improvements)

**CREATE THIS FILE NOW AND EXIT.**
