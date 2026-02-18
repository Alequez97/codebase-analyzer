# Domain Requirements Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to analyze the domain files and output structured JSON with comprehensive business requirements.

## AVAILABLE TOOLS

You have access to these tools to explore the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns
- `write_file`: **REQUIRED** - Write your analysis output to the specified file

## Objective

Analyze the domain files and extract comprehensive business requirements that will be used for test generation. Focus on business rules, validation logic, expected behaviors, and edge cases.

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Domain Name**: `{{DOMAIN_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

{{#if USER_CONTEXT}}

## Additional Context from User

{{USER_CONTEXT}}
{{/if}}

{{#if INCLUDE_DOCUMENTATION}}

## Domain Documentation Reference

Domain documentation is available at `.code-analysis/domains/{{DOMAIN_ID}}/documentation.json`.

**USE THIS FILE**: Read the documentation to understand the business purpose and architecture of this domain. Then extract requirements that:

1. Implement the documented business functionality
2. Handle the documented risk areas
3. Align with the documented responsibilities and architecture

{{/if}}

## Task

**CRITICAL**: You MUST use the `read_file` tool to read ALL files listed above. You cannot extract requirements without reading the actual code.

**Step-by-step process**:

1. **Read each file** using the `read_file` tool (provide the file path from the list above)
   {{#if INCLUDE_DOCUMENTATION}}
2. **Read documentation** from `.code-analysis/domains/{{DOMAIN_ID}}/documentation.json` to understand business context
3. **Analyze the code** to identify business rules, validation logic, expected behaviors aligned with the documentation
4. **Extract requirements** that describe what the code does and what tests should verify
5. **Output JSON** with all requirements in the specified format
   {{else}}
6. **Analyze the code** to identify business rules, validation logic, expected behaviors
7. **Extract requirements** that describe what the code does and what tests should verify
8. **Output JSON** with all requirements in the specified format
   {{/if}}

For each file, look for:

1. **Business Rules** - Core logic, algorithms, decision points, workflows
2. **Expected Behaviors** - What the domain should do under various conditions
3. **Data Validation** - Input validation, constraints, type checks, format requirements
4. **Edge Cases** - Boundary conditions, null/empty handling, special scenarios
5. **Integration Points** - API calls, database queries, external services, dependencies
6. **Error Handling** - Try-catch blocks, error checks, validation failures, error messages

## Output Format

You MUST output your analysis as a valid JSON object with the following structure:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Clear description of the requirement",
      "category": "business-rule | validation | behavior | edge-case | integration | error-handling",
      "priority": "P0 | P1 | P2 | P3",
      "source": "path/to/file.js:42",
      "confidence": "HIGH | MEDIUM | LOW",
      "relatedCode": "Relevant code snippet if helpful"
    }
  ]
}
```

### Field Descriptions

- **id**: Unique identifier (REQ-001, REQ-002, etc.)
- **description**: Clear, testable requirement statement
- **category**: Type of requirement
  - `business-rule`: Core business logic that must be implemented
  - `validation`: Data validation and constraint checking
  - `behavior`: Expected system behavior under specific conditions
  - `edge-case`: Boundary conditions and special scenarios
  - `integration`: Dependencies and interactions with other components
  - `error-handling`: How errors should be handled
- **priority**:
  - `P0`: Critical (security, data integrity, core functionality)
  - `P1`: High (important business logic)
  - `P2`: Medium (standard features)
  - `P3`: Low (nice-to-have, edge cases)
- **source**: File path and line number where this requirement is evident
- **confidence**: How confident you are that this is an actual requirement
- **relatedCode**: Optional code snippet showing where this requirement is implemented

## Writing Guidelines

1. **Be Specific and Testable** - Each requirement should be specific enough to write a test for
2. **Use Clear Language** - Write requirements that make sense to both technical and non-technical people
3. **Focus on "What", Not "How"** - Describe what should happen, not implementation details
4. **Include Examples** - When helpful, include example inputs/outputs in the description
5. **Extract from Code** - Look at actual code logic, validation checks, and error handling
6. **Consider Test Generation** - Requirements should be written to make test generation easier
7. **Prioritize Correctly**:
   - P0: Security vulnerabilities, data corruption, authentication failures
   - P1: Core business flows, payment processing, user workflows
   - P2: Standard features, UI validation, formatting
   - P3: Optional features, cosmetic issues, rare edge cases

## Example Output

