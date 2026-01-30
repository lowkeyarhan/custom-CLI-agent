# Arhan Architecture

## Overview

Arhan is a CLI-based autonomous AI coding agent that uses the ReAct (Reasoning + Acting) pattern to help with coding tasks. It's built with TypeScript and Node.js, designed to work like Claude Code but in the terminal.

## Tech Stack

### Core Technologies

- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment (>=18.0.0)
- **OpenRouter API**: Multi-model LLM access
- **OpenAI SDK**: Client library configured for OpenRouter

### CLI Libraries

- **commander**: Command-line argument parsing
- **inquirer**: Interactive prompts for user confirmation
- **ora**: Elegant terminal spinners
- **chalk**: Colorful terminal output
- **dotenv**: Environment variable management

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Entry Point                      │
│                   (src/index.ts)                        │
│  • Parses arguments                                     │
│  • Validates API key                                    │
│  • Initializes Agent                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Agent Core                           │
│                  (src/agent.ts)                         │
│  • Manages ReAct loop                                   │
│  • Streams LLM responses                                │
│  • Executes tool calls                                  │
│  • Handles confirmations                                │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐  ┌───────────────────────────┐
│   History Manager      │  │     Tool Executor         │
│  (src/history.ts)      │  │    (src/tools.ts)         │
│  • Load/save context   │  │  • read_file              │
│  • Manage messages     │  │  • write_file             │
│  • Persist to JSON     │  │  • list_files             │
└────────────────────────┘  │  • run_command            │
                            └───────────────────────────┘
```

## Key Components

### 1. CLI Entry Point (`src/index.ts`)

- Parses command-line arguments using Commander
- Validates environment variables (API key)
- Creates and initializes the Agent
- Handles errors gracefully

### 2. Agent Core (`src/agent.ts`)

**Responsibilities:**

- Manages the ReAct loop (Reason → Act → Observe)
- Communicates with OpenRouter API
- Streams responses in real-time
- Parses tool calls from LLM responses
- Requests user confirmation for dangerous operations
- Coordinates between history and tools

**Key Methods:**

- `initialize()`: Loads conversation history
- `run(userMessage)`: Main entry point for task execution
- `executeIteration()`: Single ReAct loop iteration
- `executeToolCall()`: Runs a tool and handles confirmation

### 3. History Manager (`src/history.ts`)

**Responsibilities:**

- Persists conversation context to disk
- Loads previous conversations
- Manages message array
- Enables context retention across sessions

**Storage Format:**

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." },
    { "role": "tool", "content": "...", "tool_call_id": "..." }
  ],
  "timestamp": "2025-01-30T16:47:00.000Z"
}
```

### 4. Tool Executor (`src/tools.ts`)

**Available Tools:**

1. **read_file**
   - Reads file contents
   - Warns if file > 1MB
   - Returns error if file doesn't exist

2. **write_file**
   - Creates or overwrites files
   - Auto-creates parent directories
   - Requires user confirmation

3. **list_files**
   - Lists directory contents
   - Supports recursive listing
   - Configurable depth limit

4. **run_command**
   - Executes shell commands
   - Captures stdout/stderr
   - Requires user confirmation
   - Extra prompt for dangerous commands

### 5. Type Definitions (`src/types.ts`)

Strict TypeScript interfaces for:

- Tool schemas
- Tool calls and results
- Message format
- Configuration
- Conversation history

## Data Flow

### Typical Request Flow:

```
1. User runs: arhan "fix bug in server.js"
                ↓
2. CLI parses arguments, validates API key
                ↓
3. Agent loads conversation history
                ↓
4. Agent adds user message to history
                ↓
5. Agent starts ReAct loop:
   a. Sends messages to OpenRouter
   b. Streams response to terminal
   c. Detects tool calls in response
   d. For each tool call:
      - Display tool info
      - Ask for confirmation (if needed)
      - Execute tool
      - Add result to history
   e. Continue loop if tool was called
   f. Exit loop if no tool calls (task complete)
                ↓
6. Save conversation history to disk
                ↓
7. Display completion message
```

## OpenRouter Integration

### Configuration

```typescript
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost",
    "X-Title": process.env.APP_NAME || "Arhan CLI",
  },
});
```

### Streaming

- Uses `stream: true` in API calls
- Processes chunks in real-time
- Handles both text content and tool calls
- Provides instant feedback to user

### Function Calling

- Tools defined with OpenAI-compatible schemas
- LLM decides when to use tools
- Supports multiple tool calls per response
- Parses JSON arguments safely

