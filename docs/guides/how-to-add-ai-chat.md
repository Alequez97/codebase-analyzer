# How to Add AI Chat to Any Domain Section

## Overview

The `AISectionChat` component is a **generic, reusable AI chat interface** that can be added to any domain section (Documentation, Requirements, Testing, Bugs/Security, Diagrams, etc.).

This guide shows you how to integrate it in 3 simple steps.

---

## Architecture

```
frontend/src/
├── components/domain/
│   ├── chat/
│   │   └── AISectionChat.jsx          # Generic chat component
│   ├── DomainDocumentationSection.jsx # Example: Already integrated ✅
│   ├── DomainRequirementsSection.jsx  # Example: Ready to integrate
│   ├── DomainTestingSection.jsx       # Example: Ready to integrate
│   └── ...
├── config/
│   └── ai-chat-config.js              # Centralized chat configurations
```

---

## Step 1: Import Required Components

In your section component (e.g., `DomainRequirementsSection.jsx`):

```javascript
import { useState } from "react";
import { Portal } from "@chakra-ui/react";
import { MessageSquare } from "lucide-react";
import AISectionChat from "./chat/AISectionChat";
import { REQUIREMENTS_CHAT_CONFIG } from "../../config/ai-chat-config";
```

---

## Step 2: Add Chat State & Button

### Add State Hook

```javascript
export default function DomainRequirementsSection({
  requirements,
  onRequirementsChange,
  onSave,
  // ... other props
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ... rest of component
}
```

### Add "Edit with AI" Button

Replace or add alongside your existing analyze button:

```javascript
{
  /* Only show Edit with AI when content exists */
}
{
  requirements && (
    <Button
      size="sm"
      colorPalette="purple"
      variant="outline"
      onClick={() => setIsChatOpen(true)}
    >
      <MessageSquare size={14} />
      Edit with AI
    </Button>
  );
}
```

---

## Step 3: Add Chat Panel Component

At the **end of your component's JSX** (before the closing tag of your main container):

```javascript
      {/* AI Chat Panel - Opens as a side panel */}
      {isChatOpen && (
        <Portal>
          <AISectionChat
            {...REQUIREMENTS_CHAT_CONFIG}  // Use the appropriate config
            currentContent={requirements}
            onClose={() => setIsChatOpen(false)}
            onApplyChanges={(newContent) => {
              // Apply AI-suggested changes
              onRequirementsChange?.(newContent);
              setIsChatOpen(false);
            }}
          />
        </Portal>
      )}
    </Card.Root>  {/* Your component's closing tag */}
  );
}
```

---

## Complete Example: Requirements Section

Here's a full example of integrating AI chat into `DomainRequirementsSection.jsx`:

```javascript
import { useState } from "react";
import { Box, Button, HStack, Portal } from "@chakra-ui/react";
import { MessageSquare, Sparkles } from "lucide-react";
import { Card } from "../ui/card";
import AISectionChat from "./chat/AISectionChat";
import { REQUIREMENTS_CHAT_CONFIG } from "../../config/ai-chat-config";

export default function DomainRequirementsSection({
  requirements,
  onAnalyze,
  onRequirementsChange,
  onSave,
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Requirements</Heading>
          <HStack>
            {/* Show Analyze when no requirements exist */}
            {!requirements && (
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={onAnalyze}
              >
                <Sparkles size={14} />
                Analyze requirements
              </Button>
            )}

            {/* Show Edit with AI when requirements exist */}
            {requirements && (
              <Button
                size="sm"
                colorPalette="purple"
                variant="outline"
                onClick={() => setIsChatOpen(true)}
              >
                <MessageSquare size={14} />
                Edit with AI
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body>
        {/* Your existing requirements display logic */}
        {requirements ? (
          <Box>{/* Render requirements */}</Box>
        ) : (
          <EmptyState title="No requirements analyzed yet" />
        )}
      </Card.Body>

      {/* AI Chat Panel */}
      {isChatOpen && (
        <Portal>
          <AISectionChat
            {...REQUIREMENTS_CHAT_CONFIG}
            currentContent={requirements}
            onClose={() => setIsChatOpen(false)}
            onApplyChanges={(newContent) => {
              onRequirementsChange?.(newContent);
              setIsChatOpen(false);
            }}
          />
        </Portal>
      )}
    </Card.Root>
  );
}
```

