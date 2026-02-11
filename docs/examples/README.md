# Code Examples

This folder contains examples demonstrating how to use the Codebase Analyzer API.

## Coming Soon

Examples will be added as features are implemented.

## API Endpoints

### Scan Codebase

```bash
curl -X POST http://localhost:3001/api/scan/request \
  -H "Content-Type: application/json" \
  -d '{"executeNow": true}'
```

### Analyze Module

```bash
curl -X POST http://localhost:3001/api/modules/user-auth/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "moduleName": "User Authentication",
    "files": ["src/auth/login.js", "src/auth/register.js"],
    "executeNow": true
  }'
```

### Get Module Analysis

```bash
curl http://localhost:3001/api/modules/user-auth
```

## See Also

- [Project Overview](../project/AGENTS.md)
- [Backend Architecture](../backend/architecture.md)
- [CLI Usage](../cli/CLI-USAGE.md)
