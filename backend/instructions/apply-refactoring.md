# Apply Refactoring - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your job is to apply the refactoring recommendation by:

1. Reading the target code
2. Extracting the specified logic into new files/functions
3. Updating the original file to use the extracted code
4. Verifying the changes work (run tests if they exist)

## Available Tools

You have access to these tools:

- **`read_file`**: Read file contents — every line is prefixed with its 1-based line number (e.g. `  42: code here`). Use these numbers when calling `replace_lines` or `insert_lines`.
- **`list_directory`**: List directory contents
- **`write_file`**: Write a brand new file (e.g., the new service file)
- **`replace_lines`**: Replace a range of lines in an **existing** file by line numbers — use this for all modifications to existing source files. Call `read_file` first to identify the exact line range, then call `replace_lines` with `start_line`, `end_line`, and `new_content`.
- **`insert_lines`**: Insert new lines at a specific position without replacing existing content. Use `position: 'before'|'after'|'start'|'end'` to specify where to insert. Perfect for adding new functions, imports, or code blocks.
- **`rename_file`**: Rename or move a file within the project. Use this to restructure code organization or fix file naming.
- **`execute_command`**: Run tests to validate your changes

**Rules**:

- Use `write_file` only for creating new files.
- Use `insert_lines` when adding new functions, imports, or code blocks without modifying existing lines.
- Use `replace_lines` for modifying existing code.
- Use `rename_file` when refactoring involves moving code to better-named or better-located files.

## Objective

Apply the refactoring by:

1. **Extract business logic** from controllers/routes into services/utilities
2. **Maintain existing behavior** - no functional changes, only structural
3. **Preserve existing tests** - update imports if needed, but tests should still pass
4. **Follow project conventions** - match coding style, file structure, naming patterns

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Refactoring ID**: `{{REFACTORING_ID}}`
- **Category**: `{{CATEGORY}}`
- **Priority**: `{{PRIORITY}}`

### Refactoring Details

**Title**: {{TITLE}}

**Target File**: `{{TARGET_FILE}}`
**Target Function**: `{{TARGET_FUNCTION}}`
**Lines**: {{START_LINE}}-{{END_LINE}}

**Issue**: {{ISSUE}}

**Extraction Plan**:

