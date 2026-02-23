# Backend Implementation Checklist - AI Documentation Chat

## Quick Overview

This checklist outlines the backend work needed to make the AI Documentation Chat functional.
The frontend UI is complete and ready to integrate.

---

## Phase 1: Basic Chat Functionality

### Task 1: Create Chat API Endpoint

**File**: `backend/routes/domain/documentation.js`

```javascript
// Add new route
router.post("/:id/chat", async (req, res) => {
  const { id: domainId } = req.params;
  const { messages, currentDocumentation } = req.body;

  // TODO: Implement chat logic
  // 1. Validate request
  // 2. Call LLM API with conversation context
  // 3. Return AI response
});
```

**Acceptance Criteria**:

- [ ] Endpoint accepts POST requests
- [ ] Validates domainId exists
- [ ] Validates messages array
- [ ] Returns AI response in expected format

---

### Task 2: Create Chat Service

**File**: `backend/services/documentation-chat.js`

```javascript
export async function chatWithAI(domainId, messages, currentDocumentation) {
  // TODO: Implement
  // 1. Load domain context (files, existing docs)
  // 2. Build conversation prompt
  // 3. Call LLM API
  // 4. Process response
  // 5. Extract suggestions
  return {
    role: "assistant",
    content: "...",
    hasSuggestion: true,
    suggestedContent: "...",
  };
}
```

**Acceptance Criteria**:

- [ ] Builds proper prompt with context
- [ ] Calls LLM API (Claude/OpenAI/DeepSeek)
- [ ] Maintains conversation history
- [ ] Extracts structured suggestions
- [ ] Handles errors gracefully

---

### Task 3: Create Chat Instruction Template

**File**: `backend/instructions/edit-documentation-chat.md`

```markdown
# Edit Documentation with AI - Chat Instructions

## Your Role

You are an AI documentation assistant helping developers improve their codebase documentation.

## Current Context

- Domain: {{domainName}}
- Current Documentation:
  {{currentDocumentation}}

## Analyzed Files

{{#analyzedFiles}}

- {{.}}
  {{/analyzedFiles}}

## Conversation History

{{#messages}}
**{{role}}**: {{content}}
{{/messages}}

## Your Task

Respond to the user's latest request. If they ask for specific changes:

1. Acknowledge their request
2. Provide the updated documentation between these markers:

---NEW CONTENT START---
[Your updated markdown here]
---NEW CONTENT END---

3. Explain what you changed and why

## Guidelines

- Keep the same documentation structure
- Maintain markdown formatting
- Be concise but thorough
- Ask clarifying questions if needed
```

**Acceptance Criteria**:

- [ ] Template includes all necessary context
- [ ] Clear output format for parsing
- [ ] Handles both questions and edit requests

---

### Task 4: Update Frontend API Client

**File**: `frontend/src/api/domain-documentation.js`

```javascript
export async function sendChatMessage(
  domainId,
  messages,
  currentDocumentation,
) {
  const response = await client.post(
    `/api/analysis/domain/${domainId}/documentation/chat`,
    { messages, currentDocumentation },
  );
  return response.data;
}
```

**Acceptance Criteria**:

- [ ] Function sends correct payload
- [ ] Handles success responses
- [ ] Handles error responses
- [ ] Types are defined (if using TypeScript)

---

### Task 5: Update Chat Component to Use Real API

**File**: `frontend/src/components/domain/documentation/AIDocumentationChat.jsx`

Replace mock setTimeout with real API call:

```javascript
const handleSendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;

  const userMessage = {
    id: Date.now(),
    role: "user",
    content: inputMessage.trim(),
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInputMessage("");
  setIsLoading(true);

  try {
    // Build conversation history
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    conversationHistory.push({
      role: userMessage.role,
      content: userMessage.content,
    });

    // Call API
    const response = await sendChatMessage(
      domainId,
      conversationHistory,
      documentation?.content,
    );

    // Parse response
    const aiMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: response.content,
      timestamp: new Date(),
      hasSuggestion: response.hasSuggestion,
      suggestedContent: response.suggestedContent,
    };

    setMessages((prev) => [...prev, aiMessage]);
  } catch (error) {
    console.error("Chat error:", error);
    // Show error message to user
  } finally {
    setIsLoading(false);
  }
};
```

**Acceptance Criteria**:

- [ ] Removes mock setTimeout
- [ ] Calls real API endpoint
- [ ] Handles loading states
- [ ] Displays errors to user
- [ ] Parses AI suggestions correctly

---

## Phase 2: Applying Changes

### Task 6: Implement Apply Suggestion

**File**: `frontend/src/components/domain/documentation/AIDocumentationChat.jsx`

```javascript
const handleApplySuggestion = (message) => {
  if (!message.suggestedContent) {
    console.error("No suggested content in message");
    return;
  }

  // Pass to parent component
  onApplyChanges?.(message.suggestedContent);

  // Show success message
  toaster.create({
    title: "Documentation updated",
    description: "AI suggestions have been applied",
    type: "success",
  });
};
```

**Acceptance Criteria**:

