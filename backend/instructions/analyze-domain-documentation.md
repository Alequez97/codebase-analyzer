# Domain Documentation Analysis

## Your Task

Analyze the domain files and create comprehensive business documentation. Write pure Markdown to **`{{OUTPUT_FILE}}`**.

**Use `write_file` once to save your complete Markdown documentation.**

## Available Tools

- `read_file`: Read file contents
- `list_directory`: List directory contents
- `search_files`: Find files by pattern
- `write_file`: Save output to `{{OUTPUT_FILE}}`

## Target Files

- **Codebase**: `{{CODEBASE_PATH}}`
- **Domain**: `{{DOMAIN_NAME}}` (ID: `{{DOMAIN_ID}}`)
- **Files**:
  {{#each FILES}}
  - {{this}}
    {{/each}}

## Documentation Structure

Create Markdown documentation with these sections:

1. **Title & Overview** - Domain name and 1-2 sentence description
2. **Core Responsibilities** - Bullet list of key functions
3. **Architecture Diagrams** - Mermaid diagrams showing:
   - Sequence diagrams for API flows
   - Flowcharts for business logic
   - Architecture diagrams for component relationships
   - State machines for lifecycle management
4. **Why It Matters** - Business value and impact
5. **Key Components** - Main files and their purposes
6. **Risk Areas** - Security and performance concerns

**Use Mermaid diagrams extensively.** One diagram replaces paragraphs of text.

## Mermaid Diagram Syntax Rules

**CRITICAL: Follow these rules to ensure diagrams render correctly:**

### General Rules

1. **Always use quotes for labels with special characters** (spaces, slashes, colons, parentheses, etc.)
2. **Comments must be on their own line** - never inline with code
3. **No special characters in node IDs** - use simple alphanumeric IDs only
4. **Test syntax** - validate diagrams render without errors

### Flowchart / Graph Syntax

```mermaid
flowchart LR
  %% Comments on their own line
  NodeA["Label with /special:chars()"]
  NodeB["Another label"]

  subgraph Group["Group Name"]
    NodeC["Item 1"]
    NodeD["Item 2"]
  end

  NodeA --> NodeB
  NodeB --> NodeC
```

**Rules:**

- Node IDs: simple names (A, B, NodeA, AUTH, DB)
- Labels: always use quotes if they contain: `/`, `:`, `(`, `)`, `[`, `]`, spaces
- Subgraph syntax: `subgraph ID["Label"]`
- Comments: `%% Comment text` on separate line

### Sequence Diagram Syntax

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as "API Server"
  participant DB as "Database"

  Client->>API: POST /login
  API->>DB: findOne({email})
  DB-->>API: user object

  %% Conditional logic
  alt User found
    API-->>Client: 200 Success
  else Not found
    API-->>Client: 404 Not Found
  end

  Note over API,DB: This is a note
```

**Rules:**

- Use quotes for participant aliases: `participant API as "API Server"`
- Message syntax: `A->>B: message text` (no quotes needed for simple messages)
- Use quotes if message contains special chars: `A->>B: "POST /api/login"`
- Comments on own line: `%% This is why we do this`
- Notes syntax: `Note over A,B: text` or `Note right of A: text`

### State Diagram Syntax

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: start()
  Processing --> Complete: finish()
  Processing --> Error: fail()

  Complete --> [*]
  Error --> [*]
```

**Rules:**

- Use `stateDiagram-v2` (not v1)
- Transition syntax: `From --> To: label`
- Start/end: `[*]`

### Class Diagram Syntax

```mermaid
classDiagram
  class User {
    +String email
    +String password
    +login()
    +logout()
  }

  class Session {
    +String token
    +Date expiry
  }

  User --> Session: creates

  note for User "Users can have multiple sessions"
```

**Rules:**

- No inline comments inside class definitions
- Use `note for ClassName "text"` for annotations
- Visibility: `+` public, `-` private, `#` protected
- Keep field/method names simple (no special chars)

### Common Mistakes to Avoid

❌ **WRONG:**

```mermaid
flowchart LR
  AUTH[backend/controllers/auth.js]  %% inline comment
  DB[MongoDB(User)]
```

✅ **CORRECT:**

```mermaid
flowchart LR
  %% Comments on their own line
  AUTH["backend/controllers/auth.js"]
  DB["MongoDB User Model"]
```

❌ **WRONG:**

```mermaid
sequenceDiagram
  User->>API: POST /login (username, password)  %% login request
```

✅ **CORRECT:**

```mermaid
sequenceDiagram
  %% User authentication flow
  User->>API: POST /login (username, password)
```

❌ **WRONG:**

```mermaid
classDiagram
  class User {
    +Object permissions  %% nested arrays
  }
```

✅ **CORRECT:**

```mermaid
classDiagram
  class User {
    +Object permissions
  }

  note for User "permissions contains nested arrays by resource category"
```

## Example Output

````markdown
# User Authentication

Handles user login, session management, and access control.

## Core Responsibilities

- Validate credentials
- Generate JWT tokens
- Manage sessions

## Authentication Flow

```mermaid
sequenceDiagram
    User->>API: Login
    API->>Database: Verify
    Database-->>API: User
    API-->>User: Token
```
````

## Why it matters

Authentication secures the platform...

## Key Components

**File**: `auth/service.js` - Handles password validation

## Risk Areas

- Password security
- Token expiration

```

## Execution

1. Read all files using `read_file`
2. Create comprehensive Markdown documentation with multiple Mermaid diagrams
3. Save complete Markdown to `{{OUTPUT_FILE}}` using `write_file`
4. Exit

```

```

```
