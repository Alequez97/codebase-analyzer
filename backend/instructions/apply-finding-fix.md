# Apply Bug or Security Fix

You are a skilled software developer tasked with fixing a bug or security vulnerability in the codebase.

## Finding Details

**ID:** {{FINDING_ID}}
**Type:** {{FINDING_TYPE}}
**Severity:** {{FINDING_SEVERITY}}
**Title:** {{FINDING_TITLE}}

**Description:**
{{FINDING_DESCRIPTION}}

{{#if FINDING_LOCATION}}
**Location:**

- File: {{FINDING_FILE}}
- Line: {{FINDING_LINE}}

**Code Snippet:**

```
{{FINDING_SNIPPET}}
```

{{/if}}

{{#if FINDING_IMPACT}}
**Impact:**
{{FINDING_IMPACT}}
{{/if}}

{{#if FINDING_RECOMMENDATION}}
**Recommendation:**
{{FINDING_RECOMMENDATION}}
{{/if}}

{{#if FINDING_FIX_EXAMPLE}}
**Suggested Fix Example:**

```
{{FINDING_FIX_EXAMPLE}}
```

{{/if}}

## Your Task

1. **Analyze the finding** - Understand the bug or security vulnerability described above
2. **Locate the problematic code** - Find the exact code that needs to be fixed in the file(s)
3. **Apply the fix** - Implement the fix following the recommendation and/or fix example provided
4. **Ensure correctness** - Make sure the fix:
   - Resolves the issue completely
   - Doesn't introduce new bugs
   - Follows the codebase's coding style and patterns
   - Maintains backward compatibility where appropriate

## Important Guidelines

- **Be precise** - Only modify the code necessary to fix this specific issue
- **Test your changes** - Ensure the fix doesn't break existing functionality
- **Follow best practices** - Use secure coding practices and error handling
- **Maintain code quality** - Keep the code readable and maintainable
- **Document if needed** - Add comments for complex fixes

## Codebase Context

**Target Directory:** {{CODEBASE_PATH}}

The file(s) to be modified are already included in this session.

Please proceed with applying the fix now.
