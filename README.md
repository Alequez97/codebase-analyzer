# Codebase Analyzer

Codebase Analyzer is a web app for AI-assisted code audits, including bugs, security issues, and missing tests, with guided fix workflows.

## Run Locally

1. Install dependencies:

```bash
npm run install:all
```

2. Create backend env file:

```bash
cd backend
cp .env.example .env
```

3. Create frontend env file:

```bash
cd frontend
cp .env.example .env
```

4. Link the CLI command:

```bash
npm link
```

5. From the project you want to analyze, start the app:

```bash
code-analyzer
```

The CLI automatically finds open ports for backend and frontend and prints the exact URLs in the terminal.
