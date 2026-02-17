# Code Examples

This folder contains examples for the current domain-based API.

## API Endpoints

### Analyze Full Codebase

```bash
curl -X POST http://localhost:3001/api/analysis/codebase/request \
  -H "Content-Type: application/json" \
  -d '{"executeNow": true}'
```

### Analyze Domain Documentation

```bash
curl -X POST http://localhost:3001/api/analysis/domain/user-auth/analyze/documentation \
  -H "Content-Type: application/json" \
  -d '{
    "files": ["src/auth/login.js", "src/auth/register.js"],
    "executeNow": true
  }'
```

### Get Domain Documentation

```bash
curl http://localhost:3001/api/analysis/domain/user-auth/documentation
```

## See Also

- [Backend Architecture](../backend/architecture.md)
- [CLI Usage](../cli/CLI-USAGE.md)
