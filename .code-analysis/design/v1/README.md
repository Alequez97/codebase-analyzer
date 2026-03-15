# Design System v1

A modular, component-based design system for the Codebase Analyzer application.

## Structure

```
designs/v1/
├── index.html              # Main HTML file
├── main.js                 # Application entry point
├── data-manager.js         # Data management and validation
├── components/             # Component-specific files
│   ├── header.css          # Header component styles
│   ├── header.js           # Header component logic
│   ├── tasks-status.css    # Tasks status component styles
│   └── tasks-status.js     # Tasks status component logic
├── styles/                 # Shared styles
│   ├── base.css            # Global reset and foundation
│   ├── components.css      # Reusable component styles
│   └── tokens.css          # Design tokens (colors, spacing, etc.)
├── data/                   # Data contracts and mock data
│   ├── contracts.json      # Data structure definitions
│   └── mock-data.json      # Sample data for development
└── assets/                 # Static assets (images, fonts, etc.)
```

## Design Principles

### 1. **Modular Components**

- Each component lives in its own file
- Components are self-contained with their own CSS and JavaScript
- Clear separation of concerns

### 2. **Shared Design Tokens**

- All design values (colors, spacing, typography) defined in `tokens.css`
- Consistent design language across all components
- Easy to maintain and update

### 3. **Data Contracts**

- JSON Schema definitions for all data structures
- Type safety and validation
- Clear API contracts for components

### 4. **Progressive Enhancement**

- Works without JavaScript (basic HTML/CSS)
- Enhanced with JavaScript for interactions
- Accessible by default

## Usage

### Adding a New Component

1. **Create component files** in `components/`:

   ```
   components/
   ├── my-component.css
   └── my-component.js
   ```

2. **Import styles** in `index.html`:

   ```html
   <link rel="stylesheet" href="./components/my-component.css" />
   ```

3. **Import script** in `index.html`:

   ```html
   <script src="./components/my-component.js"></script>
   ```

4. **Initialize in component JavaScript**:

   ```javascript
   class MyComponent {
     constructor() {
       // Component logic
     }
   }

   document.addEventListener("DOMContentLoaded", () => {
     window.myComponent = new MyComponent();
   });
   ```

### Using Design Tokens

```css
.my-element {
  color: var(--color-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

### Data Validation

```javascript
// Load and validate data
await window.dataManager.loadFromScript("mock-data");

// Access validated data
const tasks = window.dataManager.getTaskStatusList();
const systemStatus = window.dataManager.getSystemStatus();
```

## Development

### Running the Design System

1. Open `designs/v1/index.html` in a web browser
2. The system will automatically load mock data and initialize components

### Adding Mock Data

Edit `data/mock-data.json` to add new sample data. Make sure it conforms to the contracts in `contracts.json`.

### Modifying Styles

- **Global changes**: Edit `styles/tokens.css`
- **Component-specific**: Edit component CSS files
- **Utilities**: Add to `styles/components.css`

## Versioning

This is version 1 (v1) of the design system. Future versions should:

1. Create a new directory `designs/v2/`
2. Copy and improve upon v1 structure
3. Update component APIs while maintaining backward compatibility
4. Document breaking changes

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Custom Properties support required
- ES6+ JavaScript features used

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus management
