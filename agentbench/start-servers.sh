#!/bin/bash

echo "🚀 AgentBench 多端口启动方案"
echo "=================================="

# 检查端口占用
check_port() {
    if ss -tlnp | grep -q ":$1 "; then
        echo "❌ 端口 $1 已被占用"
        return 1
    else
        echo "✅ 端口 $1 可用"
        return 0
    fi
}

# 启动不同端口的服务器
start_server() {
    local port=$1
    local description=$2
    
    echo ""
    echo "📍 启动 $description (端口 $port)"
    
    if check_port $port; then
        case $port in
            3000)
                echo "启动 Next.js 开发服务器..."
                node node_modules/next/dist/bin/next dev -H 0.0.0.0 -p $port &
                ;;
            4000)
                echo "启动 Express 演示服务器..."
                node simple-server.js &
                ;;
            5000)
                echo "启动静态文件服务器..."
                python3 -m http.server $port --bind 0.0.0.0 &
                ;;
            8000)
                echo "启动备用静态服务器..."
                npx serve@latest . -l $port &
                ;;
            *)
                echo "启动通用服务器..."
                python3 -m http.server $port --bind 0.0.0.0 &
                ;;
        esac
        
        echo "✅ $description 已启动"
        echo "🔗 访问地址: http://localhost:$port"
        echo "🌐 网络地址: http://172.28.167.11:$port"
        
        # 保存进程ID
        echo $! >> /tmp/agentbench_pids.txt
        
    else
        echo "❌ 端口 $port 被占用，跳过..."
    fi
}

# 清理之前的进程
if [ -f /tmp/agentbench_pids.txt ]; then
    echo "🧹 清理之前的进程..."
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo "已终止进程: $pid"
        fi
    done < /tmp/agentbench_pids.txt
    rm /tmp/agentbench_pids.txt
fi

echo ""
echo "🎯 可用的访问方案："
echo ""

# 方案1: Next.js 原生端口
start_server 3000 "Next.js 开发服务器"

# 方案2: Express 演示服务器
start_server 4000 "Express 演示服务器"

# 方案3: Python 静态服务器
start_server 5000 "Python 静态服务器"

# 方案4: Serve 静态服务器
start_server 8000 "Serve 静态服务器"

echo ""
echo "🎉 所有服务器启动完成！"
echo ""
echo "💡 推荐访问地址："
echo "   • 演示版本: http://172.28.167.11:4000/demo.html"
echo "   • 静态文件: http://172.28.167.11:5000/demo.html"
echo "   • Next.js: http://172.28.167.11:3000"
echo ""
echo "🛑 停止所有服务器: ./stop-servers.sh"