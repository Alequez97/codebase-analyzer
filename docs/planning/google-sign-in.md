# Google Sign-In — Market Research

## Goals

- Users can run analysis anonymously (no account required)
- After completing a report, users can sign in with Google to save it
- The completed report is claimed and attached to their account retroactively
- On future visits, signed-in users see all their past reports across devices

---

## Key Concept: Session Ownership Transfer

An anonymous `sessionId` (UUID) is generated client-side when analysis starts. When the user later signs in with Google, the backend links that `sessionId` to their `userId` — no data is lost.

```
Anonymous user                     Google Sign-In user
──────────────────                 ──────────────────────────────────
sessionId = UUID (client-side) →  POST /api/market-research/:sessionId/claim
Analysis runs freely               { Authorization: Bearer <jwt> }
                                   ↓
                               Verify JWT → extract userId
                               session.ownerId = userId
                               Report now owned by this user
```

---

## Libraries

### Frontend (`frontend/package.json`)

- `@react-oauth/google` — Google Identity Services (renders the official Google button)

### Backend (`backend/package.json`)

- `google-auth-library` — verify Google ID tokens server-side
- `jsonwebtoken` — issue JWTs set as HttpOnly cookies
- `cookie-parser` — parse cookies from incoming requests

---

## Backend

### New env vars (`backend/.env`)

```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
JWT_SECRET=a-long-random-string-you-generate
```

### New user persistence (`backend/persistence/users.js`)

File-based store (same pattern as market-research):

Storage root: `.code-analysis/users/<userId>.json`

```json
{
  "userId": "...",
  "email": "...",
  "name": "...",
  "picture": "...",
  "createdAt": "...",
  "lastSeenAt": "..."
}
```

Functions: `upsertUser(profile)`, `getUser(userId)`

### New auth route (`backend/routes/auth.js`)

**`POST /api/auth/google`**

- Accepts `{ credential }` (Google ID token from frontend)
- Verifies with `google-auth-library` using `GOOGLE_CLIENT_ID`
- Upserts user record
- Sets `jwt` as an **HttpOnly, Secure, SameSite=Strict cookie**
- Returns `{ user: { userId, name, email, picture } }` (no JWT in body)

**`GET /api/auth/me`**

- Reads JWT from cookie (no Authorization header needed)
- Returns current user — used to re-hydrate auth state on app load / tab reopen

**`POST /api/auth/logout`**

- Clears the JWT cookie
- Returns `{ success: true }`

### Auth middleware (`backend/middleware/auth.js`)

JWT is read from the HttpOnly cookie (set by `cookie-parser`):

