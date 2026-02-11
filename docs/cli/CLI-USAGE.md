# Code Analyzer CLI - Usage Guide

## Installation

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd codebase-analyzer

# Install dependencies
npm run install:all

# Link the CLI globally for development
npm link
```

### Global Installation (Coming Soon)

```bash
npm install -g codebase-analyzer
```

## Usage

Navigate to your project directory and run:

```bash
cd /path/to/your/project
code-analyzer start
```

This will:

1. Start the Code Analyzer server
2. Create a `.code-analysis/` folder in your project for output files
3. Open the web dashboard at `http://localhost:3001`

## Configuration

Create a `.env` file in the `backend/` folder (copy from `.env.example`):

```bash
# Required: Set your AI provider API key
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
# or
DEEPSEEK_API_KEY=sk-...

# Optional: Choose your AI model
AIDER_MODEL=sonnet
# Options: sonnet, gpt-4, deepseek, etc.

# Optional: Server port
PORT=3001
```

## Project Structure

When you run the analyzer, it creates this structure in your project:

```
your-project/
├── .code-analysis/           # Created by the analyzer
│   ├── scan-results.json     # Discovered modules
│   ├── modules/              # Detailed analysis per module
│   │   ├── auth-module.json
│   │   └── api-module.json
│   └── tasks/
│       ├── pending/          # Queued analysis tasks
│       └── completed/        # Finished tasks
├── src/                      # Your actual project files
└── package.json
```

## Commands

```bash
# Start the analyzer
code-analyzer start

# Show help
code-analyzer help
```

## Features

- **Automatic Module Discovery**: Scans your codebase and identifies functional modules
- **Deep Analysis**: Per-module analysis for bugs, security issues, and requirements
- **Real-time Updates**: WebSocket-based progress tracking
- **AI-powered**: Leverages Aider or other AI coding assistants

## Web Dashboard

Once started, open `http://localhost:3001` to:

- View discovered modules
- Trigger scans
- Monitor analysis progress
- Review findings

## Adding to .gitignore

Add this to your project's `.gitignore`:

```
# Code Analyzer output
.code-analysis/
```

## Troubleshooting

### "Aider not found"

Install Aider: `pip install aider-chat`

### "No API key"

Set your API key in `backend/.env`

### Port already in use

Change the PORT in `backend/.env`
