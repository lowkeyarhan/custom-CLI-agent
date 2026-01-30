# lowkeyarhan

A CLI coding agent that helps you write code, fix bugs, and explore your codebase directly from the terminal.

✨ **Features a beautiful coral & blue UI inspired by Claude Code**

## Installation

```bash
npm install -g lowkeyarhan
```

## Quick Start

```bash
# Set your API key
export OPENROUTER_API_KEY=your_key_here

# Run a task
lowkeyarhan "Create a simple HTTP server in Node.js"
```

## Configuration

### Option 1: Environment Variable

```bash
export OPENROUTER_API_KEY=your_key_here
```

### Option 2: Local .env file

```bash
# Create .env in your project directory
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
```

### Option 3: Global .env file

```bash
# Create ~/.lowkeyarhan/.env for global configuration
mkdir -p ~/.lowkeyarhan
echo "OPENROUTER_API_KEY=your_key_here" > ~/.lowkeyarhan/.env
```

## Usage

```bash
# Basic usage
lowkeyarhan "Your task here"

# Auto-approve all actions (no prompts)
lowkeyarhan -y "Create multiple files"

# Use a different model
lowkeyarhan -m "google/gemini-2.0-flash-lite-preview-02-05:free" "Your task"

# Clear conversation history
lowkeyarhan --clear

# Show help
lowkeyarhan --help
```

## Features

- **🎨 Claude Code UI**: Beautiful coral & blue color scheme with clean, minimal design
- **✨ Streaming responses**: Watch the agent think and work in real-time
- **🤖 Autonomous**: Reads files, writes code, and executes commands to achieve goals
- **🔒 Interactive confirmations**: Review and approve tool executions
- **💾 Conversation history**: Maintains context across sessions
- **🛠️ Built-in tools**:
  - `read_file`: Read file contents
  - `write_file`: Create or modify files
  - `list_files`: List directory contents
  - `run_command`: Execute shell commands

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js "Your task here"

# Link globally for testing
npm link
lowkeyarhan "Test task"
npm unlink -g lowkeyarhan
```

## Examples

```bash
# File operations
lowkeyarhan "Create a README.md with project documentation"
lowkeyarhan "Add error handling to all functions in src/"

# Code analysis
lowkeyarhan "Find and fix all TODO comments in the codebase"
lowkeyarhan "Explain what the Agent class does"

# Project setup
lowkeyarhan "Set up a new Express.js project with TypeScript"
```

## UI Preview

The CLI features a beautiful Claude Code-inspired interface:

```
* Welcome to lowkeyarhan!

  Model: llama-3.3-70b-instruct:free
  Auto-approve: disabled

* Task
  ────────────────────────────────────────────────────────────
  Create a file named hello.txt
  ────────────────────────────────────────────────────────────

* Thinking...

  I'll create the file using the write_file tool...

* Write File
    path: hello.txt
    content: <12 chars>

  ✓ Success
    File created successfully

* Complete
  ✓ Task completed successfully
```

See [CLAUDE_CODE_UI.md](CLAUDE_CODE_UI.md) for full color palette and design details.

## License

MIT
