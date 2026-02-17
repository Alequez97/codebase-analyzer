# Domain Requirements Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to write `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json` and exit.

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

## Task

Read all domain files listed above and extract requirements that describe:

1. **Business Rules** - Core logic and validation rules
2. **Expected Behaviors** - What the domain should do under various conditions
3. **Data Validation** - Input validation, constraints, and data integrity rules
4. **Edge Cases** - Boundary conditions and special scenarios
5. **Integration Points** - How this domain interacts with other parts of the system
6. **Error Handling** - Expected error scenarios and how they should be handled

## Output Format

**YOU MUST CREATE THIS FILE**: `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`

The file must be valid JSON with the following structure:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "analyzedAt": "2024-01-15T10:30:00Z",
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
  "analyzedAt": "2024-01-15T10:30:00Z",
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

## ACTION REQUIRED

**YOUR TASK**: Create `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json` with comprehensive business requirements extracted from the code.

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** create/write the file `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`
2. ✅ **MUST** write valid JSON (not Markdown, not wrapped in code blocks)
3. ✅ **MUST** analyze ALL files listed in the "Files to Analyze" section
4. ✅ **MUST** extract business rules, validation logic, and expected behaviors
5. ✅ **MUST** include both happy path and error scenarios
6. ✅ **MUST** make requirements specific and testable
7. ✅ **MUST** prioritize requirements correctly (P0 for critical, P3 for low priority)
8. ✅ **MUST** include source file references
9. ❌ **DO NOT** ask questions or wait for input
10. ❌ **DO NOT** just describe what should be done
11. ✅ **WRITE THE FILE NOW** and exit

## Final Reminder

**THIS IS NOT A DRY RUN. WRITE THE ACTUAL FILE NOW.**

File path: `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`

Expected format: Valid JSON following the schema above

**CREATE THIS FILE NOW AND EXIT.**
