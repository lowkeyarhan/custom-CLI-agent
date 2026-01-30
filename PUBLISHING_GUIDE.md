# Publishing Arhan to npm Registry

## Overview
Once published to npm, anyone can install your CLI tool globally:
```bash
npm install -g arhan
# Then use it anywhere:
arhan "your task"
```

## Method 1: Publish to Public npm Registry (Recommended)

### Step 1: Create npm Account
1. Go to https://www.npmjs.com/signup
2. Create a free account
3. Verify your email

### Step 2: Login to npm CLI
```bash
npm login
# Enter your:
# - Username
# - Password
# - Email
# - One-time password (if 2FA enabled)
```

Verify login:
```bash
npm whoami
# Should show your username
```

### Step 3: Check Package Name Availability
```bash
npm search arhan
# Or check on: https://www.npmjs.com/package/arhan
```

**Important:** If "arhan" is taken, you need to either:
- Choose a different name (e.g., `arhan-ai`, `arhan-cli`, `@yourusername/arhan`)
- Use a scoped package: `@yourusername/arhan`

### Step 4: Update package.json (if needed)
```bash
cd /app
nano package.json
```

Change name if taken:
```json
{
  "name": "arhan-ai-cli",  // or @yourusername/arhan
  "version": "1.0.0",
  ...
}
```

For scoped packages, add:
```json
{
  "name": "@yourusername/arhan",
  "publishConfig": {
    "access": "public"
  }
}
```

### Step 5: Prepare for Publishing

**Update .gitignore and .npmignore:**
```bash
cd /app

# Create .npmignore (what NOT to publish)
cat > .npmignore << 'EOF'
# Source files (only publish dist/)
src/
*.ts
tsconfig.json

# Development files
node_modules/
.env
.env.example
*.log

# Documentation (optional - remove if you want to include)
TESTING_GUIDE.md
USAGE_EXAMPLES.md
ARCHITECTURE.md

# Test files
tests/
test_reports/
test_result.md

# Other
.git/
.gitignore
backend/
frontend/
memory/
yarn.lock
EOF
```

**Verify what will be published:**
```bash
npm pack --dry-run
# Shows list of files that will be included
```

### Step 6: Build & Test
```bash
cd /app

# Build the project
npm run build

# Test locally first
npm link
arhan --version
arhan "test task"

# Unlink before publishing
npm unlink -g arhan
```

### Step 7: Publish!
```bash
cd /app

# Publish to npm
npm publish

# For scoped packages:
npm publish --access public
```

**Success!** 🎉 Your package is now live at:
- https://www.npmjs.com/package/arhan (or your package name)

### Step 8: Anyone Can Now Install
```bash
# From any computer with Node.js:
npm install -g arhan

# Use it:
arhan "create a React app"
```

---

## Method 2: Publish as Scoped Package (Recommended for Personal Projects)

Scoped packages prevent name conflicts:

```bash
cd /app
```

**Update package.json:**
```json
{
  "name": "@yourusername/arhan",
  "bin": {
    "arhan": "./dist/index.js"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Publish:**
```bash
npm publish --access public
```

**Users install as:**
```bash
npm install -g @yourusername/arhan
arhan "task"
```

---

## Method 3: GitHub Packages (Alternative Registry)

### Setup
1. Create GitHub Personal Access Token
   - Go to: https://github.com/settings/tokens
   - Create token with `write:packages` scope

2. Login to GitHub registry:
```bash
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-personal-access-token
# Email: your-email
```

### Update package.json
```json
{
  "name": "@yourusername/arhan",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/arhan.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### Publish
```bash
npm publish
```

### Users Install
```bash
# Create .npmrc in their home directory:
echo "@yourusername:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install
npm install -g @yourusername/arhan
```

---

## Method 4: Private npm Registry (For Companies)

Use Verdaccio (self-hosted):

```bash
# Install Verdaccio
npm install -g verdaccio

# Start registry
verdaccio
# Runs on http://localhost:4873

# Point npm to it
npm set registry http://localhost:4873

# Publish
npm publish
```

---

## Method 5: Direct Distribution (No Registry)

### Option A: GitHub Releases
1. Push code to GitHub
2. Users install via:
```bash
npm install -g https://github.com/yourusername/arhan.git
```

### Option B: Tarball Distribution
```bash
# Create package
cd /app
npm pack
# Creates: arhan-1.0.0.tgz

# Share this file, users install as:
npm install -g /path/to/arhan-1.0.0.tgz
```

### Option C: Direct from Git
```bash
npm install -g git+https://github.com/yourusername/arhan.git
```

---

## Version Management

### Updating Your Package

**Patch Release (1.0.0 → 1.0.1):** Bug fixes
```bash
npm version patch
npm publish
```

**Minor Release (1.0.0 → 1.1.0):** New features
```bash
npm version minor
npm publish
```

**Major Release (1.0.0 → 2.0.0):** Breaking changes
```bash
npm version major
npm publish
```

### Best Practices
1. Always test before publishing:
   ```bash
   npm run build
   npm link
   # Test thoroughly
   npm unlink -g arhan
   ```

2. Use semantic versioning (semver)
3. Update README.md with changes
4. Add CHANGELOG.md (optional)
5. Tag releases in git:
   ```bash
   git tag v1.0.0
   git push --tags
   ```

---

## Package.json Configuration Checklist

✅ **Required fields:**
```json
{
  "name": "arhan",
  "version": "1.0.0",
  "description": "AI Coding Agent CLI",
  "main": "dist/index.js",
  "bin": {
    "arhan": "./dist/index.js"
  },
  "keywords": ["ai", "cli", "coding-agent"],
  "author": "Your Name",
  "license": "MIT"
}
```

✅ **Recommended fields:**
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/arhan"
  },
  "bugs": {
    "url": "https://github.com/yourusername/arhan/issues"
  },
  "homepage": "https://github.com/yourusername/arhan#readme",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Post-Publishing Steps