```json
{
  "domainId": "user-auth",
  "domainName": "User Authentication",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Passwords must be at least 8 characters long with at least one uppercase letter, one lowercase letter, and one number",
      "category": "validation",
      "priority": "P0",
      "source": "auth/password-validator.js:15",
      "confidence": "HIGH",
      "relatedCode": "const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/"
    },
    {
      "id": "REQ-002",
      "description": "Failed login attempts should be rate-limited to 5 attempts per 15 minutes per IP address",
      "category": "business-rule",
      "priority": "P0",
      "source": "auth/rate-limiter.js:28",
      "confidence": "HIGH"
    },
    {
      "id": "REQ-003",
      "description": "JWT tokens should expire after 24 hours of inactivity",
      "category": "business-rule",
      "priority": "P1",
      "source": "auth/token-manager.js:55",
      "confidence": "HIGH",
      "relatedCode": "expiresIn: '24h'"
    },
    {
      "id": "REQ-004",
      "description": "When a user fails to authenticate, the system should return a generic 'invalid credentials' message without revealing whether the username or password was incorrect",
      "category": "error-handling",
      "priority": "P0",
      "source": "auth/login-handler.js:78",
      "confidence": "MEDIUM"
    },
    {
      "id": "REQ-005",
      "description": "Password reset tokens should be single-use and expire after 1 hour",
      "category": "business-rule",
      "priority": "P1",
      "source": "auth/password-reset.js:42",
      "confidence": "HIGH"
    },
    {
      "id": "REQ-006",
      "description": "Users with 'admin' role should bypass rate limiting restrictions",
      "category": "edge-case",
      "priority": "P2",
      "source": "auth/rate-limiter.js:65",
      "confidence": "MEDIUM"
    }
  ]
}
```

## What Makes Good Requirements for Test Generation

Good requirements are:

1. **Specific**: "Passwords must be at least 8 characters" (not "Passwords should be secure")
2. **Measurable**: "Rate limit to 5 attempts per 15 minutes" (not "Prevent brute force attacks")
3. **Testable**: Each requirement can directly translate to one or more test cases
4. **Complete**: Cover both happy path and error scenarios
5. **Traceable**: Link back to source code for verification

## Task Execution

1. ✅ **STEP 1**: Use `read_file` tool to read EVERY file in the "Files to Analyze" list
   {{#if INCLUDE_DOCUMENTATION}}
2. ✅ **STEP 2**: Read documentation from `.code-analysis/domains/{{DOMAIN_ID}}/documentation.json`
3. ✅ **STEP 3**: For each file, analyze the code and extract testable requirements aligned with documentation
4. ✅ **STEP 4**: Combine all requirements into a single JSON output
5. ✅ **STEP 5**: Use the `write_file` tool to save the JSON to: **`{{OUTPUT_FILE}}`**
   {{else}}
6. ✅ **STEP 2**: For each file, analyze the code and extract testable requirements
7. ✅ **STEP 3**: Combine all requirements into a single JSON output
8. ✅ **STEP 4**: Use the `write_file` tool to save the JSON to: **`{{OUTPUT_FILE}}`**
   {{/if}}

**Example workflow**:

```
1. read_file("path/to/file1.js")
   -> Analyze code -> Extract REQ-001, REQ-002, REQ-003

2. read_file("path/to/file2.js")
   -> Analyze code -> Extract REQ-004, REQ-005

3. read_file("path/to/file3.js")
   -> Analyze code -> Extract REQ-006, REQ-007, REQ-008

4. write_file("{{OUTPUT_FILE}}", "<JSON content with all requirements>")
```

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** use `read_file` tool for EVERY file in the list above
   {{#if INCLUDE_DOCUMENTATION}}
2. ✅ **MUST** read documentation from `.code-analysis/domains/{{DOMAIN_ID}}/documentation.json` before extracting requirements
3. ✅ **MUST** use `write_file` tool to save the output to: `{{OUTPUT_FILE}}`
4. ✅ **MUST** output valid JSON (not wrapped in markdown code blocks)
5. ✅ **MUST** analyze code logic, not just file names
6. ✅ **MUST** extract business rules, validation logic, and expected behaviors aligned with documentation
7. ✅ **MUST** include both happy path and error scenarios
   {{else}}
8. ✅ **MUST** use `write_file` tool to save the output to: `{{OUTPUT_FILE}}`
9. ✅ **MUST** output valid JSON (not wrapped in markdown code blocks)
10. ✅ **MUST** analyze code logic, not just file names
11. ✅ **MUST** extract business rules, validation logic, and expected behaviors
12. ✅ **MUST** include both happy path and error scenarios
    {{/if}}
13. ✅ **MUST** make requirements specific and testable
14. ✅ **MUST** prioritize requirements correctly (P0 for critical, P3 for low priority)
15. ✅ **MUST** include source file references with line numbers when possible
16. ❌ **DO NOT** ask questions or wait for input
17. ❌ **DO NOT** just describe what should be done
18. ✅ **WRITE THE FILE NOW** using `write_file` tool and exit