## Safety Features

### 1. Human-in-the-Loop

- Confirms before writing files
- Confirms before running commands
- Extra confirmation for dangerous operations
- Can be bypassed with `-y` flag

### 2. Dangerous Operation Detection

```typescript
const isDangerous = (command: string) => {
  const cmd = command.toLowerCase();
  return (
    cmd.includes("rm ") || cmd.includes("delete") || cmd.includes("remove")
  );
};
```

### 3. File Size Protection

- Warns before reading files > 1MB
- Prevents memory issues with large files

### 4. Error Handling

- Graceful API error handling
- Tool execution error recovery
- JSON parsing safeguards

## Performance Optimizations

### 1. Streaming Responses

- Shows text as it's generated
- No waiting for complete response
- Better user experience

### 2. Efficient History Management

- Loads only when needed
- Saves after each iteration
- JSON format for easy debugging

### 3. Command Buffering

- 10MB buffer for command output
- Prevents hanging on large outputs

## Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-...    # Required
OPENROUTER_MODEL=...             # Optional (default: google/gemini-flash-1.5)
APP_NAME=...                     # Optional (default: Arhan CLI)
APP_URL=...                      # Optional (default: http://localhost)
```

### Runtime Options

- `--yes`: Auto-approve mode
- `--model`: Override model
- `--max-iterations`: Limit loop iterations
- `--history`: Custom history file path
- `--clear`: Clear conversation history

## Extension Points

### Adding New Tools

1. Add tool schema to `tools` array in `src/tools.ts`
2. Implement tool function
3. Add case to `executeTool()` switch
4. Update types if needed

### Custom Models

- Any OpenRouter-compatible model works
- Just specify with `-m` or `OPENROUTER_MODEL`

### Custom Confirmations

- Modify `needsConfirmation()` in `src/agent.ts`
- Add custom logic for specific tools or patterns

## Build & Distribution

### Build Process

```bash
npm run build
# TypeScript compiles src/ → dist/
# Creates .d.ts files for type definitions
# Preserves shebang in index.js
```

### Global Installation

```bash
npm link
# Creates symlink: /usr/local/bin/arhan → /app/dist/index.js
# Makes 'arhan' available globally
```

### Package Distribution

```bash
npm pack
# Creates arhan-1.0.0.tgz
# Can be published to npm or distributed directly
```

## Testing Strategy

### Manual Testing

1. File operations (read, write, list)
2. Command execution
3. Multi-step tasks
4. Conversation continuity
5. Error handling
6. Confirmation prompts

### Test Project Setup

```bash
mkdir test-project
cd test-project
arhan "create a simple Node.js app"
```

## Comparison to Claude Code

### Similarities

✅ Autonomous agent behavior
✅ Conversation history
✅ Read/write files
✅ Execute commands
✅ Multi-step task completion

### Differences

- **Interface**: CLI vs VSCode extension
- **Context**: Terminal-based vs IDE-integrated
- **Portability**: Works anywhere vs VSCode-only
- **Setup**: Simple npm install vs extension install

## Future Enhancements

### Potential Features

- [ ] Web search tool integration
- [ ] Git integration (commit, diff, etc.)
- [ ] Database query tool
- [ ] HTTP request tool
- [ ] Code analysis tool (AST parsing)
- [ ] Project scaffolding templates
- [ ] Multi-file editing (batch operations)
- [ ] Undo/redo capability
- [ ] Integration with CI/CD

### Performance Improvements

- [ ] Parallel tool execution
- [ ] Response caching
- [ ] Incremental file reading
- [ ] Diff-based file updates

## Troubleshooting

### Common Issues

1. **"Command not found: arhan"**
   - Run `npm link` in `/app`
   - Check PATH includes npm global bin

2. **"OPENROUTER_API_KEY required"**
   - Set in `.env` file
   - Or export in shell

3. **Rate limiting**
   - OpenRouter free tier limits
   - Wait between requests
   - Use paid models for higher limits

4. **Large file warnings**
   - Files > 1MB can cause issues
   - Read specific sections instead
   - Use streaming for large files

5. **Context confusion**
   - Clear history: `arhan --clear`
   - Start fresh conversation

## Development

### Watch Mode

```bash
npm run watch
# Auto-rebuilds on file changes
```

### Testing Changes

```bash
npm run build && arhan "test task"
```

### Debugging

- Check history file: `cat .arhan_history.json`
- Add console.logs in src/
- Rebuild and test

## License

MIT

---

Built with ❤️ for autonomous coding assistance
