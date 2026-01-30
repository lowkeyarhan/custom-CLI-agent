# Local Testing Guide

## Quick Start

### 1. Build the project

```bash
npm run build
```

### 2. Test the CLI

**Method 1: Direct Node execution (Recommended for development)**

```bash
node dist/index.js "Create a file named hello.txt with 'Hello World'"
```

**Method 2: Using npm start**

```bash
npm start -- "List all files in the current directory"
```

**Method 3: Using npm dev (builds and runs)**

```bash
npm run dev -- "Read the package.json file"
```

**Method 4: Link globally (simulates npm install -g)**

```bash
# Link the package
npm link

# Now use it like a real user would
lowkeyarhan "Create a README.md file"

# Unlink when done
npm unlink -g lowkeyarhan
```

## Test Examples

### Simple file operations

```bash
node dist/index.js "Create a test.txt file with 'This is a test'"
node dist/index.js "Read the test.txt file"
node dist/index.js "List all .txt files in the current directory"
```

### Code operations

```bash
node dist/index.js "Read package.json and explain what it does"
node dist/index.js "Check if there are any TypeScript errors in src/"
```

### With options

```bash
# Auto-approve all actions (no prompts)
node dist/index.js -y "Create multiple test files"

# Use a different model
node dist/index.js -m "google/gemini-2.0-flash-lite-preview-02-05:free" "Your task"

# Clear history and start fresh
node dist/index.js --clear "New task"
```

## Troubleshooting

### Check if .env is loaded

```bash
# The CLI will show an error if API key is missing
node dist/index.js --help
```

### Verify build

```bash
# Check if dist/ folder exists and has files
ls -la dist/
```

### Test with verbose output

The agent will show:

- Model being used
- History file location
- Tool executions
- Confirmations (unless -y flag is used)
