# AI Chat Integration - Quick Reference

## 🚀 Add AI Chat to Any Section in 3 Steps

### Step 1: Imports

```javascript
import { useState } from "react";
import { Portal, Button } from "@chakra-ui/react";
import { MessageSquare } from "lucide-react";
import { AISectionChat } from "./chat";
import { [CONFIG_NAME] } from "../../config";
```

### Step 2: State & Button

```javascript
// Add state
const [isChatOpen, setIsChatOpen] = useState(false);

// Add button (only show when content exists)
{
  content && (
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

### Step 3: Chat Component

```javascript
{
  isChatOpen && (
    <Portal>
      <AISectionChat
        {...CONFIG_NAME}
        currentContent={content}
        onClose={() => setIsChatOpen(false)}
        onApplyChanges={(newContent) => {
          onChange(newContent);
          setIsChatOpen(false);
        }}
      />
    </Portal>
  );
}
```

---

## 📦 Available Configs

| Section                | Config Name                 | Import                                                     |
| ---------------------- | --------------------------- | ---------------------------------------------------------- |
| 📚 **Documentation**   | `DOCUMENTATION_CHAT_CONFIG` | `import { DOCUMENTATION_CHAT_CONFIG } from "../../config"` |
| 📋 **Requirements**    | `REQUIREMENTS_CHAT_CONFIG`  | `import { REQUIREMENTS_CHAT_CONFIG } from "../../config"`  |
| 🧪 **Testing**         | `TESTING_CHAT_CONFIG`       | `import { TESTING_CHAT_CONFIG } from "../../config"`       |
| 🔒 **Bugs & Security** | `BUGS_SECURITY_CHAT_CONFIG` | `import { BUGS_SECURITY_CHAT_CONFIG } from "../../config"` |
| 📊 **Diagrams**        | `DIAGRAMS_CHAT_CONFIG`      | `import { DIAGRAMS_CHAT_CONFIG } from "../../config"`      |

---

## 📝 Full Example: Requirements Section

```javascript
import { useState } from "react";
import { Portal, Button, HStack } from "@chakra-ui/react";
import { MessageSquare } from "lucide-react";
import { AISectionChat } from "./chat";
import { REQUIREMENTS_CHAT_CONFIG } from "../../config";

export default function DomainRequirementsSection({
  requirements,
  onRequirementsChange,
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading>Requirements</Heading>
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
      </Card.Header>

      <Card.Body>{/* Your content here */}</Card.Body>

      {isChatOpen && (
        <Portal>
          <AISectionChat
            {...REQUIREMENTS_CHAT_CONFIG}
            currentContent={requirements}
            onClose={() => setIsChatOpen(false)}
            onApplyChanges={(newContent) => {
              onRequirementsChange(newContent);
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

## 🎨 Custom Config Example

```javascript
const MY_CUSTOM_CONFIG = {
  sectionName: "My Section",
  sectionType: "my-section",
  initialGreeting: "Hello! I'm your custom assistant...",
  samplePrompts: [
    "Custom prompt 1",
    "Custom prompt 2",
    "Custom prompt 3",
  ],
  inputPlaceholder: "Ask AI about your section...",
};

<AISectionChat {...MY_CUSTOM_CONFIG} ... />
```

---

## ⚙️ AISectionChat Props

| Prop               | Type     | Required | Description                          |
| ------------------ | -------- | -------- | ------------------------------------ |
| `sectionName`      | string   | Config   | Display name (e.g., "Documentation") |
| `sectionType`      | string   | Config   | Type for API (e.g., "documentation") |
| `currentContent`   | object   | ✅ Yes   | Current section content              |
| `initialGreeting`  | string   | Config   | AI's first message                   |
| `samplePrompts`    | array    | Config   | Example prompts                      |
| `inputPlaceholder` | string   | Config   | Input placeholder text               |
| `onClose`          | function | ✅ Yes   | Close handler                        |
| `onApplyChanges`   | function | ✅ Yes   | Apply changes handler                |

_Props marked "Config" are included when spreading a config object_

---

## ✅ Checklist

- [ ] Import `AISectionChat` and config
- [ ] Add `isChatOpen` state
- [ ] Add "Edit with AI" button (conditional on content)
- [ ] Add Portal with `AISectionChat` component
- [ ] Implement `onApplyChanges` handler
- [ ] Test: Open chat, send message, close chat
- [ ] Test: Apply suggestion updates content

---

## 🐛 Common Issues

| Issue                       | Solution                                      |
| --------------------------- | --------------------------------------------- |
| Chat doesn't appear         | Check `isChatOpen` state connection           |
| Chat appears behind content | Ensure using `<Portal>` wrapper               |
| Can't close chat            | Verify `onClose` sets `isChatOpen` to `false` |
| Wrong prompts               | Check using correct config                    |
| Apply doesn't work          | Check `onApplyChanges` implementation         |

---

## 📚 Documentation

- **Full Guide**: [HOW-TO-ADD-AI-CHAT.md](./HOW-TO-ADD-AI-CHAT.md)
- **Architecture**: [PRODUCTION-READY-REFACTORING.md](./PRODUCTION-READY-REFACTORING.md)
- **Component Code**: `frontend/src/components/domain/chat/AISectionChat.jsx`
- **Configs**: `frontend/src/config/ai-chat-config.js`

---

**Time to integrate: ~5 minutes per section** ⚡
