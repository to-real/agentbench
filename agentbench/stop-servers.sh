#!/bin/bash

echo "🛑 停止 AgentBench 服务器..."
echo "=================================="

if [ -f /tmp/agentbench_pids.txt ]; then
    echo "🔍 查找运行中的进程..."
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo "✅ 已终止进程: $pid"
        else
            echo "⚠️  进程 $pid 已不存在"
        fi
    done < /tmp/agentbench_pids.txt
    rm /tmp/agentbench_pids.txt
else
    echo "📝 未找到进程记录文件"
fi

# 额外检查 Next.js 进程
echo "🔍 检查 Next.js 进程..."
pkill -f "next dev" 2>/dev/null && echo "✅ 已终止 Next.js 进程" || echo "⚠️  未找到 Next.js 进程"

# 检查 Express 进程
echo "🔍 检查 Express 进程..."
pkill -f "simple-server" 2>/dev/null && echo "✅ 已终止 Express 进程" || echo "⚠️  未找到 Express 进程"

# 检查 Python HTTP 服务器
echo "🔍 检查 Python HTTP 服务器..."
pkill -f "python.*http.server" 2>/dev/null && echo "✅ 已终止 Python HTTP 服务器" || echo "⚠️  未找到 Python HTTP 服务器"

# 检查 Serve 进程
echo "🔍 检查 Serve 进程..."
pkill -f "serve" 2>/dev/null && echo "✅ 已终止 Serve 进程" || echo "⚠️  未找到 Serve 进程"

echo ""
echo "🎉 所有服务器已停止！"