# Domain Bugs & Security Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to analyze the domain files and output structured JSON with bugs, security vulnerabilities, and code quality issues.

## AVAILABLE TOOLS

You have access to these tools to explore the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns
- `write_file`: **REQUIRED** - Write your analysis output to the specified file

## Objective

Analyze the domain files to identify bugs, security vulnerabilities, and code quality issues that should be fixed or reviewed. Focus on logic errors, security risks, missing validations, and potential failures.

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

**USE THIS FILE**: Read the requirements file to understand what the code should do. Then identify:

1. Code that doesn't match the documented requirements
2. Missing implementations of documented requirements
3. Edge cases mentioned in requirements that aren't handled
4. Validation logic that conflicts with requirements

{{/if}}

## Task

**CRITICAL**: You MUST use the `read_file` tool to read ALL files listed above. You cannot identify bugs without reading the actual code.

**Step-by-step process**:

1. **Read each file** using the `read_file` tool (provide the file path from the list above)
   {{#if INCLUDE_REQUIREMENTS}}
2. **Read requirements** from `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`
3. **Compare code to requirements** and identify discrepancies
4. **Identify bugs and security issues** in the code
5. **Output JSON** with all findings in the specified format
   {{else}}
6. **Analyze the code** to identify bugs, security vulnerabilities, and quality issues
7. **Identify bugs and security issues** without assuming requirements context
8. **Output JSON** with all findings in the specified format
   {{/if}}

For each file, look for:

1. **Logic Bugs** - Incorrect algorithms, flawed conditional logic, wrong calculations
2. **Null/Undefined Handling** - Missing null checks, potential crashes
3. **Security Vulnerabilities**:
   - SQL/NoSQL injection vulnerabilities
   - XSS (Cross-Site Scripting) vulnerabilities
   - Authentication/Authorization flaws
   - Insecure data storage or transmission
   - Command injection risks
   - Unsafe deserialization
4. **Missing Validation** - Insufficient input validation, type mismatches
5. **Race Conditions** - Concurrency issues, race conditions
6. **Error Handling** - Missing error checks, improper exception handling
7. **Resource Leaks** - Unclosed connections, memory leaks
8. **Performance Issues** - N+1 queries, inefficient algorithms
9. **Deprecated/Unsafe APIs** - Usage of unsafe functions or deprecated features
10. **Missing Tests** - Critical code paths without test coverage

## Output Format

You MUST output your analysis as a valid JSON object with the following structure:

```json
{
  "domainId": "{{DOMAIN_ID}}",
  "domainName": "{{DOMAIN_NAME}}",
  "findings": [
    {
      "id": "BUG-001",
      "title": "Clear, concise title of the issue",
      "description": "Detailed description of what the bug is and why it's a problem",
      "type": "bug | security | quality",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "source": "path/to/file.js:42",
      "category": "logic | validation | security | performance | resource | null-safety | error-handling",
      "impact": "Description of what happens when this bug occurs",
      "recommendation": "How to fix this issue",
      "relatedCode": "Relevant code snippet showing the issue",
      "fixExample": "Optional code example showing the fix"
    }
  ]
}
```

### Field Descriptions

**Top-level fields**:

- **domainId**: The domain identifier (use `{{DOMAIN_ID}}`)
- **domainName**: Human-readable domain name (use `{{DOMAIN_NAME}}`)
- **findings**: Array of all identified bugs, security vulnerabilities, and quality issues

**Note**: The backend will automatically add `analyzedAt`, `taskId`, `logFile`, and `metadata` fields. You don't need to include these.

**Finding object fields**:

- **id**: Unique identifier (BUG-001, BUG-002, etc., or SEC-001 for security issues)
- **title**: Short, clear title summarizing the issue
- **description**: Detailed explanation of what the bug is and why it matters
- **type**: Category of issue
  - `bug`: Logic error or functional bug
  - `security`: Security vulnerability
  - `quality`: Code quality, performance, or maintainability issue
- **severity**: Impact level
  - `CRITICAL`: Causes data loss, security breach, or application crash
  - `HIGH`: Major functionality broken or significant security risk
  - `MEDIUM`: Feature works incorrectly or moderate security risk
  - `LOW`: Minor issue or edge case
- **source**: File path and line number where the issue is located
- **category**: Type of issue for better organization
- **impact**: What happens when this bug occurs or gets exploited
- **recommendation**: How to fix or mitigate this issue
- **relatedCode**: Code snippet showing the problematic code
- **fixExample**: Optional code example showing how to fix it

## Example Output

```json
{
  "domainId": "user-auth",
  "domainName": "User Authentication",
  "findings": [
    {
      "id": "SEC-001",
      "title": "SQL Injection Vulnerability in Login Query",
      "description": "User input is concatenated directly into SQL query without parameterization, allowing SQL injection attacks",
      "type": "security",
      "severity": "CRITICAL",
      "source": "auth/login-handler.js:28",
      "category": "security",
      "impact": "Attacker can bypass authentication, read/modify database, or execute arbitrary commands",
      "recommendation": "Use parameterized queries or prepared statements instead of string concatenation",
      "relatedCode": "const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
      "fixExample": "const query = 'SELECT * FROM users WHERE username = ? AND password = ?'; db.execute(query, [username, password]);"
    },
    {
      "id": "BUG-001",
      "title": "Missing Null Check on User Object",
      "description": "User object is accessed without checking if it exists, causing potential crash when user is not found",
      "type": "bug",
      "severity": "HIGH",
      "source": "auth/user-service.js:45",
      "category": "null-safety",
      "impact": "Application crashes with 'Cannot read property of undefined' when accessing non-existent user",
      "recommendation": "Add null/undefined check before accessing user properties",
      "relatedCode": "const userName = user.profile.name; // user could be null",
      "fixExample": "const userName = user?.profile?.name || 'Unknown';"
    },
    {
      "id": "SEC-002",
      "title": "Plaintext Password Storage",
      "description": "Passwords are stored in plaintext in the database instead of being hashed",
      "type": "security",
      "severity": "CRITICAL",
      "source": "auth/password-manager.js:12",
      "category": "security",
      "impact": "If database is compromised, all user passwords are exposed",
      "recommendation": "Use bcrypt or similar hashing algorithm to hash passwords before storing",
      "relatedCode": "db.save({ username, password: plaintext });",
      "fixExample": "const hashed = await bcrypt.hash(plaintext, 10); db.save({ username, password: hashed });"
    },
    {
      "id": "BUG-002",
      "title": "Incorrect Rate Limiting Logic",
      "description": "Rate limiter counts attempts on a global level instead of per-user/per-IP, affecting all users",
      "type": "bug",
      "severity": "MEDIUM",
      "source": "auth/rate-limiter.js:33",
      "category": "logic",
      "impact": "One user's failed attempts block all other users from logging in",
      "recommendation": "Track rate limit attempts per user or IP address, not globally",
      "relatedCode": "if (globalAttempts > 5) throw 'Rate limited';",
      "fixExample": "const key = `ratelimit:${ip}:${username}`; if (redis.get(key) > 5) throw 'Rate limited';"
    }
  ]
}
```

## Task Execution

1. ✅ **STEP 1**: Use `read_file` tool to read EVERY file in the "Files to Analyze" list
   {{#if INCLUDE_REQUIREMENTS}}
2. ✅ **STEP 2**: Read the requirements from `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json` to understand expected behavior
3. ✅ **STEP 3**: For each file, analyze the code and identify bugs/security issues
4. ✅ **STEP 4**: Combine all findings into a single JSON output
5. ✅ **STEP 5**: Use the `write_file` tool to save the JSON to: **`{{OUTPUT_FILE}}`**
   {{else}}
6. ✅ **STEP 2**: For each file, analyze the code and identify bugs/security issues
7. ✅ **STEP 3**: Combine all findings into a single JSON output
8. ✅ **STEP 4**: Use the `write_file` tool to save the JSON to: **`{{OUTPUT_FILE}}`**
   {{/if}}

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** use `read_file` tool for EVERY file in the list above
   {{#if INCLUDE_REQUIREMENTS}}
2. ✅ **MUST** read requirements from `.code-analysis/domains/{{DOMAIN_ID}}/requirements.json`
3. ✅ **MUST** compare code implementation to documented requirements
   {{/if}}
4. ✅ **MUST** use `write_file` tool to save the output to: `{{OUTPUT_FILE}}`
5. ✅ **MUST** output valid JSON (not wrapped in markdown code blocks)
6. ✅ **MUST** identify real bugs and security vulnerabilities
7. ✅ **MUST** prioritize by severity (CRITICAL issues first)
8. ✅ **MUST** include source file references with line numbers
9. ✅ **MUST** provide clear impact descriptions and recommendations
10. ✅ **MUST** include code snippets showing the problem
11. ❌ **DO NOT** ask questions or wait for input
12. ✅ **WRITE THE FILE NOW** using `write_file` tool and exit
