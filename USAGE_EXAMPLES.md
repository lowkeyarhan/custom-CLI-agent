# Arhan CLI - Complete Usage Examples

## Getting Started

### 1. First Time Setup
```bash
# Navigate to project
cd /app

# Your API key is needed - edit .env
nano .env
# Replace: OPENROUTER_API_KEY=paste_your_key_here
# With your actual key from: https://openrouter.ai/keys

# Verify installation
arhan --version
# Should show: 1.0.0

# Check help
arhan --help
```

## Real-World Examples

### Example 1: Create a Simple Express Server
```bash
# Create a new project directory
mkdir ~/my-api && cd ~/my-api

# Ask Arhan to set it up
arhan "create a simple Express.js REST API with endpoints for users - GET all users and POST new user"

# The agent will:
# 1. Create package.json
# 2. Create server.js with Express code
# 3. Set up the routes
# 4. Ask for confirmation before each file write
```

**Expected Output:**
```
🤖 Arhan - AI Coding Agent
Model: google/gemini-flash-1.5
History: /root/my-api/.arhan_history.json

Task: create a simple Express.js REST API...

[Agent streams its thinking...]

🔧 Tool: write_file
{
  "path": "package.json",
  "content": "..."
}
? Allow write_file? (Y/n) Y

✅ Success
Successfully wrote to package.json

[Continues with server.js...]
```

### Example 2: Debug an Existing File
```bash
cd ~/my-api

# Create a buggy file
cat > buggy.js << 'EOF'
const users = [];

function addUser(name) {
  users.push({ id: users.length, name: name });
}

function getUser(id) {
  return users.find(u => u.id === id);
}

// Bug: This doesn't work correctly
function deleteUser(id) {
  const index = users.indexOf(id);
  users.splice(index, 1);
}

module.exports = { addUser, getUser, deleteUser };
EOF

# Ask Arhan to find and fix the bug
arhan "read buggy.js, find the bug in deleteUser function, and fix it"

# Agent will:
# 1. Read the file
# 2. Identify the bug (indexOf doesn't work for objects)
# 3. Suggest the fix (use findIndex)
# 4. Write the corrected version
```

### Example 3: Add Features to Existing Code
```bash
cd ~/my-api

arhan "read server.js and add error handling middleware and input validation for the POST /users endpoint"

# Conversation history is maintained, so the agent remembers
# the structure of server.js from previous interactions
```

### Example 4: Code Refactoring
```bash
cd ~/my-project

# First, let agent understand the codebase
arhan "list all .js files in the src directory"

# Then ask for refactoring
arhan "read src/app.js and refactor it to use ES6 modules instead of CommonJS"
```

### Example 5: Running Tests
```bash
cd ~/my-project

# Install dependencies first
arhan "run npm install"

# Then run tests
arhan "run npm test and tell me if there are any failures"

# Agent will execute the command and analyze the output
```

### Example 6: Git Operations
```bash
cd ~/my-project

# Check status
arhan "run git status and tell me what files are modified"

# Create a commit
arhan "run git add . and then git commit with message 'Add user authentication'"
```

### Example 7: Multi-Step Complex Task
```bash
cd ~/new-project

arhan "Create a React component called UserCard that displays user info with props: name, email, avatar. Include proper PropTypes validation and CSS styling in a separate file."

# Agent will:
# 1. Create UserCard.jsx
# 2. Create UserCard.css
# 3. Add PropTypes
# 4. Include proper imports
# 5. Ask for confirmation at each step
```

### Example 8: Documentation Generation
```bash
cd ~/my-project

arhan "read all .js files in the src directory and create a comprehensive API.md documentation file"
```

### Example 9: Using Auto-Approve Mode (Careful!)
```bash
cd ~/my-project

# Skip all confirmations - use only when you trust the task
arhan -y "add console.log statements for debugging in all functions"

# This will execute all tool calls without asking
```

### Example 10: Using Different Models
```bash
# Use Claude Sonnet for complex refactoring
arhan -m "anthropic/claude-3.5-sonnet" "refactor the entire auth module to use JWT tokens"

# Use free Llama for simple tasks
arhan -m "meta-llama/llama-3.1-8b-instruct:free" "add comments to functions"
```

## Advanced Workflows

### Workflow 1: Build a Full Feature
```bash
cd ~/my-saas-app

# Step 1: Plan
arhan "list all files in src/features/auth"

# Step 2: Read existing code
arhan "read src/features/auth/login.js"

# Step 3: Implement
arhan "add password reset functionality to the auth feature"

# Step 4: Test
arhan "run npm test -- auth"

# Step 5: Document
arhan "update the README.md with the new password reset feature"

# All of this maintains conversation context!
```

### Workflow 2: Code Review & Improvement
```bash
cd ~/code-to-review

# Get the overview
arhan "list all files recursively with depth 2"

# Review a file
arhan "read src/utils/helpers.js and suggest improvements for code quality, performance, and readability"

# Apply improvements
arhan "refactor helpers.js with the suggested improvements"
```

### Workflow 3: Migration Tasks
```bash
cd ~/old-project

# Analyze current setup
arhan "read package.json and list all dependencies"

# Perform migration
arhan "update all React component files to use hooks instead of class components"

# Update config
arhan "update package.json to use React 18"
```

## Conversation History Examples

### Maintaining Context Across Commands

**First Command:**
```bash
cd ~/blog-app
arhan "create a blog post model with fields: title, content, author, createdAt"
```

