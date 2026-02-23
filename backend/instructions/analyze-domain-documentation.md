# Domain Documentation Analysis

## Your Task

Analyze the domain files and create comprehensive business documentation. Output a single JSON file to **`{{OUTPUT_FILE}}`** with this structure:

```json
{
  "content": "# Domain Name\n\n[Your complete Markdown documentation here]"
}
```

**All documentation goes in the `content` field as a Markdown string. Use `write_file` once to save this JSON.**

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

## Example Output

````json
{
  "content": "# User Authentication\n\nHandles user login, session management, and access control.\n\n## Core Responsibilities\n\n- Validate credentials\n- Generate JWT tokens\n- Manage sessions\n\n## Authentication Flow\n\n```mermaid\nsequenceDiagram\n    User->>API: Login\n    API->>Database: Verify\n    Database-->>API: User\n    API-->>User: Token\n```\n\n## Why it matters\n\nAuthentication secures the platform...\n\n## Key Components\n\n**File**: `auth/service.js` - Handles password validation\n\n## Risk Areas\n\n- Password security\n- Token expiration\n"
}
````

## Execution

1. Read all files using `read_file`
2. Create Markdown documentation with multiple Mermaid diagrams
3. Put all Markdown in JSON `content` field as a string
4. Save to `{{OUTPUT_FILE}}` using `write_file`
5. Exit

```

```