- **New Service File**: `{{NEW_SERVICE_FILE}}`
- **Extracted Functions**:
  {{#each EXTRACTED_FUNCTIONS}}
  - `{{this.name}}({{this.params}})` → {{this.returns}} - Purpose: {{this.purpose}}
    {{/each}}

**Benefits**:
{{#each BENEFITS}}

- {{this}}
  {{/each}}

**Unblocks Tests**: {{#each UNBLOCKS}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

## Task Workflow

**Follow these steps EXACTLY**:

### Step 1: Read the Target File

Use `read_file` to read `{{TARGET_FILE}}` to understand:

- The current implementation of `{{TARGET_FUNCTION}}`
- What logic needs to be extracted (lines {{START_LINE}}-{{END_LINE}})
- What dependencies the extracted code needs
- What parameters and return values are required

### Step 2: Study Project Structure and Conventions

Use `list_directory` to explore:

- `backend/services/` or similar directories to understand service file patterns
- `backend/controllers/` to see how controllers import and use services
- Existing test files to understand how they import modules

Use `read_file` to examine 1-2 similar service files to understand:

- Module export patterns (CommonJS vs ES modules)
- Function naming conventions
- Error handling patterns
- Documentation standards (JSDoc, comments)

### Step 3: Create the New Service File

Create `{{NEW_SERVICE_FILE}}` with:

1. **Extracted business logic** from the target function
2. **Pure functions** - no HTTP request/response dependencies
3. **Proper error handling** - throw errors instead of sending HTTP responses
4. **Clear function signatures** - well-named parameters and return values
5. **Documentation** - JSDoc comments explaining purpose and usage

**Important**:

- Extract ONLY the business logic, not HTTP/DB connection handling
- Make functions testable (no hard dependencies on DB connections, use parameters)
- Preserve all existing logic exactly - no functional changes
- Add proper imports for any dependencies the extracted code needs

### Step 4: Update the Target File

Use `insert_lines` and `replace_lines` to modify `{{TARGET_FILE}}` (do **not** rewrite the whole file with `write_file`):

1. **Add the import** — call `read_file` on `{{TARGET_FILE}}`, find the line number of the last existing import, then call `insert_lines` with `position: 'after'` and that line number to add the new import.
2. **Replace extracted logic** — call `read_file` again (line numbers may shift after step 1), identify the exact start and end lines of the function body that needs to change, then call `replace_lines` with the slimmed-down version that delegates to the new service.

**Important**:

- Always call `read_file` immediately before each `insert_lines` or `replace_lines` call — line numbers shift after every edit
- Do not change the function signature of `{{TARGET_FUNCTION}}`
- Do not change how errors are handled at the HTTP layer
- Ensure the refactored code is shorter and more readable
- Remove now-unused local variables or helper functions

### Step 5: Check for Existing Tests

Use `list_directory` and `read_file` to find tests for:

- `{{TARGET_FILE}}` (look for co-located `*.test.js` files)
- `{{TARGET_FUNCTION}}` (search integration test directories)

If tests exist:

1. **Run them** with `execute_command` (e.g., `npm test {{TARGET_FILE}}`)
2. **If they fail**:
   - Check if they're importing the target file incorrectly
   - Verify you maintained the same external behavior
   - Fix issues and re-run until tests pass

### Step 6: Verify the Changes

After completing the refactoring:

1. **Run all tests** (or domain-specific tests) to verify nothing broke
   - Use `execute_command` with: `npm test` or `npm test -- {{domain_pattern}}`
2. **If tests fail**:
   - Read the error output to identify the issue
   - Use `read_file` to inspect the affected file, identify the broken line range, then `replace_lines` to fix it
   - Re-run tests
   - Repeat until all tests pass

### Step 7: Create Basic Service Tests (Optional)

If the new service is complex, consider creating a basic test file:

- Use `write_file` to create `{{NEW_SERVICE_FILE}}.test.js` (adjust extension as needed)
- Write 2-3 simple test cases covering main scenarios
- Run them to ensure the extracted logic works in isolation
- This is especially important if no integration tests existed

## Refactoring Categories

### extract-business-logic

**Goal**: Move business logic from controllers/routes into services/utilities

**Pattern**:

```javascript
// Before (in controller)
async function updateStatus(req, res) {
  const existing = await Model.findById(req.params.id);
  // 50 lines of merge logic here...
  await existing.save();
  res.json(existing);
}

// After
// controller file
const statusService = require("./services/status-service");

async function updateStatus(req, res) {
  const existing = await Model.findById(req.params.id);
  const updated = statusService.mergeStatus(existing, req.body);
  await updated.save();
  res.json(updated);
}

// services/status-service.js
function mergeStatus(existing, updates) {
  // 50 lines of pure merge logic here...
  return merged;
}
```

### reduce-complexity

**Goal**: Break down large functions into smaller, testable pieces

**Pattern**:

- Extract helper functions for each major step
- Move complex conditionals into well-named functions
- Separate validation, transformation, and execution logic

### improve-modularity

**Goal**: Separate concerns to enable isolated testing

**Pattern**:

- Split mixed responsibilities into focused modules
- Create clear interfaces between layers
- Reduce coupling between components

### enhance-testability

**Goal**: Remove hard dependencies that prevent testing

**Pattern**:

- Pass database connections as parameters instead of importing globally
- Use dependency injection for external services
- Make time/date functions mockable (accept `now` parameter)

## Error Handling Rules

When extracting code:

**In the new service**:

- Throw errors for invalid inputs or business rule violations
- Use descriptive error messages
- Don't catch and suppress errors unless recovery is possible

**In the original controller/route**:

- Keep existing try-catch blocks
- Maintain same HTTP status codes for errors
- Preserve error response format

**Example**:

```javascript
// Service (throws)
function calculatePrice(items) {
  if (!items || items.length === 0) {
    throw new Error("Items array cannot be empty");
  }
  // calculation logic...
}

// Controller (catches and sends HTTP response)
async function checkout(req, res) {
  try {
    const total = calculatePrice(req.body.items);
    res.json({ total });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

## Common Pitfalls to Avoid

1. **Don't change behavior** - Refactoring means same functionality, better structure
2. **Don't skip tests** - Always verify existing tests still pass
3. **Don't over-abstract** - Extract only what was specified in the plan
4. **Don't break imports** - Update all import statements correctly
5. **Don't mix concerns** - Keep HTTP logic in controllers, business logic in services
6. **Don't remove error handling** - Preserve all existing error cases
7. **Don't forget documentation** - Add JSDoc to new service functions

## Validation Checklist

Before marking the task complete, ensure:

- [ ] New service file created at `{{NEW_SERVICE_FILE}}`
- [ ] All specified functions extracted and working
- [ ] Original file updated to use the new service
- [ ] Existing behavior preserved (same inputs/outputs)
- [ ] All existing tests pass (if any exist)
- [ ] Code follows project conventions
- [ ] No HTTP dependencies in service code
- [ ] Clear function names and documentation
- [ ] Proper error handling in both service and controller

## Completion

When all steps are complete and tests pass, write `# Done` to `{{PROGRESS_FILE}}`, then stop — the task orchestrator will detect completion automatically.

**Remember**: DO NOT ASK QUESTIONS. Complete the work autonomously based on the refactoring specification and project conventions you discover by reading the code.