- [ ] Extracts suggested content
- [ ] Calls parent's onApplyChanges
- [ ] Shows success toast
- [ ] Handles missing suggestions gracefully

---

### Task 7: Update Parent Component

**File**: `frontend/src/components/domain/DomainDocumentationSection.jsx`

```javascript
<AIDocumentationChat
  documentation={documentation}
  onClose={() => setIsChatOpen(false)}
  onApplyChanges={(newContent) => {
    // Update edited documentation
    onDocumentationChange?.(newContent);

    // Close chat
    setIsChatOpen(false);

    // Optionally: Auto-save or prompt user to save
  }}
/>
```

**Acceptance Criteria**:

- [ ] Applies changes to documentation state
- [ ] Closes chat after applying
- [ ] User can save changes via existing Save button

---

## Phase 3: State Management

### Task 8: Add Chat State to Zustand Store (Optional)

**File**: `frontend/src/store/analysisStore.js`

```javascript
// Add to store
chatMessages: new Map(), // domainId -> messages[]

// Actions
setChatMessages: (domainId, messages) => {
  const { chatMessages } = get();
  const updated = new Map(chatMessages);
  updated.set(domainId, messages);
  set({ chatMessages: updated });
},

addChatMessage: (domainId, message) => {
  const { chatMessages } = get();
  const current = chatMessages.get(domainId) || [];
  const updated = new Map(chatMessages);
  updated.set(domainId, [...current, message]);
  set({ chatMessages: updated });
},
```

**Acceptance Criteria**:

- [ ] Stores chat history per domain
- [ ] Persists in sessionStorage
- [ ] Restores on page reload

---

## Phase 4: Enhanced Features (Optional)

### Task 9: Support Streaming Responses

**File**: `backend/routes/domain/documentation.js`

Use Server-Sent Events (SSE) for real-time streaming:

```javascript
router.post("/:id/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Stream AI response chunks
  for await (const chunk of streamAIResponse(messages)) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.end();
});
```

**Acceptance Criteria**:

- [ ] Streams response as it's generated
- [ ] Updates UI in real-time
- [ ] Handles connection errors

---

### Task 10: Add Conversation Persistence

**File**: `backend/persistence/documentation-chat.js`

```javascript
export async function saveChatHistory(domainId, messages) {
  const chatPath = path.join(
    getProjectRoot(),
    ".code-analysis",
    "chats",
    `${domainId}.json`,
  );
  await fs.writeJSON(chatPath, { messages, timestamp: Date.now() });
}

export async function loadChatHistory(domainId) {
  // Load from file
}
```

**Acceptance Criteria**:

- [ ] Saves chat history to files
- [ ] Loads previous conversations
- [ ] Handles file not found

---

## Testing Checklist

### Unit Tests

- [ ] Chat service processes messages correctly
- [ ] Response parsing extracts suggestions
- [ ] Error handling works

### Integration Tests

- [ ] API endpoint returns valid responses
- [ ] Frontend displays AI messages
- [ ] Apply suggestion updates documentation
- [ ] Chat history persists

### Manual Testing

- [ ] Send multiple messages in sequence
- [ ] Apply a suggestion and verify update
- [ ] Close and reopen chat (history maintained)
- [ ] Test with different LLM providers
- [ ] Test error scenarios (network failure, etc.)

---

## Estimated Effort

| Task                         | Complexity | Estimated Time |
| ---------------------------- | ---------- | -------------- |
| Task 1: API Endpoint         | Low        | 30 min         |
| Task 2: Chat Service         | Medium     | 2 hours        |
| Task 3: Instruction Template | Low        | 45 min         |
| Task 4: API Client           | Low        | 15 min         |
| Task 5: Update Component     | Medium     | 1 hour         |
| Task 6-7: Apply Changes      | Low        | 30 min         |
| Task 8: Zustand Store        | Low        | 30 min         |
| Task 9: Streaming            | High       | 3 hours        |
| Task 10: Persistence         | Medium     | 1 hour         |
| **Total (Core Features)**    |            | **~5 hours**   |
| **Total (All Features)**     |            | **~9 hours**   |

---

## Dependencies

- Existing LLM client infrastructure (`backend/llm/clients/`)
- Template processor (`backend/utils/template-processor.js`)
- Domain analysis files (for context)

---

## Questions to Answer

1. **Which LLM provider should we prioritize?**
   - Claude (best for nuanced understanding)
   - OpenAI (GPT-4 for balanced performance)
   - DeepSeek (cost-effective)

2. **Should we persist chat history?**
   - Yes: Better UX, can resume conversations
   - No: Simpler implementation, less storage

3. **Streaming vs. Complete responses?**
   - Streaming: Better perceived performance
   - Complete: Easier to implement initially

4. **Rate limiting?**
   - Per user? Per domain? Global?
   - Suggested: 10 messages per domain per minute

---

## Next Steps

1. Review this checklist with the team
2. Decide on Phase 1 vs. Full implementation
3. Choose LLM provider and streaming approach
4. Assign tasks
5. Begin implementation
6. Test with real documentation

**UI is ready to go! Let's build the backend! 🚀**
