#!/bin/bash

# AgentBench Assistant Extension Build Script
# 用于构建和打包浏览器插件

set -e

echo "🚀 AgentBench Assistant 构建脚本"
echo "=================================="

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 版本: $(npm --version)"

# 清理之前的构建
echo "🧹 清理之前的构建文件..."
npm run clean

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建插件
echo "🔨 构建插件..."
npm run build

# 检查构建结果
if [ ! -d "build/chrome-mv3-prod" ]; then
    echo "❌ 构建失败：未找到构建目录"
    exit 1
fi

echo "✅ 构建成功"

# 创建zip包
echo "📦 创建Chrome插件包..."
npm run zip

# 检查zip文件
if [ ! -f "agentbench-assistant-chrome.zip" ]; then
    echo "❌ 打包失败：未找到zip文件"
    exit 1
fi

echo "✅ 打包成功"
echo "📁 打包文件: agentbench-assistant-chrome.zip"

# 显示文件大小
FILE_SIZE=$(ls -lh agentbench-assistant-chrome.zip | awk '{print $5}')
echo "📊 文件大小: $FILE_SIZE"

# 验证manifest.json
echo "🔍 验证manifest.json..."
if [ -f "build/chrome-mv3-prod/manifest.json" ]; then
    echo "✅ manifest.json 存在"
    
    # 检查关键配置
    VERSION=$(grep -o '"version": "[^"]*"' build/chrome-mv3-prod/manifest.json | cut -d'"' -f4)
    NAME=$(grep -o '"name": "[^"]*"' build/chrome-mv3-prod/manifest.json | cut -d'"' -f4)
    
    echo "📋 插件信息:"
    echo "   名称: $NAME"
    echo "   版本: $VERSION"
else
    echo "❌ manifest.json 未找到"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
echo ""
echo "📦 输出文件:"
echo "   - agentbench-assistant-chrome.zip (Chrome插件包)"
echo "   - build/chrome-mv3-prod/ (Chrome开发版本)"
echo ""
echo "🚀 下一步:"
echo "   1. 上传到Chrome Web Store"
echo "   2. 或在Chrome中加载未打包的扩展程序"
echo ""
echo "📖 详细说明请参考 DEPLOYMENT.md"