### 1. Create npm Badge
Add to README.md:
```markdown
[![npm version](https://badge.fury.io/js/arhan.svg)](https://www.npmjs.com/package/arhan)
[![npm downloads](https://img.shields.io/npm/dm/arhan.svg)](https://www.npmjs.com/package/arhan)
```

### 2. Update Installation Instructions
```markdown
## Installation

```bash
npm install -g arhan
```

## Usage

```bash
arhan "your coding task"
```
```

### 3. Monitor Your Package
- npm downloads: https://npm-stat.com/charts.html?package=arhan
- npm page: https://www.npmjs.com/package/arhan

---

## Troubleshooting

### "Package name already exists"
- Choose different name: `arhan-ai`, `arhan-cli`
- Use scoped package: `@yourusername/arhan`

### "You must be logged in"
```bash
npm login
npm whoami  # Verify
```

### "402 Payment Required"
- You're trying to publish private package with free account
- Use `--access public` flag

### "Unable to authenticate"
- Enable 2FA on npm account
- Use automation tokens for CI/CD

### Files missing in published package
- Check `.npmignore`
- Use `npm pack --dry-run` to preview

### Wrong main/bin path
- Ensure `dist/` is included
- Verify paths in package.json

---

## Security Best Practices

1. **Enable 2FA on npm account**
   ```bash
   npm profile enable-2fa
   ```

2. **Use .npmignore properly**
   - Don't publish `.env` files
   - Don't publish credentials
   - Don't publish unnecessary files

3. **Audit dependencies**
   ```bash
   npm audit
   npm audit fix
   ```

4. **Sign your packages** (optional)
   ```bash
   npm install -g npm-sign
   npm-sign sign
   ```

---

## Example: Complete Publishing Flow

```bash
# 1. Prepare
cd /app
npm login
npm whoami

# 2. Update if needed
nano package.json  # Check name, version, author

# 3. Build
npm run build

# 4. Test locally
npm link
arhan --version
arhan "test"
npm unlink -g arhan

# 5. Verify package contents
npm pack --dry-run

# 6. Publish
npm publish

# 7. Verify
npm info arhan
npm view arhan

# 8. Test installation on fresh terminal
npm install -g arhan
arhan --version
```

---

## Users Will Install As:

```bash
# Install globally
npm install -g arhan

# Or with npx (no installation)
npx arhan "create a Node.js app"

# Update to latest version
npm update -g arhan

# Uninstall
npm uninstall -g arhan
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Login to npm | `npm login` |
| Check login | `npm whoami` |
| Preview package | `npm pack --dry-run` |
| Publish | `npm publish` |
| Publish scoped | `npm publish --access public` |
| Update patch | `npm version patch && npm publish` |
| Update minor | `npm version minor && npm publish` |
| Update major | `npm version major && npm publish` |
| View package info | `npm info arhan` |
| Unpublish (24hrs) | `npm unpublish arhan@1.0.0` |

---

## Next Steps

1. **Create npm account:** https://www.npmjs.com/signup
2. **Choose package name:** Check availability
3. **Update package.json:** Add author, repository, keywords
4. **Build & test:** `npm run build && npm link`
5. **Publish:** `npm publish`
6. **Share:** Tell people to `npm install -g arhan`

**Your CLI tool will be globally accessible! 🚀**
