# Arhan CLI - Testing Guide

## Setup

1. **Add your OpenRouter API Key**:

   ```bash
   cd /app
   nano .env  # or vim .env
   # Replace "paste_your_key_here" with your actual key
   ```

2. **Verify Installation**:

   ```bash
   which arhan
   # Should output: /usr/local/bin/arhan

   arhan --help
   # Should show command options
   ```

## Test Scenarios

### Test 1: Basic File Reading

```bash
cd /tmp
mkdir test-project && cd test-project
echo "console.log('hello');" > index.js

arhan "read the index.js file and tell me what it does"
```

### Test 2: File Creation

```bash
cd /tmp/test-project
arhan "create a package.json file for a Node.js project called 'test-app'"
```

### Test 3: Directory Listing

```bash
cd /tmp/test-project
arhan "list all files in the current directory"
```

### Test 4: Command Execution

```bash
cd /tmp/test-project
arhan "run 'npm init -y' to initialize the project"
```

### Test 5: Complex Task with Multiple Steps

```bash
cd /tmp
mkdir express-app && cd express-app
arhan "create a simple Express.js server with one GET endpoint at /api/hello that returns JSON"
```

### Test 6: Conversation History

```bash
cd /tmp/express-app
arhan "add error handling to the server"
# The agent should remember the previous conversation about the Express server
```

### Test 7: Auto-Approve Mode

```bash
cd /tmp/test-project
arhan -y "add a README.md file with project description"
# Should execute without asking for confirmation
```

### Test 8: Different Model

```bash
arhan -m "meta-llama/llama-3.1-8b-instruct:free" "explain what this project does"
```

### Test 9: Clear History

```bash
arhan --clear
# Should clear conversation history
```

### Test 10: Dangerous Command (Should prompt)

```bash
cd /tmp/test-project
arhan "remove all .log files"
# Should ask for extra confirmation
```

## Expected Behavior

✅ **Streaming**: You should see text appear in real-time, not all at once
✅ **Confirmations**: Writing files or running commands should ask Y/n
✅ **Tool Indicators**: Should show 🔧 Tool: [name] when using tools
✅ **Colors**:

- Cyan for agent thinking
- Blue for tool info
- Green for success
- Red for errors
- Dim for tool output

✅ **History**: `.arhan_history.json` should be created in the working directory

## Troubleshooting

### If the agent is slow:

- Try a faster model: `arhan -m "google/gemini-flash-1.5" "your task"`

### If you get rate limit errors:

- Wait a few seconds between requests
- Check OpenRouter dashboard for limits

### If conversation gets confused:

```bash
arhan --clear  # Start fresh
```

### To see what the agent is doing:

```bash
# Watch the history file
watch -n 1 cat .arhan_history.json
```

## Real-World Use Cases

### Debugging

```bash
cd /path/to/your/project
arhan "find why the server returns 500 error on /api/users"
```

### Code Generation

```bash
arhan "create a React component for a user profile card with props"
```

### Refactoring

```bash
arhan "refactor index.js to use async/await instead of callbacks"
```

### Testing

```bash
arhan "write unit tests for the calculator.js file"
```

### Documentation

```bash
arhan "add JSDoc comments to all functions in utils.js"
```

## Performance Tips

1. **Be Specific**: "Fix the CORS error in server.js" is better than "fix the bug"
2. **Use Context**: Let the agent read files first with commands like "read X then do Y"
3. **Limit Scope**: "Add error handling to login.js" vs "improve the entire codebase"
4. **Clear History**: If working on a new unrelated task, use `--clear`

## Free vs Paid Models

### Free Models (Good for testing)

- `google/gemini-flash-1.5` - Fast, good for simple tasks
- `meta-llama/llama-3.1-8b-instruct:free` - Decent for basic coding

### Paid Models (Better quality)

- `anthropic/claude-3.5-sonnet` - Best for complex refactoring
- `openai/gpt-4-turbo` - Great for code generation
- Cost: ~$0.003-0.015 per request depending on length

## Safety Notes

⚠️ **Always review changes before deploying to production**
⚠️ **Use `-y` flag carefully - it bypasses confirmations**
⚠️ **Test on sample projects first**
⚠️ **Keep backups or use version control (git)**

Enjoy coding with Arhan! 🚀
