# Quick Release Guide

## Automatic Release (Recommended)

When you want to release a new version:

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm run release:patch

# For new features (1.0.0 → 1.1.0)
npm run release:minor

# For breaking changes (1.0.0 → 2.0.0)
npm run release:major
```

This automatically:

1. ✅ Updates package.json version
2. ✅ Creates a git commit
3. ✅ Creates a version tag
4. ✅ Pushes to GitHub
5. ✅ Triggers CI/CD pipeline
6. ✅ Publishes to npm (if checks pass)
7. ✅ Creates GitHub release

## Manual Process

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Push with tags
git push --follow-tags
```

## Workflow Status

Check: https://github.com/lowkeyarhan/custom-CLI-agent/actions

- 🟢 Green = Published to npm
- 🔴 Red = Failed, not published
- 🟡 Yellow = In progress

## Before Release

1. Test locally:

   ```bash
   npm run build
   node dist/index.js --help
   ```

2. Check for errors:

   ```bash
   npx tsc --noEmit
   ```

3. Commit all changes:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

4. Then run release command

## After Release

1. Check npm: https://www.npmjs.com/package/lowkeyarhan
2. Users can update: `npm install -g lowkeyarhan@latest`
3. Announce on social media / Discord / etc.

That's it! 🚀
