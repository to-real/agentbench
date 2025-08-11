#!/bin/bash

# AgentBench WebSocket 服务器启动脚本

echo "🚀 启动 AgentBench WebSocket 服务器..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 websocket-server 目录中运行此脚本"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 设置环境变量
export WS_PORT=${WS_PORT:-3001}
export JWT_SECRET=${JWT_SECRET:-"your-secret-key-change-in-production"}
export ENABLE_METRICS=${ENABLE_METRICS:-"true"}
export ENABLE_LOGGING=${ENABLE_LOGGING:-"true"}
export MAX_SESSIONS=${MAX_SESSIONS:-100}
export SESSION_TIMEOUT=${SESSION_TIMEOUT:-"1800000"}

echo "🔧 配置:"
echo "   端口: $WS_PORT"
echo "   日志: $ENABLE_LOGGING"
echo "   指标: $ENABLE_METRICS"
echo "   最大会话数: $MAX_SESSIONS"
echo "   会话超时: $SESSION_TIMEOUT ms"

# 编译 TypeScript
echo "🔨 编译 TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

# 启动服务器
echo "🎯 启动服务器..."
node dist/index.js