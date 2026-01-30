# Arhan - Quick Reference

## Installation
```bash
cd /app
npm install
npm run build
npm link
```

## Setup API Key
Edit `/app/.env`:
```bash
OPENROUTER_API_KEY=your_actual_key_here
```

Get key: https://openrouter.ai/keys

## Basic Commands

```bash
# Simple task
arhan "your task here"

# Auto-approve everything
arhan -y "your task"

# Use different model
arhan -m "anthropic/claude-3.5-sonnet" "task"

# Clear conversation history
arhan --clear

# Custom history file location
arhan --history ~/my-project/.history.json "task"

# Limit iterations
arhan --max-iterations 10 "task"
```

## Quick Examples

```bash
# Read & analyze
arhan "read package.json and list all dependencies"

# Create files
arhan "create a .gitignore file for Node.js"

# Modify code
arhan "add error handling to server.js"

# Run commands
arhan "run npm install express"

# Debug
arhan "find the bug causing the server crash"

# Refactor
arhan "split App.js into smaller components"

# Document
arhan "add comments to all functions in utils.js"

# Test
arhan "write tests for the auth module"
```

## Free Models

- `google/gemini-flash-1.5` (default) - Fast & free
- `meta-llama/llama-3.1-8b-instruct:free` - Alternative free option

## Tips

✅ Be specific with tasks
✅ Let it read files first for context
✅ Use `--clear` when switching projects
✅ Review changes before committing
✅ Keep conversation history for complex tasks

## File Locations

- Main code: `/app/src/`
- Built CLI: `/app/dist/`
- History: `.arhan_history.json` (in working directory)
- Config: `/app/.env`

## Tools Available

- `read_file` - Read any file
- `write_file` - Create/modify files
- `list_files` - Browse directories
- `run_command` - Execute shell commands

## Safety

- ✅ Asks before writing files
- ✅ Asks before running commands
- ✅ Extra prompt for dangerous ops (rm, delete)
- ✅ File size warnings (>1MB)
- ⚠️ Use `-y` flag carefully

## Help

```bash
arhan --help
```

Read full docs: `/app/README.md`
Testing guide: `/app/TESTING_GUIDE.md`
