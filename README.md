# lowkeyarhan

> An autonomous AI coding agent CLI that helps you write code, fix bugs, and explore your codebase directly from the terminal. Features a beautiful Claude Code-inspired UI with streaming responses and intelligent tool execution.

[![npm version](https://img.shields.io/npm/v/lowkeyarhan)](https://www.npmjs.com/package/lowkeyarhan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

### 🤖 **Autonomous AI Agent**

- **Intelligent Problem-Solving**: Uses advanced reasoning to break down complex tasks into manageable steps
- **Context-Aware**: Reads files, explores directories, and understands your codebase structure
- **Self-Verifying**: Automatically verifies changes and iterates until tasks are complete
- **Tool Calling**: Seamlessly integrates file operations, command execution, and code analysis

### 🎨 **Beautiful Terminal UI**

- **Claude Code-Inspired Design**: Coral and blue color scheme with clean, minimal interface
- **Real-Time Streaming**: Watch the agent think and work in real-time as it processes your requests
- **Loading Indicators**: Visual feedback with spinners during processing
- **Concise Output**: Summarized tool results to keep the interface clean and readable

### 🛠️ **Built-in Tools**

- **`read_file`**: Read file contents (with 1MB size limit warning)
- **`write_file`**: Create or modify files (auto-creates directories)
- **`list_files`**: Explore directory structures (supports recursive listing)
- **`run_command`**: Execute shell commands (npm, git, tests, builds, etc.)

### 💾 **Conversation Management**

- **Persistent History**: Maintains context across sessions via JSON history files
- **Session Continuity**: Remembers previous interactions for better context
- **History Control**: Clear history with `--clear` flag or custom history file paths

### ⚙️ **Flexible Configuration**

- **Multiple Config Methods**: Environment variables, local `.env`, or global config
- **Model Selection**: Choose from any OpenRouter-supported model (default: Gemini 2.0 Flash)
- **Auto-Approval**: Skip confirmations with `-y` flag for automated workflows
- **Iteration Limits**: Control maximum iterations to prevent infinite loops

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g lowkeyarhan
```

### Local Installation

```bash
npm install lowkeyarhan
npx lowkeyarhan "Your task here"
```

### Requirements

- **Node.js**: >= 18.0.0
- **OpenRouter API Key**: Get yours at [openrouter.ai/keys](https://openrouter.ai/keys)

## 🚀 Quick Start

### 1. Get Your API Key

Sign up at [OpenRouter](https://openrouter.ai/) and get your API key from the [keys page](https://openrouter.ai/keys).

### 2. Configure API Key

Choose one of these methods:

**Option A: Environment Variable**

```bash
export OPENROUTER_API_KEY=your_api_key_here
```

**Option B: Local `.env` File**

```bash
# Create .env in your project directory
echo "OPENROUTER_API_KEY=your_api_key_here" > .env
```

**Option C: Global Config (Recommended)**

```bash
# Create global config directory
mkdir -p ~/.lowkeyarhan

# Create .env file
cat > ~/.lowkeyarhan/.env << EOF
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
EOF
```

### 3. Run Your First Task

```bash
lowkeyarhan "Create a simple hello world script in Node.js"
```

## 📖 Usage

### Basic Usage

```bash
# Run a task (interactive prompt if no task provided)
lowkeyarhan "Your task description here"

# Interactive mode (no arguments)
lowkeyarhan
```

### Command-Line Options

```bash
# Auto-approve all tool executions (no prompts)
lowkeyarhan -y "Create multiple files"

# Use a specific model
lowkeyarhan -m "meta-llama/llama-3.3-70b-instruct:free" "Your task"

# Set maximum iterations (default: 20)
lowkeyarhan --max-iterations 50 "Complex task"

# Clear conversation history
lowkeyarhan --clear

# Use custom history file
lowkeyarhan --history .custom_history.json "Task"

# Show help
lowkeyarhan --help

# Show version
lowkeyarhan --version
```

### Configuration Options

All configuration can be set via environment variables or `.env` files:

| Variable             | Description             | Default                            |
| -------------------- | ----------------------- | ---------------------------------- |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | **Required**                       |
| `OPENROUTER_MODEL`   | Model to use            | `google/gemini-2.0-flash-exp:free` |
| `APP_NAME`           | App name for OpenRouter | `lowkeyarhan`                      |
| `APP_URL`            | App URL for OpenRouter  | `http://localhost`                 |

**Configuration Priority** (highest to lowest):

1. Command-line arguments (`-m`, `--max-iterations`)
2. Local `.env` file (project directory)
3. Global `.env` file (`~/.lowkeyarhan/.env`)
4. Environment variables
5. Default values

## 💡 Examples

### File Operations

```bash
# Create new files
lowkeyarhan "Create a README.md with project documentation"

# Modify existing files
lowkeyarhan "Add error handling to all async functions in src/"

# Batch operations
lowkeyarhan "Create a config.json, .gitignore, and package.json for a Node.js project"
```

### Code Analysis & Refactoring

```bash
# Find and fix issues
lowkeyarhan "Find all TODO comments and create a TODO.md file listing them"

# Code explanation
lowkeyarhan "Explain what the Agent class does and how it works"

# Refactoring
lowkeyarhan "Refactor all callback-based functions to use async/await"
```

### Project Setup

```bash
# Initialize projects
lowkeyarhan "Set up a new Express.js API with TypeScript, ESLint, and Jest"

# Add dependencies
lowkeyarhan "Add authentication middleware using JWT to the Express app"

# Configure tools
lowkeyarhan "Set up Prettier and ESLint with TypeScript support"
```

### Testing & Debugging

```bash
# Write tests
lowkeyarhan "Create unit tests for all functions in utils.js"

# Fix bugs
lowkeyarhan "Fix the memory leak in the data processing function"

# Debug issues
lowkeyarhan "Find why the API endpoint returns 500 errors"
```

### Documentation

```bash
# Generate docs
lowkeyarhan "Create comprehensive JSDoc comments for all exported functions"

# Update README
lowkeyarhan "Update README.md with installation and usage instructions"
```

## 🎯 How It Works

### Architecture

```
┌─────────────────┐
│   CLI Entry     │  (index.ts)
│   - Parsing     │
│   - Config      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Agent Core    │  (agent.ts)
│   - LLM Calls   │
│   - Tool Exec   │
│   - Reasoning   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Tools  │ │ History  │
│        │ │ Manager  │
└────────┘ └──────────┘
```

### Workflow

1. **Task Input**: User provides a task via CLI argument or interactive prompt
2. **Context Loading**: Agent loads conversation history (if exists)
3. **Analysis**: Agent analyzes the task and breaks it down into steps
4. **Tool Execution**: Agent calls appropriate tools (read_file, write_file, etc.)
5. **User Confirmation**: User approves tool executions (unless `-y` flag)
6. **Verification**: Agent verifies changes and iterates if needed
7. **Completion**: Task marked complete, history saved

### Problem-Solving Methodology

The agent follows a systematic approach:

1. **Analyze First**: Break down complex tasks, identify requirements
2. **Gather Context**: Read relevant files, understand codebase structure
3. **Reason Logically**: Apply systematic thinking, consider edge cases
4. **Execute Precisely**: Make incremental changes, verify each step
5. **Verify & Iterate**: Confirm correctness, fix issues, complete task

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- TypeScript (installed as dev dependency)

### Setup

```bash
# Clone the repository
git clone https://github.com/lowkeyarhan/custom-CLI-agent.git
cd custom-CLI-agent

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
node dist/index.js "Your task here"
```

### Development Scripts

```bash
# Build TypeScript
npm run build

# Build and run
npm run dev "Task here"

# Run compiled version
npm start "Task here"

# Watch mode (rebuild on changes)
npm run watch

# Run tests
npm test

# Simple test
npm run test:simple
```

### Testing Locally

```bash
# Link globally for testing
npm link

# Test the CLI
lowkeyarhan "Test task"

# Unlink when done
npm unlink -g lowkeyarhan
```

### Project Structure

```
custom-CLI-agent/
├── src/
│   ├── index.ts      # CLI entry point, argument parsing
│   ├── agent.ts      # Core agent logic, LLM interaction
│   ├── tools.ts      # Tool implementations (read/write/list/run)
│   ├── history.ts    # Conversation history management
│   ├── ui.ts         # Terminal UI rendering
│   └── types.ts      # TypeScript type definitions
├── dist/             # Compiled JavaScript (generated)
├── .github/          # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml           # Continuous Integration
│       ├── publish.yml      # Auto-publish to npm
│       └── test-basic.yml   # Basic test workflow
├── package.json      # Project configuration
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## 🔧 Troubleshooting

### Common Issues

**"OPENROUTER_API_KEY environment variable is required"**

- Make sure you've set the API key in one of the config methods
- Check that your `.env` file is in the correct location
- Verify the environment variable is exported: `echo $OPENROUTER_API_KEY`

**"Provider returned error" or "404 No endpoints found"**

- The model might be unavailable or the name is incorrect
- Try a different model: `lowkeyarhan -m "google/gemini-flash-1.5" "Task"`
- Check [OpenRouter models](https://openrouter.ai/models) for available options

**Agent describes actions but doesn't execute them**

- This is handled automatically - the agent will retry with tool calls
- If it persists, try a different model (Gemini models work best)
- Check the conversation history for context issues

**Tool execution fails**

- Verify file permissions in your project directory
- Check that commands exist in your PATH
- Review the error message for specific issues

**History file issues**

- History is stored in `.arhan_history.json` by default
- Use `--clear` to reset if history is corrupted
- Specify custom path with `--history` option

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/lowkeyarhan/custom-CLI-agent/issues)
- **Documentation**: Check the docs in the repository
- **OpenRouter**: [OpenRouter Docs](https://openrouter.ai/docs)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing access to multiple LLM models
- **Claude Code** for UI design inspiration
- **OpenAI SDK** for the excellent API client
- All the amazing open-source libraries that make this possible

## 📚 Additional Documentation

- [TESTING.md](TESTING.md) - Local testing guide
- [RELEASE.md](RELEASE.md) - Release and versioning guide
- [GITHUB_SETUP.md](GITHUB_SETUP.md) - CI/CD setup instructions
- [AUTO_DEPLOY_SUMMARY.md](AUTO_DEPLOY_SUMMARY.md) - Automated deployment overview

---

**Made with ❤️ by [Arhan Dash](https://github.com/lowkeyarhan)**

For questions, suggestions, or feedback, please [open an issue](https://github.com/lowkeyarhan/custom-CLI-agent/issues).
