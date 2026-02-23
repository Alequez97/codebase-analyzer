# AI Documentation Chat - UI Flow Visualization

## UI States and User Journey

### State 1: Initial View (No Documentation)

```
┌────────────────────────────────────────────────────────────┐
│ ▼ Documentation                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│               📄 No documentation analyzed yet             │
│                                                            │
│   Click 'Analyze documentation' to generate deep          │
│   analysis of this domain's business purpose              │
│                                                            │
│              [ ✨ Analyze documentation ]                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Available Actions**:

- ✨ Analyze documentation → Triggers initial AI analysis

---

### State 2: Documentation Exists (Main View)

```
┌────────────────────────────────────────────────────────────┐
│ ▼ Documentation                    [💬 Edit with AI]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ # User Authentication Domain                               │
│                                                            │
│ ## Overview                                                │
│ This domain handles user authentication, session           │
│ management, and authorization...                           │
│                                                            │
│ ## Key Components                                          │
│ - LoginService: Manages user login flow                    │
│ - TokenManager: JWT token generation and validation        │
│                                                            │
│ (Double-click to edit)                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Available Actions**:

- 💬 Edit with AI → Opens chat panel
- Double-click anywhere → Enter manual edit mode

---

### State 3: Chat Panel Opened

```
Main View (Left)                    Chat Panel (Right)
┌─────────────────────────┐   ┌──────────────────────────────────┐
│ Documentation           │   │ 🪄 Edit Documentation with AI ↻ × │
│                         │   │    Chat with AI to improve       │
│ # User Authentication   │   ├──────────────────────────────────┤
│                         │   │ ℹ️ Context: AI has access to     │
│ ## Overview             │   │    current docs (1,234 chars)    │
│ This domain handles...  │   ├──────────────────────────────────┤
│                         │   │                                  │
│ ## Key Components       │   │ 🤖 AI Assistant                  │
│ - LoginService          │   │ ┌──────────────────────────────┐ │
│ - TokenManager          │   │ │ Hello! I'm your AI           │ │
│                         │   │ │ documentation assistant.     │ │
│ [💬 Edit with AI]       │   │ │ I can help you improve,      │ │
│                         │   │ │ expand, or modify your       │ │
│                         │   │ │ documentation.               │ │
└─────────────────────────┘   │ └──────────────────────────────┘ │
                              │ 12:30 PM                         │
                              │                                  │
                              │ 💡 Try asking:                   │
                              │ • Add more detailed examples     │
                              │ • Make it more concise           │
                              │ • Add a troubleshooting section  │
                              │                                  │
                              ├──────────────────────────────────┤
                              │ ┌──────────────────────────────┐ │
                              │ │ Ask AI to improve your...    │ │
                              │ └──────────────────────────────┘ │
                              │ Press Enter to send  [Send →]    │
                              └──────────────────────────────────┘
```

**Available Actions**:

- Type message → Enter request
- Click sample prompt → Auto-fill input
- ↻ Reset → Clear conversation
- × Close → Return to main view

---

### State 4: User Sends Message

```
Chat Panel
┌──────────────────────────────────────┐
│ 🪄 Edit Documentation with AI     × │
├──────────────────────────────────────┤
│ ℹ️ Context: AI has access to docs   │
├──────────────────────────────────────┤
│                                      │
│ 🤖 AI Assistant                      │
│ ┌──────────────────────────────────┐ │
│ │ Hello! I'm your AI...            │ │
│ └──────────────────────────────────┘ │
│ 12:30 PM                             │
│                                      │
│                 👤 You               │
│ ┌──────────────────────────────────┐ │
│ │ Add more examples to the         │ │
│ │ login flow section               │ │
│ └──────────────────────────────────┘ │
│                             12:31 PM │
│                                      │
│ 🤖 AI Assistant                      │
│ ┌──────────────────────────────────┐ │
│ │ AI is thinking...                │ │
│ └──────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ [Input field disabled during load]   │
└──────────────────────────────────────┘
```