```js
// Soft auth — attaches req.userId if cookie present, never rejects
export function softAuth(req, res, next) {
  const token = req.cookies?.jwt;
  if (token) {
    try {
      req.userId = jwt.verify(token, JWT_SECRET).sub;
    } catch {}
  }
  next();
}

// Hard auth — rejects 401 if no valid cookie
export function requireAuth(req, res, next) {
  const token = req.cookies?.jwt;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

Cookie set by auth routes:

```js
res.cookie("jwt", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### Session claim endpoint (`backend/routes/market-research.js`)

**`POST /api/market-research/:sessionId/claim`** — new, requires `requireAuth`

- Sets `session.ownerId = req.userId` in session JSON
- Returns `{ success: true }`

**`GET /api/market-research`** — modify existing history endpoint

- Apply `softAuth` middleware
- If `req.userId` present → return all sessions where `ownerId === userId`
- If anonymous → still supports `?sessionId=` query for current session lookup

### Session JSON gains `ownerId`

```json
{ "sessionId": "...", "ownerId": null, "idea": "...", "createdAt": "..." }
```

`ownerId` is `null` for anonymous sessions, set to `userId` after claim.

---

## Frontend

### 1. `LoginPage` — new step in `MarketResearchPage`

A dedicated full page shown whenever the user initiates sign-in. Keeps all auth UI in one place and makes it easy to add new providers.

```
STEP_VIEWS = {
  landing:  LandingPage,
  input:    IdeaInputPage,
  analysis: AnalysisPage,
  summary:  AnalysisSummaryPage,
  profile:  ProfilePage,
  login:    LoginPage,      ← new
}
```

`LoginPage` contains:

- "Sign in with Google" — official `<GoogleLogin>` button from `@react-oauth/google`
- Branding, short value prop copy
- Back button / close → returns to previous step (stored in `useAuthStore` as `returnStep`)

> The dedicated page makes it easy to add more providers (Apple, GitHub, etc.) in the future without touching other components.

Navigation to `LoginPage`:

- Any "Sign in" button sets `returnStep = currentStep` then `setStep('login')`
- On successful sign-in → claim session if `sessionId` exists → navigate to `returnStep`

### 2. `GoogleOAuthProvider` in app root (`frontend/src/main.jsx`)

```jsx
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

New env var: `VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id`

### 3. Expand `useAuthStore` (`frontend/src/store/useAuthStore.js`)

```js
{
  user: null,         // { userId, name, email, picture } — no JWT stored here
  returnStep: null,   // step to return to after login

  signInWithGoogle: async (credential) => {
    // POST /api/auth/google { credential }
    // Backend sets HttpOnly cookie — frontend just stores user object
  },
  signOut: async () => {
    // POST /api/auth/logout — clears cookie server-side
    // Clear user from state
  },
  claimSession: async (sessionId) => {
    // POST /api/market-research/:sessionId/claim
    // Cookie is sent automatically — no manual auth header needed
  },
  rehydrate: async () => {
    // GET /api/auth/me on app load
    // Cookie sent automatically — returns user if still valid
  },
}
```

No JWT in frontend state. Cookie is sent automatically by the browser on every same-domain request.

### 4. Sign-in trigger points (all navigate to `LoginPage`)

**a) `SignInNotice.jsx`** — shown in `IdeaInputPage`

- "Sign in to save your results" → `setReturnStep('input'); setStep('login')`

**b) `AnalysisSummaryPage`** — post-analysis save prompt

- "Sign in to save this report to your account" → `setReturnStep('summary'); setStep('login')`
- After successful login + claim → toast "Report saved to your account ✓"

**c) `Navbar.jsx`**

- "Sign in" button → `setReturnStep(currentStep); setStep('login')`

### 5. `Navbar.jsx`

- `user === null` → show subtle "Sign in" button
- `user` set → show avatar + name, dropdown with "My Reports" and "Sign out"

### 6. `AnalysisHistory.jsx`

- Signed in → `GET /api/market-research` returns all sessions owned by this user (cross-device)
- Anonymous → show only current session

---

## Full User Journey

```
1.  Land on page          → no account required, nothing blocked
2.  Enter idea            → click Analyze → sessionId = UUID (anonymous)
3.  Analysis runs         → competitors found, report assembled
4.  Summary page shown    → "Sign in to save this report to your account"
5.  User clicks "Sign in" → navigates to LoginPage (returnStep = 'summary')
6.  User clicks Google    → provider popup opens
7.  User approves         → Google returns credential
8.  Frontend              → POST /api/auth/google { credential }
9.  Backend               → verifies token, sets HttpOnly cookie, returns user
10. Frontend              → POST /api/market-research/:sessionId/claim (cookie auto-sent)
11. Navigate back         → to returnStep ('summary')
12. Toast                 → "Report saved to your account ✓"
13. Navbar updates        → shows user avatar and name
14. Future visits         → GET /api/auth/me (cookie auto-sent) re-hydrates user
15. History page          → GET /api/market-research returns all past reports
```

---

## Implementation Order

| #   | What                                                                                            | Where                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Create Google OAuth client in GCP Console, add env vars                                         | Config                                                        |
| 2   | `backend/persistence/users.js`                                                                  | New file                                                      |
| 3   | `backend/middleware/auth.js` (`softAuth` + `requireAuth`)                                       | New file                                                      |
| 4   | `backend/routes/auth.js` (`POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout`) | New file                                                      |
| 5   | Add `cookie-parser` middleware to `backend/index.js`                                            | `backend/index.js`                                            |
| 6   | Add `ownerId` to session JSON, `POST /:sessionId/claim` endpoint                                | `persistence/market-research.js`, `routes/market-research.js` |
| 7   | Wire `softAuth` on `GET /api/market-research` history endpoint                                  | `routes/market-research.js`                                   |
| 8   | Register auth routes in `backend/routes/index.js`                                               | `routes/index.js`                                             |
| 9   | Expand `useAuthStore` with `signInWithGoogle`, `claimSession`, `rehydrate`, `returnStep`        | `frontend/src/store/useAuthStore.js`                          |
| 10  | Add `GoogleOAuthProvider` + `VITE_GOOGLE_CLIENT_ID`                                             | `frontend/src/main.jsx`                                       |
| 11  | Create `LoginPage.jsx` with Google button                                                       | `frontend/src/components/market-research/LoginPage.jsx`       |
| 12  | Register `login` step in `MarketResearchPage` step router                                       | `MarketResearchPage.jsx`                                      |
| 13  | Wire "Sign in" → `setStep('login')` in `SignInNotice.jsx`, `Navbar.jsx`, `AnalysisSummaryPage`  | Multiple files                                                |
| 14  | Update `Navbar.jsx` — avatar vs sign-in button + My Reports + Sign out dropdown                 | `Navbar.jsx`                                                  |
