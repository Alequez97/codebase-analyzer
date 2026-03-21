---
name: anytype-change-requests-implementator
description: Fetches change requests from Anytype and implements them in the codebase
---

# Anytype Change Requests Implementator

## Hardcoded IDs (for performance)

```javascript
const SPACE_ID =
  "bafyreihhopwyxrkytml3tavrvugfq7qaz3wzeutrsccyaz4ichchx5ewim.2xxz38r44vuo1"; // "Products design/build app"
const CHANGE_REQUESTS_PAGE_ID =
  "bafyreiaflp3wey6zjdr2jk7gjouks6ixiicc5hf4hxncsqhqfsbsokklwq"; // "Change requests"
```

## Quick Access (1 API call)

```javascript
// Direct fetch - no search needed!
mcp_anytype_API -
  get -
  object({
    space_id:
      "bafyreihhopwyxrkytml3tavrvugfq7qaz3wzeutrsccyaz4ichchx5ewim.2xxz38r44vuo1",
    object_id: "bafyreiaflp3wey6zjdr2jk7gjouks6ixiicc5hf4hxncsqhqfsbsokklwq",
  });
// Returns: object.markdown contains all change requests
```

## Fallback (if IDs change)

Only use if the direct fetch fails:

1. **Get Space ID**: `mcp_anytype_API-list-spaces()` → find "Products design/build app"
2. **Search for Page**: `mcp_anytype_API-search-space({ space_id, body: { query: "Change requests" }})`
3. **Get Object**: `mcp_anytype_API-get-object({ space_id, object_id })`

## Workflow

1. **Fetch change requests** from Anytype (1 API call with hardcoded IDs)
2. **Parse markdown** to extract individual bullet points
3. **Analyze codebase** to understand what needs changing
4. **Implement changes** following project conventions (see AGENTS.md)
5. **Update Anytype** to mark requests as completed
