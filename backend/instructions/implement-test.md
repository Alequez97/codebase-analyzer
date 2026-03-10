# Apply Missing Test - Instruction for AI Agent

## CRITICAL INSTRUCTIONS

**DO NOT ASK QUESTIONS. DO NOT WAIT FOR INPUT. COMPLETE THE TASK AND EXIT.**

Your job is to generate a complete, working test file, write it, **run it to verify it passes**, and fix any failures before finishing.

## Available Tools

- **`read_file`**: Read file contents (examine source files and example tests)
- **`list_directory`**: List directory contents (find test files, configs)
- **`search_files`**: Find files by pattern across the project
- **`write_file`**: Write the generated test file (REQUIRED)
- **`execute_command`**: Run the test to verify it passes (REQUIRED after writing)

## Objective

Generate a complete, working test file based on the test recommendation. The test should:

1. **Follow project testing conventions** - Use the same testing framework and patterns as existing tests
2. **Be comprehensive** - Cover all scenarios listed in the test recommendation
3. **Be runnable and passing** - Include all necessary imports, setup, and teardown; confirmed by running `execute_command`
4. **Follow best practices** - Use proper assertions, mocking, and test structure

## Target Information

- **Codebase Path**: `{{CODEBASE_PATH}}`
- **Domain ID**: `{{DOMAIN_ID}}`
- **Test ID**: `{{TEST_ID}}`
- **Test File Path**: `{{TEST_FILE}}`
- **Test Type**: `{{TEST_TYPE}}`
- **Test Description**: `{{TEST_DESCRIPTION}}`
- **Source File**: `{{SOURCE_FILE}}`
  {{#if IS_E2E}}
- **App Base URL**: `{{E2E_BASE_URL}}` — use this as `baseURL` in the Playwright config and in all `page.goto()` calls
  {{/if}}
  {{#if IS_E2E_WITH_AUTH}}
- **Auth credentials**: username `{{E2E_AUTH_USERNAME}}` / password `{{E2E_AUTH_PASSWORD}}` — use these to log in before running tests that require authentication
  {{/if}}
- **Scenario Titles**:
  {{#each TEST_SCENARIOS}}
  - {{this}}
    {{/each}}

- **Detailed Test Cases (authoritative)**:

```json
{{TEST_SCENARIOS_JSON}}
```

---

{{#if IS_UNIT}}

## Unit Test Workflow

### Step 1: Read the Source File

Use `read_file` to read `{{SOURCE_FILE}}` and understand:

- What functions/classes it exports
- What logic needs to be tested
- What external dependencies it uses (database, HTTP, filesystem, etc.)
- What error cases exist

### Step 2: Find Existing Unit Tests

Use `search_files` or `list_directory` to find co-located test files near `{{SOURCE_FILE}}`:

- Look for `*.test.js`, `*.test.ts` next to the source file
- Also check parent directories for shared test utilities

Read 1-2 example test files to capture the testing framework (Jest, Vitest, etc.), import style, mocking patterns, and assertion style.

Also check `package.json` to confirm the test runner and available packages.

### Step 3: Install Missing Dependencies (if needed)

If a required package is absent from `package.json`:

```
npm install <package> --save-dev
```

### Step 4: Write the Unit Test File

Create a test that:

- Imports only the specific functions being tested from `{{SOURCE_FILE}}`
- Mocks **all** external dependencies (database, HTTP clients, filesystem) — never hit real external services
- Covers **every scenario** in `TEST_SCENARIOS_JSON` with a dedicated `test()` block
- Uses `beforeEach` to reset mocks between tests
- Follows the AAA pattern strictly

```javascript
import { describe, test, expect, beforeEach, vi } from "vitest"; // or jest
import { functionToTest } from "{{SOURCE_FILE}}";

vi.mock("../db", () => ({ query: vi.fn() }));

describe("functionToTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns expected value for valid input", () => {
    // Arrange
    const input = "valid";

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe("expected");
  });

  test("throws when given null input", () => {
    // Arrange
    const invalid = null;

    // Act & Assert
    expect(() => functionToTest(invalid)).toThrow("Expected error message");
  });
});
```

### Step 5: Write the File

Use `write_file` to save the test to **`{{TEST_FILE}}`**. This step is **mandatory**.

### Step 6: Run and Verify

```
npx jest {{TEST_FILE}} --no-coverage
# or
npx vitest run {{TEST_FILE}}
```

### Step 7: Fix Failures and Re-run (up to 3 iterations)

1. Read the error carefully to identify root cause
2. Fix with `write_file` (overwrite `{{TEST_FILE}}`)
3. Re-run with `execute_command`

Common failure causes: wrong import path, missing mock, wrong assertion value, wrong framework import.
{{/if}}

{{#if IS_INTEGRATION}}

## Integration Test Workflow

Integration tests use the **real application** (real routes, real middleware, real database). Only mock genuine external I/O that cannot run locally (third-party HTTP APIs, cloud storage, email/SMS).

### Step 1: Read the Source File

Use `read_file` to read `{{SOURCE_FILE}}` and understand:

- What API routes or services it exposes
- What database models and collections it uses
- What middleware (auth, validation) is involved
- What external service calls are made (and need mocking)

### Step 2: Find Existing Integration Tests

Use `search_files` or `list_directory` to find tests under `backend/tests/integration/` (or `backend/tests/`).

Read 1-2 example integration tests to understand how the app is imported, how the database is set up, how auth tokens are generated, and how `supertest` is used.

Also check `package.json` for available packages (`supertest`, `mongodb-memory-server`, `nock`, etc.).

### Step 3: Install Missing Dependencies (if needed)

```
npm install supertest --save-dev
npm install mongodb-memory-server --save-dev  # if using MongoDB
npm install nock --save-dev                   # if mocking outbound HTTP
```

If `package.json` has no `test` script: `npm pkg set scripts.test="jest"`

### Step 4: Write the Integration Test File

Rules:

1. **Use the real exported app** — import `app` (or `server`) and use `supertest` for HTTP assertions
2. **Use a real in-memory database** — spin up `mongodb-memory-server` (MongoDB), SQLite, or equivalent
3. **Use real middleware** — generate valid tokens/sessions rather than mocking auth middleware
4. **Only mock external I/O** — use `nock` for outbound third-party HTTP, mock cloud storage and email services
5. **Clean up state** between tests — drop/truncate data in `beforeEach` or `afterEach`
6. **Verify side effects** — check database state and emitted events, not just response body

```javascript
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../app.js";
import MyModel from "../../models/my-model.js";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/endpoint", () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  test("valid payload returns 201 and persists data", async () => {
    // Arrange
    const payload = { name: "Test", value: 42 };

    // Act
    const response = await request(app)
      .post("/api/endpoint")
      .send(payload)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({ name: "Test", value: 42 });
    const saved = await MyModel.findById(response.body._id);
    expect(saved).not.toBeNull();
    expect(saved.value).toBe(42);
  });

  test("missing required fields return 400 with error details", async () => {
    // Arrange
    const invalidPayload = {};

    // Act
    const response = await request(app)
      .post("/api/endpoint")
      .send(invalidPayload)
      .expect(400);

    // Assert
    expect(response.body).toHaveProperty("error");
  });
});
```

### Step 5: Write the File

Use `write_file` to save the test to **`{{TEST_FILE}}`**. This step is **mandatory**.

### Step 6: Run and Verify

```
npx jest {{TEST_FILE}} --no-coverage
# or
npx vitest run {{TEST_FILE}}
```

### Step 7: Fix Failures and Re-run (up to 3 iterations)

1. Read the error output to identify the root cause
2. Fix the file with `write_file`
3. Re-run with `execute_command`

Common failure causes: app not exported correctly, auth token invalid, database not connected before assertions, missing `nock` intercept.
{{/if}}

{{#if IS_E2E}}

## E2E Test Workflow (Playwright)

E2E tests drive a **real browser** against the running application. They test complete user journeys through the UI — clicks, form inputs, navigation, visual assertions. Use `@playwright/test` — never Jest/Vitest mocks.

{{#if DOMAIN_FILES}}

### Step 0: Read Domain Source Files

The following files belong to this domain. **Read them before writing a single locator.** Your goal is to discover real element roles, aria-labels, `data-testid` attributes, button names, and form field labels that exist in the actual UI:

{{#each DOMAIN_FILES}}

- `{{this}}`
  {{/each}}

For each file that looks like a UI component (`.jsx`, `.tsx`, `.vue`, `.svelte`), use `read_file` to inspect it. Note every `aria-label`, `role`, `data-testid`, button text, and form label you find — these are the locators you must use in the test.

If you cannot find a reliable selector for an element needed by a scenario, **add a `data-testid` attribute** to the source component using `write_file` or `replace_lines`, then use `getByTestId()` in the test. You have write access to all project files.

{{/if}}

### Step 1: Discover the Playwright Setup

Use `list_directory` and `search_files` to find:

- `playwright.config.js` or `playwright.config.ts` in the project root or `frontend/`
- Existing e2e tests under `frontend/tests/e2e/` or `e2e/`

Read the Playwright config to find: `baseURL`, configured browsers, any global setup or `storageState` for authentication.

### Step 2: Study Existing E2E Tests

Read 1-2 existing e2e test files to understand:

- Import style: `import { test, expect } from "@playwright/test"`
- How navigation works (`page.goto`, `page.click`)
- How elements are located (prefer `getByRole`, `getByLabel`, `getByTestId` over CSS selectors)
- Whether `test.beforeEach` is used for shared setup (e.g. login)

Also check `package.json` to confirm `@playwright/test` is installed.

### Step 3: Install Missing Dependencies (if needed)

If `@playwright/test` is absent:

```
npm install @playwright/test --save-dev
npx playwright install chromium
```

If no `playwright.config.js` exists yet, create a minimal one at the project root:

```javascript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./frontend/tests/e2e",
  use: {
    baseURL: "{{E2E_BASE_URL}}",
    headless: true,
  },
});
```

### Step 4: Write the E2E Test File

Rules:

1. **Import from `@playwright/test`** — use `test` and `expect` from Playwright only
2. **Semantic locators first** — prefer `getByRole`, `getByLabel`, `getByText`, `getByTestId` over `locator("css")` or XPath
3. **No manual waits** — rely on Playwright's built-in auto-waiting; never use `waitForTimeout`
4. **Assert on real UI state** — `toBeVisible()`, `toHaveText()`, `toHaveURL()`, `toContainText()`
5. **Cover every scenario** from `TEST_SCENARIOS_JSON` — map each `step` input to a Playwright action, each `expectedOutput` to an `expect()` assertion
6. **Group with `test.describe`** and share setup in `test.beforeEach`
7. **NEVER use `page.setContent()`** — always navigate to the real app with `page.goto("/path")`. Tests that inject fake HTML are invalid.
8. **Use only locators found in the actual source files** you read in Step 0 — never guess element names

Map scenario checks to Playwright actions:

| `field: "step"` value   | Playwright action                                             |
| ----------------------- | ------------------------------------------------------------- |
| `"navigate to X"`       | `await page.goto("/path")`                                    |
| `"click X button"`      | `await page.getByRole("button", { name: "X" }).click()`       |
| `"fill field X with Y"` | `await page.getByLabel("X").fill("Y")`                        |
| `"select option X"`     | `await page.getByRole("combobox").selectOption("X")`          |
| `"submit form"`         | `await page.getByRole("button", { name: /submit/i }).click()` |

Map `expectedOutput` to assertions:

| expected         | assertion                                                     |
| ---------------- | ------------------------------------------------------------- |
| element visible  | `await expect(page.getByText("...")).toBeVisible()`           |
| URL changed      | `await expect(page).toHaveURL(/pattern/)`                     |
| success toast    | `await expect(page.getByRole("status")).toContainText("...")` |
| validation error | `await expect(page.getByRole("alert")).toContainText("...")`  |

```javascript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("user can complete the main workflow", async ({ page }) => {
    // Arrange
    await page.goto("/some-feature");

    // Act
    await page.getByRole("button", { name: "Open Form" }).click();
    await page.getByLabel("Engine Hours").fill("151.0");
    await page.getByRole("button", { name: "Save" }).click();

    // Assert
    await expect(page.getByRole("status")).toContainText(
      "Updated successfully",
    );
    await expect(page.getByTestId("engine-hours-display")).toHaveText("151.0");
  });

  test("shows validation error for invalid input", async ({ page }) => {
    // Arrange
    await page.goto("/some-feature");
    await page.getByRole("button", { name: "Open Form" }).click();

    // Act
    await page.getByLabel("Engine Hours").fill("-1");
    await page.getByRole("button", { name: "Save" }).click();

    // Assert
    await expect(page.getByRole("alert")).toContainText("must be positive");
  });
});
```

### Step 5: Write the File

Use `write_file` to save the test to **`{{TEST_FILE}}`**. This step is **mandatory**.

### Step 6: Run and Verify

```
npx playwright test {{TEST_FILE}}
```

> **Note**: The dev server must be running (`npm run dev`). If the Playwright config has a `webServer` option, it will start automatically.

### Step 7: Fix Failures and Re-run (up to 3 iterations)

1. Read the Playwright error — it will name the exact locator that failed or show the timeout
2. Fix with `write_file`
3. Re-run with `execute_command`

Common failure causes: element not found (switch to `getByRole`/`getByLabel`), wrong `baseURL` (re-read Playwright config), test depends on app state (add `beforeEach` setup), dev server not running.
{{/if}}

---

## Critical Requirements

1. Follow the AAA pattern with `// Arrange`, `// Act`, `// Assert` comments in every test
2. Cover **all scenarios** in `TEST_SCENARIOS_JSON` — no scenario may be skipped
3. Match the testing framework and patterns found in existing test files
4. Include all necessary imports and setup
5. **Write the file using `write_file`** — no prose descriptions, no markdown code blocks
6. **Run the test with `execute_command`** after writing — task is only complete when tests pass
7. Fix and re-run if tests fail (up to 3 iterations)

## Final Step

1. Write the test file to **`{{TEST_FILE}}`** using `write_file`
2. Run it with `execute_command`
3. If it passes — write `# Done` to `{{PROGRESS_FILE}}`, then stop
4. If it fails — read the error, fix the file, re-run. Repeat up to 3 times.