**Second Command (remembers previous context):**
```bash
arhan "now create API endpoints to CRUD this blog post model"
# Agent remembers the model structure from previous command!
```

**Third Command:**
```bash
arhan "add pagination to the GET all posts endpoint"
# Still remembers everything!
```

**Clear History When Switching Projects:**
```bash
arhan --clear
arhan "create a new e-commerce product catalog"
# Fresh start, no confusion from blog app context
```

## Error Handling Examples

### Example: Network Errors
```bash
arhan "run npm install express"

# If npm registry is down:
❌ Error
npm ERR! network timeout

# Agent will report the error, you can retry or investigate
```

### Example: File Not Found
```bash
arhan "read config.yaml"

# If file doesn't exist:
🔧 Tool: read_file
❌ Error
Failed to read file: ENOENT: no such file or directory

# Agent will know the file doesn't exist and may suggest creating it
```

### Example: Command Failure
```bash
arhan "run npm start"

# If there's an error:
🔧 Tool: run_command
❌ Error
Error: Cannot find module 'express'

# Agent can analyze the error and suggest: "run npm install first"
```

## Safety Examples

### Safe: Reading Files
```bash
arhan "read package.json"
# No confirmation needed, reads are safe
```

### Needs Confirmation: Writing Files
```bash
arhan "create a new server.js file"

# Prompt appears:
? Allow write_file? (Y/n)
# Type Y to proceed, n to cancel
```

### Extra Confirmation: Dangerous Commands
```bash
arhan "remove all .log files"

# Extra warning:
⚠️  This command includes delete/remove operations
? Allow run_command? (Y/n)
# Be careful before confirming!
```

## Performance Tips

### Tip 1: Be Specific
❌ **Bad:** "fix the app"
✅ **Good:** "fix the 500 error in the /api/users endpoint in server.js"

### Tip 2: Let Agent Read First
❌ **Bad:** "add error handling to the code"
✅ **Good:** "read server.js and add comprehensive error handling"

### Tip 3: Break Down Large Tasks
❌ **Bad:** "rebuild the entire application with TypeScript"
✅ **Good:** 
```bash
arhan "list all .js files to convert to TypeScript"
arhan "convert src/app.js to TypeScript"
arhan "convert src/routes.js to TypeScript"
# etc...
```

### Tip 4: Use Appropriate Models
- **Simple tasks:** Use free `google/gemini-flash-1.5`
- **Complex refactoring:** Use `anthropic/claude-3.5-sonnet`
- **Code generation:** Use `openai/gpt-4-turbo`

## Debugging the Agent

### View Conversation History
```bash
cd ~/my-project
cat .arhan_history.json | jq .
```

### Check What Model Is Being Used
```bash
arhan "test" | head -5
# Shows: Model: google/gemini-flash-1.5
```

### Limit Iterations (Prevent Infinite Loops)
```bash
arhan --max-iterations 5 "complex task"
```

### Start Fresh If Confused
```bash
arhan --clear
```

## Integration with Other Tools

### With Git
```bash
# Create .gitignore
arhan "create a .gitignore file for Node.js projects"

# Analyze changes
arhan "run git diff and explain what changed"

# Commit work
arhan "run git add . and commit with message 'Add user authentication'"
```

### With npm/yarn
```bash
# Install packages
arhan "run npm install lodash express"

# Update packages
arhan "run npm update"

# Audit security
arhan "run npm audit and fix any issues"
```

### With Testing Frameworks
```bash
# Run tests
arhan "run npm test"

# Generate tests
arhan "create Jest tests for the auth.js module"

# Fix failing tests
arhan "run npm test, identify failing tests, and fix them"
```

### With Linters
```bash
# Run linter
arhan "run eslint src/ --fix"

# Add linting
arhan "set up ESLint for this project with Airbnb style guide"
```

## Common Patterns

### Pattern 1: Explore → Understand → Modify
```bash
arhan "list files in src/"
arhan "read src/app.js"
arhan "add logging to all functions in app.js"
```

### Pattern 2: Create → Test → Document
```bash
arhan "create a utility function to validate email addresses"
arhan "create tests for the email validation function"
arhan "add JSDoc comments to the validation function"
```

### Pattern 3: Analyze → Fix → Verify
```bash
arhan "run npm test and show me which tests are failing"
arhan "fix the failing tests"
arhan "run npm test again to verify"
```

## Best Practices

✅ **DO:**
- Be specific with file names and paths
- Let the agent read files for context
- Use conversation history for multi-step tasks
- Review changes before committing to git
- Use `--clear` when switching projects
- Confirm dangerous operations carefully

❌ **DON'T:**
- Use vague instructions like "fix everything"
- Run `-y` mode without understanding what will be done
- Skip reading the proposed changes
- Use on production without testing first
- Mix multiple unrelated projects in one conversation

## Troubleshooting Commands

```bash
# If command not found
which arhan
npm link  # Re-link if needed

# If API key errors
cat /app/.env | grep OPENROUTER_API_KEY

# If model not working
arhan -m "google/gemini-flash-1.5" "test"

# If conversation is confused
arhan --clear
rm .arhan_history.json

# If output is too verbose
arhan --max-iterations 10 "task"

# Check version
arhan --version
```

## Getting Help

- Read the docs: `/app/README.md`
- Check architecture: `/app/ARCHITECTURE.md`
- Quick reference: `/app/QUICK_REFERENCE.md`
- Testing guide: `/app/TESTING_GUIDE.md`

Happy coding with Arhan! 🚀