---

## Available Configurations

All configurations are defined in `frontend/src/config/ai-chat-config.js`:

### 📚 Documentation

```javascript
import { DOCUMENTATION_CHAT_CONFIG } from "../../config/ai-chat-config";
```

- **Section**: Documentation
- **Prompts**: Add examples, make concise, add troubleshooting, etc.

### 📋 Requirements

```javascript
import { REQUIREMENTS_CHAT_CONFIG } from "../../config/ai-chat-config";
```

- **Section**: Requirements
- **Prompts**: Add acceptance criteria, make specific, add edge cases, etc.

### 🧪 Testing

```javascript
import { TESTING_CHAT_CONFIG } from "../../config/ai-chat-config";
```

- **Section**: Testing
- **Prompts**: Add edge case tests, improve descriptions, add integration tests, etc.

### 🔒 Bugs & Security

```javascript
import { BUGS_SECURITY_CHAT_CONFIG } from "../../config/ai-chat-config";
```

- **Section**: Bugs & Security
- **Prompts**: Explain vulnerability, suggest fixes, add best practices, etc.

### 📊 Diagrams

```javascript
import { DIAGRAMS_CHAT_CONFIG } from "../../config/ai-chat-config";
```

- **Section**: Diagrams
- **Prompts**: Add detail, simplify, add sequence diagram, etc.

---

## Customizing Chat for Your Section

If you need a custom configuration (not in the predefined configs):

### Option 1: Use Helper Function

```javascript
import { getChatConfig } from "../../config/ai-chat-config";

const myConfig = getChatConfig("my-custom-section");
```

### Option 2: Create Custom Config Object

```javascript
const MY_CUSTOM_CONFIG = {
  sectionName: "My Section",
  sectionType: "my-section",
  initialGreeting: "Hello! I'm your custom assistant...",
  samplePrompts: [
    "Do something specific",
    "Improve this aspect",
    "Add custom feature",
  ],
  inputPlaceholder: "Ask AI about your custom section...",
};

// Then use it:
<AISectionChat {...MY_CUSTOM_CONFIG} ... />
```

---

## Props Reference

### AISectionChat Component Props

| Prop                 | Type     | Required | Default             | Description                                |
| -------------------- | -------- | -------- | ------------------- | ------------------------------------------ |
| `sectionName`        | string   | No       | "Section"           | Display name (e.g., "Documentation")       |
| `sectionType`        | string   | No       | "section"           | Type for API calls (e.g., "documentation") |
| `currentContent`     | object   | No       | null                | Current section content object             |
| `contextDescription` | string   | No       | Auto-generated      | Text shown in context banner               |
| `initialGreeting`    | string   | No       | Generic greeting    | AI's first message                         |
| `samplePrompts`      | array    | No       | Generic prompts     | Example prompts shown to user              |
| `inputPlaceholder`   | string   | No       | Generic placeholder | Input field placeholder                    |
| `onClose`            | function | **Yes**  | -                   | Callback when chat is closed               |
| `onApplyChanges`     | function | **Yes**  | -                   | Callback when applying AI suggestions      |
| `domainId`           | string   | No       | -                   | Domain ID for API calls (future)           |

---

## Best Practices

### 1. **Show Edit with AI Only When Content Exists**

```javascript
{
  /* ✅ GOOD - Conditional rendering */
}
{
  requirements && (
    <Button onClick={() => setIsChatOpen(true)}>Edit with AI</Button>
  );
}

{
  /* ❌ BAD - Always showing */
}
<Button onClick={() => setIsChatOpen(true)}>Edit with AI</Button>;
```

