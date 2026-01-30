# 🚀 Quick Start: Publish Arhan to npm

## Simple 5-Step Process

### Step 1: Create npm Account (One-time)
Go to https://www.npmjs.com/signup and create a free account.

### Step 2: Login from Terminal
```bash
npm login
# Enter: username, password, email
```

### Step 3: Update Your Details
Edit `/app/package.json`:
```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "url": "https://github.com/yourusername/arhan.git"
  }
}
```

### Step 4: Build & Test
```bash
cd /app
npm run build
npm link  # Test locally
arhan --version
```

### Step 5: Publish!
```bash
cd /app
npm publish
```

**Done!** 🎉 

Anyone can now install:
```bash
npm install -g arhan
```

---

## If Name "arhan" is Taken

Use a scoped package instead:

**Update package.json:**
```json
{
  "name": "@yourusername/arhan",
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
arhan "task"  # Still works as 'arhan' command
```

---

## Verify It Worked

```bash
# Check on npm
npm info arhan

# Or visit
# https://www.npmjs.com/package/arhan
```

---

## Update Later

```bash
# Make changes to code
# Then bump version and republish:

npm version patch  # 1.0.0 → 1.0.1
npm publish
```

---

## That's It!

Full detailed guide: `/app/PUBLISHING_GUIDE.md`

**Support:** 
- npm docs: https://docs.npmjs.com/cli/publish
- Troubleshooting: See PUBLISHING_GUIDE.md
