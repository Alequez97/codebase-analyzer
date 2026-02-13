# Aider Configuration Guide

This backend supports configurable Aider settings through environment variables, making it easy to switch between models and API providers without changing code.

## Quick Start

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your preferred model and API key

3. Restart the backend server

## Configuration Options

### Model Selection

Set `LLM_MODEL` to choose which AI model to use:

```bash
# Use DeepSeek via DeepSeek's API
LLM_MODEL=deepseek

# Use Claude 3.7 Sonnet via Anthropic's API
LLM_MODEL=sonnet

# Use o3-mini via OpenAI's API
LLM_MODEL=o3-mini

# Use Claude via OpenRouter
LLM_MODEL=openrouter/anthropic/claude-3.7-sonnet

# Use DeepSeek via OpenRouter
LLM_MODEL=openrouter/deepseek/deepseek-chat
```

### API Keys

Set the appropriate API key for your chosen provider:

```bash
# For DeepSeek models
DEEPSEEK_API_KEY=your-deepseek-key-here

# For Claude/Sonnet models
ANTHROPIC_API_KEY=your-anthropic-key-here

# For OpenAI models
OPENAI_API_KEY=your-openai-key-here

# For any OpenRouter model
OPENROUTER_API_KEY=your-openrouter-key-here
```

### Extra Arguments

Pass additional flags to Aider:

```bash
# Example: disable auto-commits and enable dark mode
AGENT_EXTRA_ARGS=--no-auto-commits --dark-mode
```

## Examples

### Example 1: DeepSeek via Direct API

```bash
LLM_MODEL=deepseek
DEEPSEEK_API_KEY=sk-1234567890abcdef
```

### Example 2: Claude via Anthropic

```bash
LLM_MODEL=sonnet
ANTHROPIC_API_KEY=sk-ant-1234567890abcdef
```

### Example 3: DeepSeek via OpenRouter

```bash
LLM_MODEL=openrouter/deepseek/deepseek-chat
OPENROUTER_API_KEY=sk-or-1234567890abcdef
```

### Example 4: Multiple Providers (switching between them)

```bash
# Set all your keys once
DEEPSEEK_API_KEY=sk-1234567890abcdef
ANTHROPIC_API_KEY=sk-ant-1234567890abcdef
OPENROUTER_API_KEY=sk-or-1234567890abcdef

# Just change the model to switch providers
LLM_MODEL=deepseek          # Uses DEEPSEEK_API_KEY
# LLM_MODEL=sonnet          # Uses ANTHROPIC_API_KEY
# LLM_MODEL=openrouter/...  # Uses OPENROUTER_API_KEY
```

## How It Works

The backend automatically:

1. Reads `LLM_MODEL` to determine which model to use
2. Detects which API provider the model needs
3. Adds the appropriate `--api-key provider=key` flag to the Aider command
4. Passes any extra arguments from `AGENT_EXTRA_ARGS`

This means you can easily switch between models by just changing `LLM_MODEL` in your `.env` file without restarting or reconfiguring.

## Getting API Keys

- **DeepSeek**: https://platform.deepseek.com/api_keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **OpenAI**: https://platform.openai.com/api-keys
- **OpenRouter**: https://openrouter.ai/keys

## Troubleshooting

### "Aider not detected"

Make sure Aider is installed and in your PATH:

```bash
aider --version
```

Install Aider: https://aider.chat/docs/install.html

### "API key not configured"

Check that:

1. You've set the correct API key environment variable in `.env`
2. The key matches the provider for your chosen model
3. You've restarted the backend server after changing `.env`