### 2. **Use Portal for Overlay**

Always wrap the chat in a `Portal` to ensure proper z-index layering:

```javascript
{isChatOpen && (
  <Portal>
    <AISectionChat ... />
  </Portal>
)}
```

### 3. **Use Spread Operator for Configs**

Cleaner and easier to maintain:

```javascript
{/* ✅ GOOD - Using spread */}
<AISectionChat {...TESTING_CHAT_CONFIG} ... />

{/* ❌ BAD - Manual props */}
<AISectionChat
  sectionName="Testing"
  sectionType="testing"
  initialGreeting="..."
  samplePrompts={[...]}
  inputPlaceholder="..."
/>
```

### 4. **Handle Content Updates Properly**

Make sure `onApplyChanges` updates your section's state:

```javascript
onApplyChanges={(newContent) => {
  // Update parent component state
  onRequirementsChange?.(newContent);

  // Close chat
  setIsChatOpen(false);

  // Optional: Show success toast
  toaster.create({
    title: "Requirements updated",
    type: "success",
  });
}}
```

---

## Testing Your Integration

### Manual Testing Checklist

- [ ] Click "Edit with AI" opens chat panel
- [ ] Chat panel slides in from right (desktop) or full screen (mobile)
- [ ] AI greeting message appears
- [ ] Sample prompts are visible
- [ ] Can type and send messages
- [ ] AI responds with mock data (initially)
- [ ] Copy message button works
- [ ] Close button closes chat
- [ ] Reset button clears conversation
- [ ] ESC key closes chat (handled by parent if needed)

### Integration Testing (After Backend)

- [ ] Real AI responses appear
- [ ] Apply suggestion updates section
- [ ] Changes persist after closing chat
- [ ] Error handling works
- [ ] Multiple chat sessions work correctly

---

## Common Issues & Solutions

### Issue: Chat panel doesn't appear

**Solution**: Check that `isChatOpen` state is properly connected to button onClick and Portal conditional.

### Issue: Chat appears behind other content

**Solution**: Ensure you're using `<Portal>` wrapper.

### Issue: Can't close chat

**Solution**: Verify `onClose` callback properly sets `isChatOpen` to `false`.

### Issue: Apply changes doesn't work

**Solution**: Check that `onApplyChanges` callback is updating parent component state.

### Issue: Wrong sample prompts showing

**Solution**: Verify you're importing the correct config (e.g., `TESTING_CHAT_CONFIG` not `DOCUMENTATION_CHAT_CONFIG`).

---

## Next Steps After Integration

Once you've added the chat UI to your section:

1. **Test the UI** - Verify it works with mock data
2. **Review the button placement** - Ensure it fits your section's layout
3. **Customize prompts if needed** - Update config for section-specific use cases
4. **Wait for backend** - Backend API integration will replace mock responses

---

## Backend Integration (Future)

When the backend is ready, update your `onApplyChanges` callback:

```javascript
onApplyChanges={async (newContent) => {
  try {
    // Call API to save changes
    await saveRequirements(domainId, newContent);

    // Update local state
    onRequirementsChange?.(newContent);

    // Close chat
    setIsChatOpen(false);

    // Show success
    toaster.create({
      title: "Requirements updated successfully",
      type: "success",
    });
  } catch (error) {
    // Show error
    toaster.create({
      title: "Failed to save changes",
      description: error.message,
      type: "error",
    });
  }
}}
```

---

## Summary

**Adding AI chat to any section requires just 3 steps:**

1. Import `AISectionChat` and config
2. Add `isChatOpen` state and "Edit with AI" button
3. Add `<Portal><AISectionChat /></Portal>` at the end

**Benefits:**

- ✅ Consistent AI chat experience across all sections
- ✅ Reusable component (no duplication)
- ✅ Easy to customize via configs
- ✅ Mobile-responsive out of the box
- ✅ Production-ready UI

**Next section to integrate?** Start with Requirements or Testing following this guide!