**System State**:

- User message added to chat
- Input cleared
- AI response loading
- Send button disabled

---

### State 5: AI Responds with Suggestion

````
Chat Panel
┌──────────────────────────────────────┐
│ 🪄 Edit Documentation with AI     × │
├──────────────────────────────────────┤
│                                      │
│                 👤 You               │
│ ┌──────────────────────────────────┐ │
│ │ Add more examples to the         │ │
│ │ login flow section               │ │
│ └──────────────────────────────────┘ │
│                             12:31 PM │
│                                      │
│ 🤖 AI Assistant                 📋  │
│ ┌──────────────────────────────────┐ │
│ │ I understand you want to add     │ │
│ │ more examples. Here's my         │ │
│ │ suggested update:                │ │
│ │                                  │ │
│ │ ## Login Flow Examples           │ │
│ │                                  │ │
│ │ ### Basic Login                  │ │
│ │ ```javascript                    │ │
│ │ const user = await login({       │ │
│ │   email: "user@example.com",     │ │
│ │   password: "secure123"          │ │
│ │ });                              │ │
│ │ ```                              │ │
│ │                                  │ │
│ │ ### OAuth Login                  │ │
│ │ [... more examples ...]          │ │
│ │                                  │ │
│ │  [✅ Apply this suggestion]      │ │
│ └──────────────────────────────────┘ │
│ 12:31 PM                             │
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Type your next request...        │ │
│ └──────────────────────────────────┘ │
│                         [Send →]     │
└──────────────────────────────────────┘
````

**Available Actions**:

- ✅ Apply this suggestion → Update documentation
- 📋 Copy icon → Copy message to clipboard
- Continue conversation → Send follow-up

---

### State 6: Applying Suggestion

````
Chat Panel (Closing)              Main View (Updating)
┌────────────────────────┐   ┌──────────────────────────────────┐
│ ✓ Suggestion applied   │   │ Documentation    [💾 Save] [×]   │
│ Closing...             │   ├──────────────────────────────────┤
└────────────────────────┘   │ # User Authentication Domain     │
                             │                                  │
                             │ ## Overview                      │
                             │ This domain handles user...      │
                             │                                  │
                             │ ## Login Flow Examples ← NEW!    │
                             │                                  │
                             │ ### Basic Login                  │
                             │ ```javascript                    │
                             │ const user = await login({       │
                             │   email: "user@example.com",     │
                             │   password: "secure123"          │
                             │ });                              │
                             │ ```                              │
                             │                                  │
                             │ ### OAuth Login                  │
                             │ [... more content ...]           │
                             │                                  │
                             └──────────────────────────────────┘
````

**System State**:

- Chat panel closes
- Documentation updated with AI suggestion
- Edit mode active (Save/Cancel buttons visible)
- User can save or continue editing

---

## Visual Design Breakdown

### Color System

**Primary Colors**:

- **Purple** (#9333EA): AI features, assistant icon
- **Blue** (#3B82F6): User messages, primary actions
- **Green** (#10B981): Apply/Save actions
- **Gray** (#6B7280): Secondary text, borders

**Semantic Colors**:

- **Info**: Blue background (#EFF6FF)
- **Success**: Green accents
- **AI**: Purple gradients

### Typography

**Headings**:

- Chat title: Medium (18px), SemiBold
- Message role: Extra Small (12px), Medium

**Body Text**:

- Messages: Small (14px), Regular
- Timestamps: Extra Small (11px), Regular
- Hints: Extra Small (12px), Regular

### Spacing

**Panel Layout**:

- Header padding: 24px (px-6, py-4)
- Message gap: 16px (gap-4)
- Section padding: 24px horizontal

**Message Bubbles**:

- Internal padding: 12px
- Border radius: 8px
- Max width: 85% of panel

### Animations (Future)

- Panel slide-in: 300ms ease-out
- Message appear: Fade in 200ms
- Typing indicator: Pulse animation
- Button hover: Scale 1.05

---

## Responsive Behavior

### Desktop (>768px)

- Chat panel: Fixed 600px width
- Slides in from right
- Main content remains visible (dimmed)

### Tablet (768px - 1024px)

- Chat panel: Fixed 500px width
- Overlays main content fully
- Backdrop overlay with close on click

### Mobile (<768px)

- Chat panel: Full screen (100vw)
- Slides up from bottom
- Header remains sticky
- Messages area scrollable

---

## Interaction Patterns

### Message Sending

**Desktop Flow**:

1. Type message
2. Press Enter OR click Send
3. Message appears instantly (optimistic UI)
4. AI response streams in (future) or appears complete

**Mobile Flow**:

1. Type message (keyboard opens)
2. Tap Send button
3. Keyboard closes
4. Message sent, response arrives

### Copy Message

**Interaction**:

1. Hover over message → Copy icon appears
2. Click copy icon
3. Icon changes to checkmark
4. Reverts after 2 seconds

### Apply Suggestion

**Interaction**:

1. AI message includes "Apply" button
2. Click "Apply this suggestion"
3. Button shows loading state
4. Success: Panel closes, documentation updates
5. Error: Show error message, keep panel open

---

## Accessibility Features

### Keyboard Navigation

| Key         | Action                          |
| ----------- | ------------------------------- |
| Enter       | Send message                    |
| Shift+Enter | New line in message             |
| Escape      | Close chat panel                |
| Tab         | Navigate between inputs/buttons |

### Screen Reader Support

- ARIA labels on all icon buttons
- Role="log" on messages area
- Live region for new messages
- Focus management on open/close

### Visual Accessibility

- ✅ 4.5:1 contrast ratio (WCAG AA)
- ✅ Focus indicators on all interactive elements
- ✅ Clear visual hierarchy
- ✅ No color-only information

---

## Edge Cases Handled

### Empty States

- No documentation → Show analyze button
- Empty chat → Show welcome message + prompts
- No internet → Show offline message

### Error States

- API failure → Show error in chat bubble
- Network timeout → Retry button
- Invalid response → Generic error message

### Loading States

- Sending message → Disable input
- Waiting for AI → "Thinking..." placeholder
- Applying changes → Button loading state

### Long Content

- Long messages → Auto-scroll to bottom
- Many messages → Virtual scrolling (future)
- Large suggestions → Syntax highlighting

---

## Implementation Notes

✅ **Complete**:

- Full UI component structure
- Responsive layout
- Color system and typography
- Keyboard shortcuts
- Copy functionality
- Sample prompts
- Loading states

⏳ **Pending Backend**:

- Real AI responses
- Streaming support
- Conversation persistence
- Apply suggestion logic
- Error handling from API

🔜 **Future Enhancements**:

- Typing indicators
- Read receipts
- Message reactions
- Voice input
- Diff preview before applying
- Multi-language support

---

## Component Architecture

```
AIDocumentationChat (Main Container)
├── Header
│   ├── Title & Icon
│   ├── Reset Button
│   └── Close Button
│
├── Context Banner (conditional)
│   └── Current documentation info
│
├── Messages Area (scrollable)
│   ├── Message Bubbles
│   │   ├── User Message
│   │   │   ├── Avatar
│   │   │   ├── Content (plain text)
│   │   │   ├── Timestamp
│   │   │   └── Copy Button
│   │   │
│   │   └── AI Message
│   │       ├── Avatar
│   │       ├── Content (Markdown)
│   │       ├── Apply Button (conditional)
│   │       ├── Timestamp
│   │       └── Copy Button
│   │
│   └── Loading Indicator (conditional)
│
├── Sample Prompts (conditional)
│   └── Quick action buttons
│
└── Input Area
    ├── Textarea
    ├── Help Text
    └── Send Button
```

---

**UI is production-ready! Time to build the backend! 🚀**
