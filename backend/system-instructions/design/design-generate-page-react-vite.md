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
- Design root path: `{{DESIGN_ROOT_PATH}}` (e.g., `.code-analysis/design/v1`)
- Output path: `{{OUTPUT_PATH}}` (e.g., `src/features/auth/pages/LoginPage/`)
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
- **Breakpoints**: `--breakpoint-sm: 640px`, `--breakpoint-md: 768px`, `--breakpoint-lg: 1024px`, `--breakpoint-xl: 1280px`, `--breakpoint-2xl: 1536px`

**CRITICAL**: Never hardcode values like `font-size: 24px` or `color: #14b8a6`. Always use design tokens.

### UI component library (src/components/ui/)

A comprehensive set of building blocks is available. Import from `src/components/ui/index.js`:

#### Typography components

- **Heading**: Semantic headings with props: `level` (1-6), `size`, `weight`, `color`, `align`, `transform`
- **Text**: Body text with props: `as`, `size`, `weight`, `color`, `align`, `leading`
- **Display**: Large hero/display text with props: `size`, `weight`, `color`, `align`, `shadow`

```jsx
import { Heading, Text, Display } from "@/components/ui/index.js";

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
import { Stack, Container } from "@/components/ui/index.js";

<Container size="md" padding center>
  <Stack direction="column" gap={6} align="center">
    {/* children */}
  </Stack>
</Container>;
```

#### Utility components

- **Divider**: Horizontal divider with optional `label` and `color` props
- **AnimatedLink**: Link with animated arrow or underline with props: `to`, `href`, `arrow`, `underline`, `color`

```jsx
import { Divider, AnimatedLink } from "@/components/ui/index.js";

<Divider label="or" color="inverse" />
<AnimatedLink to="/next" arrow color="accent">Continue</AnimatedLink>
```

#### Responsive layout components

- **Grid**: CSS Grid with responsive column support:
  - `cols`: number (1-12) or responsive object `{ sm: 1, md: 2, lg: 3 }`
  - `gap`: spacing between items
  - Example: `<Grid cols={{ sm: 1, md: 2, lg: 3 }} gap={4}>{items}</Grid>`
- **Hide**: Hide content at breakpoints: `<Hide below="md">Desktop only</Hide>`
- **Show**: Show content at breakpoints: `<Show below="md">Mobile only</Show>`

```jsx
import { Grid, Hide, Show } from "@/components/ui/index.js";

<Grid cols={{ sm: 1, md: 2, lg: 3 }} gap={4}>
  {cards.map(card => <Card key={card.id} {...card} />)}
</Grid>

<Hide below="md">
  <DesktopNav />
</Hide>
<Show below="md">
  <MobileNav />
</Show>
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

## Responsive Design Requirements (CRITICAL)

Every page MUST be fully responsive and follow mobile-first principles. This is mandatory, not optional.

### Mobile-First CSS Approach

Write CSS mobile-first using `min-width` media queries:

```css
/* ✅ CORRECT - Mobile first approach */
.hero {
  padding: var(--space-6) var(--space-4);
  font-size: var(--text-2xl);
}

@media (min-width: 768px) {
  .hero {
    padding: var(--space-12) var(--space-8);
    font-size: var(--text-4xl);
  }
}

@media (min-width: 1024px) {
  .hero {
    padding: var(--space-16) var(--space-12);
    font-size: var(--text-5xl);
  }
}

/* ❌ WRONG - Desktop first with max-width */
.hero {
  padding: var(--space-16) var(--space-12);
  font-size: var(--text-5xl);
}

@media (max-width: 1023px) {
  .hero {
    padding: var(--space-12) var(--space-8);
    font-size: var(--text-4xl);
  }
}

