#!/bin/bash

# Test script to showcase the new Claude Code inspired UI

echo "🎨 Testing lowkeyarhan Claude Code UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build the project
echo "📦 Building..."
npm run build > /dev/null 2>&1

echo "✅ Build complete"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Show welcome screen
echo "Test 1: Welcome Screen"
echo "Command: node dist/index.js"
echo ""
node dist/index.js
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Simple task with auto-approve
echo "Test 2: Creating a file (auto-approve)"
echo "Command: node dist/index.js -y \"Create a test.txt with 'Hello from lowkeyarhan'\""
echo ""
node dist/index.js -y "Create a test.txt with 'Hello from lowkeyarhan'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ UI Showcase Complete!"
echo ""
echo "Try it yourself:"
echo "  node dist/index.js \"List all TypeScript files in src/\""
echo "  node dist/index.js -y \"Read the package.json file\""
echo ""
