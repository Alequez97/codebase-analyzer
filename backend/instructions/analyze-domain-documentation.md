# Domain Documentation Analysis - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your ONLY job is to analyze the domain files and output comprehensive Markdown documentation.

## AVAILABLE TOOLS

You have access to these tools to explore the codebase:

- `list_directory`: List files and subdirectories
- `read_file`: Read specific file contents
- `search_files`: Find files matching patterns

## Objective

Analyze the domain files and generate comprehensive business documentation in Markdown format.

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Domain Name**: `{{DOMAIN_NAME}}`
- **Files to Analyze**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

## Task

Read all domain files listed above and generate a comprehensive Markdown documentation that explains:

1. **Business Purpose** - What this domain does and why it matters
2. **Core Responsibilities** - Key functions and capabilities
3. **Architecture** - How components work together
4. **Key Components** - Important files and their roles
5. **Risk Areas** - Critical paths that need special attention

## Output Format

You MUST output your documentation as pure Markdown with the following structure:

```markdown
# {{DOMAIN_NAME}}

[Brief description of what this domain does]

## Core Responsibilities

- Responsibility 1
- Responsibility 2
- Responsibility 3

## Why it matters

[Explain the business value and importance of this domain]

## Key Components

### Component Name

**File**: `path/to/file.js`

Description of what this component does and its role.

### Another Component

**File**: `path/to/another.js`

Description of what this component does and its role.

## Architecture

[Explain how the components work together, data flow, dependencies, etc.]

## Risk Areas

[Identify critical paths, security concerns, performance bottlenecks, etc.]
```

## Writing Guidelines

1. **Clear and Professional** - Write for both technical and non-technical readers
2. **Business-Focused** - Explain WHY, not just WHAT
3. **Rich Markdown** - Use headings, lists, code examples, and formatting
4. **Code Examples** - Include relevant code snippets when helpful (use triple backticks)
5. **Component Descriptions** - For each key file, explain its purpose and role
6. **Architecture Clarity** - Explain how components interact and data flows
7. **Risk Awareness** - Identify critical areas that need special attention

## Example Output

```markdown
# User Authentication

Handles user login, session management, and access control for the platform.

## Core Responsibilities

- Validate user credentials against database
- Generate and manage JWT tokens
- Enforce role-based access control (RBAC)
- Handle password reset workflows
- Manage user sessions and timeouts

## Why it matters

Authentication is the foundation of platform security. Any vulnerability here could compromise the entire system. This domain ensures that only authorized users can access protected resources and that user identities are verified correctly.

## Key Components

### Password Service

**File**: `auth/password-service.js`

Handles password hashing, validation, and reset workflows. Uses bcrypt with 10 rounds for hashing.

### Token Manager

**File**: `auth/token-manager.js`

Generates and validates JWT tokens. Manages token refresh and expiration logic.

### Auth Middleware

**File**: `auth/middleware.js`

Express middleware that protects routes by verifying JWT tokens and checking user permissions.

### Session Store

**File**: `auth/session-store.js`

Redis-based session storage for quick token validation and user state management.

## Architecture

The authentication flow follows these steps:

1. User submits credentials via `/api/auth/login`
2. Password Service validates credentials against database
3. Token Manager generates JWT with user roles
4. Session Store caches the token in Redis
5. Auth Middleware validates tokens on subsequent requests

Sessions are stored in Redis for performance, with automatic expiration after 24 hours of inactivity.

## Risk Areas

- **Password Security**: All passwords must be hashed with bcrypt before storage
- **Token Expiration**: Expired tokens must be rejected to prevent unauthorized access
- **Session Hijacking**: Tokens should be transmitted only over HTTPS
- **Brute Force**: Login attempts should be rate-limited to prevent attacks
```

## Task Execution

1. Use the available tools to read and analyze ALL files listed in the "Files to Analyze" section
2. Extract business purpose, architecture, and key components from the code
3. Identify risk areas and critical paths
4. Output comprehensive Markdown documentation following the structure above

**CRITICAL REQUIREMENTS**:

1. ✅ **MUST** output pure Markdown (no JSON, no unnecessary code blocks)
2. ✅ **MUST** analyze ALL files listed in the "Files to Analyze" section
3. ✅ **MUST** explain business purpose and value
4. ✅ **MUST** describe key components and their roles
5. ✅ **MUST** explain architecture and how components interact
6. ✅ **MUST** identify risk areas and critical paths
7. ❌ **DO NOT** ask questions or wait for input
8. ❌ **DO NOT** just describe what should be done
9. ✅ **OUTPUT THE MARKDOWN NOW** and exit

**Note**: The system will automatically save your Markdown output to the appropriate file. You do not need to use any file writing tools.
