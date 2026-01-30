# Arhan - AI Coding Agent CLI

🤖 Your autonomous coding assistant in the terminal. Arhan is a CLI tool powered by AI that can read files, write code, and execute commands to help you with development tasks.

## Features

- 🎯 **Autonomous Agent**: Uses ReAct (Reason + Act) loop for intelligent task execution
- 💬 **Conversation History**: Maintains context across sessions like Claude Code
- ⚡ **Streaming Responses**: Real-time feedback as the AI thinks
- 🛠️ **Powerful Tools**: Read/write files, list directories, execute shell commands
- 🔒 **Safe by Default**: Asks for confirmation before making changes
- 🌐 **OpenRouter Integration**: Access to multiple AI models with one API key

## Installation

### Prerequisites
- Node.js >= 18.0.0
- An OpenRouter API key ([get one here](https://openrouter.ai/keys))

### Install Locally

```bash
# Clone and install dependencies
cd /app
npm install

# Build the project
npm run build

# Link globally
npm link
```

Now you can use `arhan` from anywhere!

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your OpenRouter API key:
```bash
OPENROUTER_API_KEY=your_api_key_here
```

## Usage

### Basic Usage

```bash
# Run a task
arhan "fix the bug in server.js"

# Auto-approve all actions (careful!)
arhan -y "add error handling to all API routes"

# Use a different model
arhan -m "anthropic/claude-3.5-sonnet" "refactor this code"

# Clear conversation history
arhan --clear
```

### Examples

```bash
# File operations
arhan "read the package.json and list all dependencies"
arhan "create a new README.md file with project documentation"

# Code generation
arhan "create a new Express API endpoint for user authentication"
arhan "add TypeScript types to all functions in utils.js"

# Debugging
arhan "find and fix the error causing the server to crash"
arhan "add logging to help debug the authentication flow"

# Refactoring
arhan "refactor the database connection code to use connection pooling"
arhan "split the large App.js file into smaller components"
```

### Command Options

- `-y, --yes` - Auto-approve all tool executions (no confirmations)
- `-m, --model <model>` - Specify OpenRouter model (default: google/gemini-flash-1.5)
- `--max-iterations <number>` - Maximum agent iterations (default: 20)
- `--clear` - Clear conversation history
- `--history <file>` - Custom history file location (default: .arhan_history.json)

## How It Works

Arhan uses a ReAct (Reasoning + Acting) loop:

1. **Understand**: The AI analyzes your request
2. **Plan**: Determines what tools to use
3. **Act**: Executes tools (with your approval)
4. **Observe**: Reviews the results
5. **Iterate**: Continues until the task is complete

### Available Tools

- `read_file` - Read file contents (warns if > 1MB)
- `write_file` - Create or modify files (auto-creates directories)
- `list_files` - List directory contents (supports recursive)
- `run_command` - Execute shell commands

## Safety Features

- ✅ Asks for confirmation before writing files
- ✅ Asks for confirmation before running commands
- ✅ Extra confirmation for dangerous operations (delete, remove, rm)
- ✅ File size warnings for large files
- ✅ Conversation history for accountability

## Models

### Free Models (Recommended for testing)
- `google/gemini-flash-1.5` (Default)
- `meta-llama/llama-3.1-8b-instruct:free`

### Paid Models (Higher quality)
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`
- `google/gemini-pro-1.5`

See [OpenRouter models](https://openrouter.ai/models) for the full list.

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run watch

# Run without installing globally
npm run dev -- "your task here"
```

## Conversation History

Arhan maintains conversation history in `.arhan_history.json` by default. This allows the AI to:
- Remember previous interactions
- Understand project context over time
- Make better decisions based on past actions

To clear history:
```bash
arhan --clear
```

## Troubleshooting

### "OPENROUTER_API_KEY environment variable is required"
- Make sure you have a `.env` file with your API key
- Or export it: `export OPENROUTER_API_KEY=your_key_here`

### "Command not found: arhan"
- Run `npm link` in the project directory
- Or use `npm run dev` to test without linking

### Agent is making too many iterations
- Use `--max-iterations` to limit
- Be more specific in your task description
- Clear history if context is confusing the agent

## License

MIT