@media (max-width: 767px) {
  .hero {
    padding: var(--space-6) var(--space-4);
    font-size: var(--text-2xl);
  }
}
```

### Breakpoints to Use

Always use these breakpoints:
- **sm (640px)**: Mobile landscape / large phones
- **md (768px)**: Tablets
- **lg (1024px)**: Small laptops / tablets landscape
- **xl (1280px)**: Desktops
- **2xl (1536px)**: Large desktops

### Required Responsive Patterns

1. **Single column on mobile**: All layouts should stack vertically on mobile
   ```jsx
   <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap={4}>
     {items}
   </Grid>
   ```

2. **Responsive typography**: Use responsive sizing for headings
   ```jsx
   <Display size={{ sm: "lg", md: "xl", lg: "2xl" }}>
     Hero Title
   </Display>
   ```

3. **Responsive spacing**: Reduce padding/gap on mobile
   ```jsx
   <Stack gap={{ sm: 4, md: 6, lg: 8 }}>
     {content}
   </Stack>
   ```

4. **Responsive navigation**: Show hamburger on mobile, full nav on desktop
   ```jsx
   <Hide below="md"><DesktopNav /></Hide>
   <Show below="md"><MobileMenu /></Show>
   ```

### Touch Target Requirements

All interactive elements must meet minimum sizes:
- **Buttons**: Min 44px height, adequate padding (12px+ vertical)
- **Links**: Clear visual distinction, adequate spacing
- **Form inputs**: Min 44px height for comfortable tapping
- **Cards/clickable areas**: Min 44px touch target

### Common Responsive Mistakes to Avoid

❌ **Fixed widths that break on mobile**
```css
.card {
  width: 400px; /* Breaks on screens < 400px */
}
```

✅ **Use max-width or responsive sizing**
```css
.card {
  width: 100%;
  max-width: 400px;
}
```

❌ **Horizontal overflow**
```css
.container {
  width: 100vw; /* Causes overflow on mobile with scrollbars */
}
```

✅ **Proper full-width**
```css
.container {
  width: 100%;
  min-width: 0; /* Allow shrinking below content size */
}
```

❌ **Text too small on mobile**
```css
.body {
  font-size: 14px; /* Too small on mobile */
}
```

✅ **Comfortable reading size**
```css
.body {
  font-size: 16px; /* Minimum 16px on mobile */
}

