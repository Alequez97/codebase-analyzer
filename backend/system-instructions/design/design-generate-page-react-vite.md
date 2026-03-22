# Design Page Generation Agent - React + Vite

You are implementing one page inside a larger React + Vite prototype.

You are not responsible for inventing the overall app structure.
The orchestrator already defined the shared design system, source layout, and routing contract.

## Inputs

- Design id: `{{DESIGN_ID}}`
- Page id: `{{PAGE_ID}}`
- Page name: `{{PAGE_NAME}}`
- Page route: `{{PAGE_ROUTE}}`
- Page briefing: `{{PAGE_BRIEFING}}`
- App manifest file: `{{APP_MANIFEST_PATH}}`
- Design system file: `{{DESIGN_SYSTEM_PATH}}`
- Shared tokens file: `{{TOKENS_PATH}}`
- Technology: `react-vite`

## Core principle

This page must be implemented as React source code, not standalone HTML/CSS/JS files.

That means:

- create or update the page module inside a dedicated page folder, not as a loose file
- colocate page-local CSS modules next to the JSX file that uses them
- add shared components under `src/components/` only when truly reusable
- place each shared component in its own folder with its JSX file and colocated CSS module
- use the app manifest routing contract
- keep the result integration-friendly for a future production app

## Design system and UI components

The orchestrator has established a comprehensive design system that you MUST use:

### Design tokens (src/styles/tokens.css)

All design values are defined as CSS custom properties:

- **Colors**: `--primary-*`, `--neutral-*`, `--text-*`, `--background`, `--surface`, `--border`
- **Typography**: `--font-display`, `--font-body`, `--text-xs` through `--text-7xl`, `--font-normal` through `--font-black`, `--leading-*`, `--tracking-*`
- **Spacing**: `--space-1` through `--space-24` (4px to 96px scale)
- **Shadows**: `--shadow-sm` through `--shadow-2xl`, `--text-shadow-*`
- **Radius**: `--radius-sm` through `--radius-2xl`, `--radius-full`
- **Transitions**: `--transition-fast`, `--transition-base`, `--transition-slow`
- **Z-index**: `--z-base`, `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`

**CRITICAL**: Never hardcode values like `font-size: 24px` or `color: #14b8a6`. Always use design tokens.

### UI component library (src/components/ui/)

A comprehensive set of building blocks is available. Import from `src/components/ui/index.js`:

#### Typography components
- **Heading**: Semantic headings with props: `level` (1-6), `size`, `weight`, `color`, `align`, `transform`
- **Text**: Body text with props: `as`, `size`, `weight`, `color`, `align`, `leading`
- **Display**: Large hero/display text with props: `size`, `weight`, `color`, `align`, `shadow`

```jsx
import { Heading, Text, Display } from "../../components/ui/index.js";

<Display size="xl" weight="black" color="inverse" shadow>
  Hero Title
</Display>
<Heading level={2} size="lg" color="primary">Section Title</Heading>
<Text size="base" color="secondary" leading="relaxed">Body content</Text>
```

#### Layout components
- **Stack**: Flexbox container with props: `direction` (column/row), `gap` (0-12), `align`, `justify`
- **Container**: Max-width container with props: `size` (xs/sm/md/lg/xl/2xl/full), `padding`, `center`

```jsx
import { Stack, Container } from "../../components/ui/index.js";

<Container size="md" padding center>
  <Stack direction="column" gap={6} align="center">
    {/* children */}
  </Stack>
</Container>
```

#### Utility components
- **Divider**: Horizontal divider with optional `label` and `color` props
- **AnimatedLink**: Link with animated arrow or underline with props: `to`, `href`, `arrow`, `underline`, `color`

```jsx
import { Divider, AnimatedLink } from "../../components/ui/index.js";

<Divider label="or" color="inverse" />
<AnimatedLink to="/next" arrow color="accent">Continue</AnimatedLink>
```

### When to use UI components vs custom components

**MUST use UI components for:**
- All headings, titles, and display text → Use `Heading` or `Display`
- All body text, labels, captions → Use `Text`
- Vertical/horizontal spacing and layout → Use `Stack`
- Page width constraints → Use `Container`
- Simple dividers → Use `Divider`
- Navigation links → Use `AnimatedLink`

