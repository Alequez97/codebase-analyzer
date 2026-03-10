# Chat-Based Test Edit — Visual Feedback Plan

## What is implemented

Clicking a **Test ID** in the missing-tests table:

1. Opens the floating chat panel.
2. Auto-selects the **Testing** section.
3. Pre-fills the input with `Update <TEST-ID>`.

When the AI finishes its edit, the new content is applied **immediately** to the
frontend — no accept/dismiss step. If the user doesn't like the change they can
revert via `git`.

---

## Visual feedback (implemented)

When `REFACTORING_AND_TESTING_UPDATED` arrives with `isEdit: true`:

1. `useSocketStore` computes which tests changed by diffing `oldMissingTests`
   vs `newMissingTests` → `Map<testId, "added" | "modified" | "removed">`.
2. New content is written directly to `useDomainRefactoringAndTestingStore`
   **and** `useRefactoringAndTestingEditorStore` (both stores stay in sync).
3. Changed test IDs are stored in `recentlyChangedTests` on the domain store.
4. After **4 seconds** the map is cleared automatically (timer in socket handler).

### Per-row visuals while `recentlyChangedTests` is populated

| Change type | Row background                | Hover bg     | Outline      | ID badge                  |
| ----------- | ----------------------------- | ------------ | ------------ | ------------------------- |
| `added`     | `green.100`                   | `green.200`  | `green.400`  | **NEW** (green solid)     |
| `modified`  | `yellow.100`                  | `yellow.200` | `yellow.400` | **EDITED** (yellow solid) |
| `removed`   | row disappears (data is gone) | —            | —            | —                         |

---

## What's left to think about

### 1. Transition / animation

The 4-second timeout is abrupt. Options:

- **CSS `transition: background 0.3s`** — already applied on the `<Table.Row>` via
  `transition="background 0.3s, outline-color 0.3s"`. The highlight fades as soon
  as the map is cleared.
- **Gradual fade** — instead of clearing after 4 s, reduce opacity step by step.
  Achievable in the component with a local `useEffect` countdown that dims the badge
  before the store clears. Adds complexity; probably not worth it yet.

### 2. Scroll-to-changed test

After the update lands, if the changed test is off-screen the user won't notice.
Simple fix:

```jsx
useEffect(() => {
  if (recentChangeType) {
    document.getElementById(test.id)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }
}, [recentChangeType]);
```

Could be added to `TestTableRow` — fires once per changed row, so if multiple rows
changed they'll all try to scroll. Limit to the _first_ changed row only (check
the index in `MissingTestsSection` and pass a `isFirstChanged` prop).

### 3. Chat message after update

The AI sends text back (`CHAT_MESSAGE`) before the data update arrives. The message
could acknowledge which tests were changed, e.g.:

> "Done! I updated TEST-012: changed priority to P0 and added a null-input scenario."

That's driven by the AI prompt / system context, not frontend changes.

### 4. Multiple chat rounds

If the user keeps chatting, each AI turn fires a new
`REFACTORING_AND_TESTING_UPDATED`, which resets the highlight timer. This is
correct — highlights always reflect the _latest_ state.

### 5. Removed tests

When a test disappears from `newMissingTests` the row is gone — no REMOVED badge is
shown. Fine in practice. If we ever want a "ghost" removed row, we'd need to keep
deleted entries in a separate `removedTests` list and render them as
dimmed/struck-through at the bottom until the user acknowledges.