@media (min-width: 768px) {
  .body {
    font-size: 18px;
  }
}
```

❌ **Grid that doesn't reflow**
```jsx
<Grid cols={4}> {/* Always 4 columns, squishes on mobile */}
```

✅ **Responsive grid**
```jsx
<Grid cols={{ sm: 1, md: 2, lg: 4 }}> {/* Stacks on mobile */}
```

### Testing Your Responsive Implementation

Before completing your task:
1. Verify the page at **320px width** (iPhone SE size)
2. Verify the page at **768px width** (iPad portrait)
3. Verify the page at **1024px width** (small laptop)
4. Verify the page at **1440px width** (desktop)
5. Check that no horizontal scrolling occurs
6. Verify all touch targets are 44px+
7. Check text readability (minimum 16px on mobile)

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
5. **Always write responsive CSS**: Use mobile-first approach with `min-width` media queries

   ```css
   /* Mobile base styles */
   .cardGrid {
     display: grid;
     grid-template-columns: 1fr;
     gap: var(--space-4);
   }

   /* Tablet and up */
   @media (min-width: 768px) {
     .cardGrid {
       grid-template-columns: repeat(2, 1fr);
       gap: var(--space-6);
     }
   }

   /* Desktop and up */
   @media (min-width: 1024px) {
     .cardGrid {
       grid-template-columns: repeat(3, 1fr);
     }
   }
   ```

### Import pattern

Always use the `@/` path alias pointing to the `src/` directory to avoid deep relative paths (`../../../../`).

Always import from the barrel export for UI components:

```jsx
import {
  Heading,
  Text,
  Display,
  Stack,
  Container,
  Divider,
  AnimatedLink,
} from "@/components/ui/index.js";
import { useMyStore } from "@/features/myFeature/store/useMyStore.js";
```

## Required outputs

You must CREATE the page files at `{{DESIGN_ROOT_PATH}}/{{OUTPUT_PATH}}`:

1. **Page component**: `{{DESIGN_ROOT_PATH}}/{{OUTPUT_PATH}}<PageName>.jsx`
   - Create the folder if it doesn't exist
   - Full implementation with named export matching the page name
   
2. **Page styles**: `{{DESIGN_ROOT_PATH}}/{{OUTPUT_PATH}}<PageName>.module.css`
   - Page-specific CSS using design tokens
   
3. **Barrel export**: `{{DESIGN_ROOT_PATH}}/{{OUTPUT_PATH}}index.js`
   - Re-export the page component for clean imports
   
4. **Local components**: `{{DESIGN_ROOT_PATH}}/{{OUTPUT_PATH}}components/<ComponentName>/` (when needed)
   - Create folders and files for page-local components
   
5. **Local store**: `{{DESIGN_ROOT_PATH}}/src/features/<feature>/store/use<Feature>Store.js` (when needed)
   - Create store if page needs business logic

**CRITICAL**: 
- CREATE files from scratch - they don't exist yet
- DO NOT create or modify `{{DESIGN_ROOT_PATH}}/src/app/App.jsx`
- DO NOT modify routing - App.jsx already imports your page, just make sure export matches
- Write ALL files within `{{DESIGN_ROOT_PATH}}/` (the design version folder)
- NEVER write to `.code-analysis/output/` or any other location
- Use the design system at `{{TOKENS_PATH}}` and `{{DESIGN_SYSTEM_PATH}}`
- Import shared UI components from `{{DESIGN_ROOT_PATH}}/src/components/ui/`

Do not write page-local `index.html`, `styles.css`, or `app.js` files for this technology.

## Implementation rules

- read the app manifest and design system first
- the routing and imports are ALREADY set up in `src/app/App.jsx` - DO NOT modify App.jsx
- your job is to IMPLEMENT the page component at `{{OUTPUT_PATH}}<PageName>.jsx`
- the page component is ALREADY imported in App.jsx - just fill in the implementation
- implement the page so it works cleanly under `react-router-dom`
- use Zustand for business logic, derived working state, and interactions shared across components
- use `useState` only for truly local visual state
- default to in-memory Zustand stores (no browser storage)
- do not use `localStorage` or `sessionStorage` for store data unless it is explicit config/preferences that must persist
- avoid Zustand `persist` middleware unless strictly necessary for explicit config/preferences persistence
- prefer props and local mock data seams over hardcoded backend assumptions
- keep the page realistic and interactive enough for preview
- prefer CSS modules over global class names for page and component styling
- do not leave component JSX and CSS as sibling loose files in a crowded folder; tighten each piece into its own folder
- **DO NOT modify `src/app/App.jsx` or any routing setup** - focus only on your page implementation

## Build verification requirements

- before you finish, verify the design still builds from `{{DESIGN_ROOT_PATH}}`
- use the command tool from `{{DESIGN_ROOT_PATH}}` (NOT from the project root)
- ensure Vite preview builds are nested-path safe by configuring relative asset URLs in `vite.config.js` with `base: "./"`
- do not leave the build relying on root-relative `/assets/...` URLs, because preview serves `dist/index.html` from a nested `/design-preview/.../dist/` path
- if dependencies are missing, run `npm install --no-fund --no-audit` from `{{DESIGN_ROOT_PATH}}`
- run `npm run build -- --base=./` from `{{DESIGN_ROOT_PATH}}`
- if the build fails, fix your page changes until the build succeeds
- do not complete the task while leaving the design in a broken build state
- **Never modify files outside `{{DESIGN_ROOT_PATH}}/`** to fix build issues

## Constraints

- **Write ONLY under `{{DESIGN_ROOT_PATH}}/`** - This is your workspace for this page
- **NEVER write to** `.code-analysis/output/` or any path outside the design folder
- Read design system files from `{{DESIGN_ROOT_PATH}}/` (tokens.css, app-manifest.json, etc.)
- Do not require npm install or a custom build step inside this task unless it is needed to restore a valid React build
- Do not rewrite the full app shell unless the page contract truly requires it

## Final response

Summarize:

- what React page module was implemented
- what route or app-shell wiring was added
- what Zustand store logic was added
- **responsive design implementation** (breakpoints used, mobile-first approach, touch targets)
- whether the build passed after your changes
- what interactions are live
- which actions remain intentionally inert

**CRITICAL**: Before completing, verify responsive behavior at these widths: 320px, 768px, 1024px, 1440px. Confirm no horizontal overflow and all touch targets are 44px+.
