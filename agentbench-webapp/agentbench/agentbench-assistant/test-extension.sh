#!/bin/bash

# AgentBench Extension Test Script

echo "🚀 AgentBench Extension Testing"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Build the extension
echo "🔨 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Extension build successful"
else
    echo "❌ Extension build failed"
    exit 1
fi

# Check if build directory exists
if [ -d "build/chrome-mv3-prod" ]; then
    echo "✅ Build directory exists"
    echo "📁 Build location: $(pwd)/build/chrome-mv3-prod"
else
    echo "❌ Build directory not found"
    exit 1
fi

# List build contents
echo "📋 Build contents:"
ls -la build/chrome-mv3-prod/

echo ""
echo "🎉 Extension testing complete!"
echo "📦 Extension is ready for installation in Chrome"
echo "🔧 To install: Open Chrome -> Extensions -> Load unpacked -> Select build/chrome-mv3-prod"