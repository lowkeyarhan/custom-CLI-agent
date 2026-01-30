# GitHub Actions Setup Guide

This guide explains how to set up automatic npm publishing when you push to GitHub.

## How It Works

When you push code to GitHub:

1. **CI Workflow** runs on every push:
   - Checks TypeScript types
   - Builds the project
   - Tests the CLI binary
   - Verifies everything works

2. **Publish Workflow** runs only on version tags:
   - Verifies all checks passed
   - Publishes to npm
   - Creates a GitHub Release

## Setup Instructions

### Step 1: Create npm Token

1. Go to https://www.npmjs.com/settings/[YOUR_USERNAME]/tokens
2. Click "Generate New Token"
3. Select "Granular Access Token"
4. Configure:
   - **Name**: "GitHub Actions"
   - **Expiration**: 90 days (or your preference)
   - **Packages and scopes**: Select "Read and write"
   - **Package**: lowkeyarhan
5. Click "Generate Token"
6. **Copy the token** (you won't see it again!)

### Step 2: Add Token to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click "Add secret"

### Step 3: Push the Workflow Files

```bash
git add .github/
git commit -m "Add CI/CD workflows"
git push
```

## How to Release a New Version

When you want to publish an update to npm:

### 1. Update the version in package.json

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm version patch

# For new features (1.0.0 → 1.1.0)
npm version minor

# For breaking changes (1.0.0 → 2.0.0)
npm version major
```

This automatically:

- Updates `package.json`
- Creates a git commit
- Creates a git tag

### 2. Push with tags

```bash
git push && git push --tags
```

### 3. Automated workflow

GitHub Actions will automatically:

- ✅ Run all checks
- ✅ Build the project
- ✅ Verify the version
- ✅ Publish to npm
- ✅ Create a GitHub Release

## Manual Workflow (if needed)

If you prefer to manually create tags:

```bash
# 1. Update version in package.json manually
# "version": "1.0.1"

# 2. Commit the change
git add package.json
git commit -m "Release v1.0.1"

# 3. Create and push tag
git tag v1.0.1
git push && git push --tags
```

## Workflow Status

Check your workflows at:
https://github.com/lowkeyarhan/custom-CLI-agent/actions

You'll see:

- 🟢 Green check: All passed, published to npm
- 🔴 Red X: Failed checks, not published
- 🟡 Yellow: In progress

## What Gets Checked

Before publishing, the CI checks:

1. **TypeScript compilation**: No type errors
2. **Build success**: Project builds without errors
3. **CLI functionality**: Binary works and shows help
4. **Version match**: package.json version matches git tag
5. **Package contents**: All required files present

If any check fails, publishing is cancelled.

## Troubleshooting

### "Error: Version mismatch"

- Make sure `package.json` version matches your git tag
- Example: `"version": "1.0.1"` and git tag `v1.0.1`

### "Error: NPM_TOKEN not found"

- Check that you added the npm token as a GitHub secret
- Secret name must be exactly `NPM_TOKEN`

### "Error: Permission denied"

- Your npm token may have expired (they expire after 90 days)
- Create a new token and update the GitHub secret

### Workflow doesn't run

- Make sure you pushed the tags: `git push --tags`
- Check that your tag starts with `v` (e.g., `v1.0.1`)

## Testing Before Publishing

To test the workflow without publishing:

1. Push to a branch (not a tag):

   ```bash
   git push origin my-feature-branch
   ```

   This runs CI checks but doesn't publish.

2. Create a pull request:
   - CI runs automatically
   - See results before merging

## Best Practices

1. **Always test locally first**:

   ```bash
   npm run build
   node dist/index.js --help
   ```

2. **Update version incrementally**:
   - Don't skip versions
   - Follow semantic versioning

3. **Write meaningful commit messages**:

   ```bash
   git commit -m "feat: Add new feature"
   git commit -m "fix: Fix bug in CLI"
   git commit -m "docs: Update README"
   ```

4. **Check workflow status**:
   - Wait for green check before announcing release
   - Review logs if anything fails

## Quick Reference

```bash
# Release bug fix (1.0.0 → 1.0.1)
npm version patch && git push --follow-tags

# Release new feature (1.0.0 → 1.1.0)
npm version minor && git push --follow-tags

# Release breaking change (1.0.0 → 2.0.0)
npm version major && git push --follow-tags

# Check workflow status
open https://github.com/lowkeyarhan/custom-CLI-agent/actions

# Check npm package
open https://www.npmjs.com/package/lowkeyarhan
```

That's it! Your package now auto-publishes to npm when you push version tags to GitHub.