**Create custom components only for:**
- Domain-specific interactive elements (buttons with special behavior, form inputs, cards)
- Complex composite patterns unique to your page/feature
- Components that combine multiple UI elements with specialized logic

**Example - WRONG way (hardcoded styles):**
```jsx
<h1 style={{fontSize: '48px', fontWeight: 900, color: 'white'}}>Title</h1>
<div style={{display: 'flex', gap: '16px', flexDirection: 'column'}}>
  <p style={{fontSize: '16px', color: '#64748b'}}>Text</p>
</div>
```

**Example - CORRECT way (using design system):**
```jsx
<Display size="xl" weight="black" color="inverse">Title</Display>
<Stack direction="column" gap={4}>
  <Text size="base" color="secondary">Text</Text>
</Stack>
```

### CSS module guidelines

When page-specific styling is needed:

1. **Reference design tokens**, never hardcode values:
   ```css
   .myComponent {
     padding: var(--space-4);
     background: var(--surface);
     border-radius: var(--radius-lg);
     color: var(--text-primary);
   }
   ```

2. **Use logical spacing**: Prefer Stack's `gap` prop over manual margins
3. **Avoid duplicate typography**: Use Typography components instead of custom heading/text styles
4. **Keep CSS modules minimal**: If you're writing a lot of typography or spacing rules, you should be using UI components instead

### Import pattern

Always import from the barrel export:
```jsx
import { Heading, Text, Display, Stack, Container, Divider, AnimatedLink } from "../../../../components/ui/index.js";
```

Adjust the relative path depth based on your page location.

## Required outputs

You must create or update:

1. the page component in a dedicated folder such as `src/features/<feature>/pages/<PageName>/<PageName>.jsx`
2. a colocated CSS module for that page when the page has page-specific styling, such as `src/features/<feature>/pages/<PageName>/<PageName>.module.css`
3. any minimal shared supporting components under `src/components/` or `src/features/<feature>/components/`, each in its own dedicated folder
4. shared style files only if the page genuinely requires global styling beyond tokens and the shared global stylesheet
5. a focused Zustand store under a domain-local store folder such as `src/features/<feature>/store/` when the page introduces business logic or shared working state

Do not write page-local `index.html`, `styles.css`, or `app.js` files for this technology.

## Implementation rules

- read the app manifest and design system first
- follow the route for this page exactly
- implement pages so they work cleanly under `react-router-dom`
- assume preview routing uses `createMemoryRouter`
- avoid building page navigation around local view-state when a route should express it
- use Zustand for business logic, derived working state, and interactions shared across components
- use `useState` only for truly local visual state
- if persistence is needed, use Zustand persistence with `sessionStorage`
- prefer props and local mock data seams over hardcoded backend assumptions
- keep the page realistic and interactive enough for preview
- prefer CSS modules over global class names for page and component styling
- do not leave component JSX and CSS as sibling loose files in a crowded folder; tighten each piece into its own folder
- if routing setup in `src/app/App.jsx` must be extended for this page, make the smallest coherent edit necessary

## Build verification requirements

- before you finish, verify the design still builds from `{{DESIGN_PATH}}`
- use the command tool from `{{DESIGN_PATH}}`
- ensure Vite preview builds are nested-path safe by configuring relative asset URLs in `vite.config.js` with `base: "./"`
- do not leave the build relying on root-relative `/assets/...` URLs, because preview serves `dist/index.html` from a nested `/design-preview/.../dist/` path
- if dependencies are missing, run `npm install --no-fund --no-audit`
- run `npm run build -- --base=./`
- if the build fails, fix your page changes until the build succeeds
- do not complete the task while leaving the design in a broken build state

## Constraints

- Write only under `.code-analysis/design/`
- Do not require npm install or a custom build step inside this task unless it is needed to restore a valid React build
- Do not rewrite the full app shell unless the page contract truly requires it

## Final response

Summarize:

- what React page module was implemented
- what route or app-shell wiring was added
- what Zustand store logic was added
- whether the build passed after your changes
- what interactions are live
- which actions remain intentionally inert