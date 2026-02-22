# Task: Generate Architecture Diagrams for Domain

You are analyzing a specific domain within a codebase to generate visual diagrams that illustrate the architecture, data flows, and component relationships.

## Context

- **Domain ID**: `{{domainId}}`
- **Target Directory**: `{{targetDirectory}}`
- **Files to Analyze**: {{files}}

## {{#if includeDocumentation}}

## Domain Documentation

The following documentation has been generated for this domain and provides context:

```
{{documentation}}
```

---

{{/if}}

## Your Task

Generate draw.io diagrams that visually represent the architecture, flows, and relationships within this domain. Create **3-5 diagrams** depending on the complexity:

### Required Diagrams

1. **Architecture Diagram**
   - Show all major components/modules in this domain
   - Display dependencies and connections between components
   - Include external systems/APIs if applicable
   - Label data flow directions

2. **Sequence Diagram** (for critical user flows)
   - Pick the most important user flow
   - Show the sequence of interactions between components
   - Include timing/ordering of operations
   - Highlight async operations or callbacks

3. **Data Flow Diagram**
   - Show how data moves through the system
   - Identify data transformations
   - Highlight validation points
   - Show data storage/retrieval

### Optional Diagrams (if applicable)

4. **Entity Relationship Diagram**
   - Only if domain involves data models
   - Show entity relationships
   - Include key fields

5. **State Machine Diagram**
   - Only if domain involves state transitions
   - Show states and transitions
   - Include triggers/conditions

## Output Format

Create **TWO types of outputs**:

### 1. Diagram Files (.drawio)

For each diagram, create a separate `.drawio` XML file in the diagrams directory:

- `architecture.drawio` - Architecture diagram
- `sequence-{flow-name}.drawio` - Sequence diagram(s)
- `data-flow.drawio` - Data flow diagram
- `entity-relationship.drawio` - (optional) ER diagram
- `state-machine.drawio` - (optional) State diagram

**Draw.io XML Format Guidelines:**

```xml
<mxfile host="app.diagrams.net">
  <diagram name="Diagram Name">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- Example: Rectangle component -->
        <mxCell id="2" value="Component Name" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>

        <!-- Example: Arrow/connector -->
        <mxCell id="3" value="Data Flow" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="2" target="4">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**Important Draw.io Guidelines:**

- Use clear, descriptive labels on all shapes
- Color-code components by type (e.g., frontend=blue, backend=green, database=orange)
- Use proper connectors with arrows to show direction
- Keep layout clean and readable
- Use standard shapes: rectangles for components, cylinders for databases, actors for users

### 2. Metadata File (metadata.json)

Create `metadata.json` in the diagrams directory with this structure:

```json
{
  "domainId": "{{domainId}}",
  "timestamp": "ISO-8601 timestamp",
  "diagrams": [
    {
      "id": "architecture",
      "title": "Authentication Architecture",
      "description": "High-level system architecture showing all components",
      "type": "architecture",
      "fileName": "architecture.drawio"
    },
    {
      "id": "login-sequence",
      "title": "Login Sequence Diagram",
      "description": "Step-by-step flow of the login process",
      "type": "sequence",
      "fileName": "sequence-login.drawio"
    }
  ]
}
```

**Diagram Types:**

- `"architecture"` - Component/system architecture
- `"sequence"` - Sequence/flow diagrams
- `"data-flow"` - Data flow diagrams
- `"entity-relationship"` - ER diagrams
- `"state-machine"` - State transition diagrams

## Analysis Guidelines

### 1. Understand the Domain First

- Read through all provided files
- Identify main components, modules, classes
- Map dependencies and imports
- Understand data models and types

### 2. Create Diagrams Progressively

- Start with the architecture diagram (overview)
- Then create sequence diagrams for critical flows
- Add data flow diagrams to show transformations
- Add optional diagrams only if they add value

### 3. Keep Diagrams Clear

- Don't overcrowd diagrams - split into multiple if needed
- Use consistent naming with the code
- Add helpful labels and descriptions
- Show only relevant details for each diagram type

### 4. Focus on Value

- Diagrams should clarify understanding, not duplicate code
- Highlight non-obvious patterns or flows
- Show architectural decisions and patterns
- Make complex interactions easier to understand

## File Organization

Save all outputs to: `.code-analysis/domains/{{domainId}}/diagrams/`

```
.code-analysis/
  domains/
    {{domainId}}/
      diagrams/
        metadata.json              # Metadata about all diagrams
        architecture.drawio        # Architecture diagram
        sequence-login.drawio      # Sequence diagram
        data-flow.drawio          # Data flow diagram
        entity-relationship.drawio # Optional ER diagram
        state-machine.drawio      # Optional state diagram
```

## Example: Authentication Domain

For a user authentication domain, you might create:

1. **architecture.drawio**
   - Shows: Frontend → API Gateway → Auth Service → Database
   - Includes: Token generation, session management
2. **sequence-login.drawio**
   - Shows: User clicks login → Form submit → API call → Validation → Token creation → Response
3. **data-flow.drawio**
   - Shows: User credentials → Validation → Hashing → Database query → Token generation → Response

4. **entity-relationship.drawio** (optional)
   - Shows: Users table, Sessions table, Tokens table and their relationships

## Important Notes

- **Generate valid draw.io XML** - It must be loadable in diagrams.net
- **Be specific** - Use actual component/file names from the code
- **Be accurate** - Diagrams should reflect actual code structure
- **Be concise** - Don't create unnecessary diagrams
- **Metadata is critical** - The UI relies on metadata.json to display diagrams

Good luck! Generate diagrams that make this domain's architecture crystal clear.
