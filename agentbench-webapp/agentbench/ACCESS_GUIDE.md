# AgentBench 多种访问方案

## 🎯 立即可用的解决方案

### 方案1: 静态HTML演示 (推荐)
**文件**: `demo.html`  
**访问方式**: 直接在浏览器中打开

```bash
# 在浏览器中打开
firefox demo.html
# 或
google-chrome demo.html
```

### 方案2: Express 演示服务器
**启动命令**:
```bash
node simple-server.js
```
**访问地址**: 
- 本地: http://localhost:4000
- 网络: http://172.28.167.11:4000

### 方案3: 多端口自动启动
**启动命令**:
```bash
chmod +x start-servers.sh
./start-servers.sh
```

**可用端口**:
- 3000: Next.js 开发服务器
- 4000: Express 演示服务器
- 5000: Python 静态服务器
- 8000: Serve 静态服务器

### 方案4: Python 静态服务器
```bash
python3 -m http.server 5000 --bind 0.0.0.0
```

### 方案5: Node.js 静态服务器
```bash
npx serve@latest . -l 8080
```

## 🚀 快速开始

### 最简单的方法:
1. **直接打开HTML文件**: 双击 `demo.html`
2. **使用Express服务器**: 运行 `node simple-server.js`
3. **使用多端口脚本**: 运行 `./start-servers.sh`

### 推荐访问地址:
- **演示版本**: http://172.28.167.11:4000/demo.html
- **静态文件**: http://172.28.167.11:5000/demo.html
- **直接打开**: file:///mnt/e/评测平台/agentbench/demo.html

## 📱 功能展示

### 静态演示版本包含:
- ✅ 完整的UI界面设计
- ✅ 响应式布局
- ✅ 四个主要页面框架
- ✅ 交互式导航
- ✅ 功能演示和说明
- ✅ 模拟数据展示

### 页面功能:
1. **首页**: 平台介绍和功能概览
2. **项目管理**: 项目列表和操作界面
3. **测试用例库**: 用例管理界面
4. **评测执行**: 评测配置和表单
5. **数据分析**: 数据可视化展示

## 🛠️ 停止服务器

```bash
chmod +x stop-servers.sh
./stop-servers.sh
```

## 📋 文件结构

```
agentbench/
├── demo.html              # 静态演示版本
├── simple-server.js       # Express服务器
├── start-servers.sh       # 多端口启动脚本
├── stop-servers.sh        # 停止服务器脚本
├── src/                   # Next.js源码
├── PHASE1_REPORT.md       # Phase 1完成报告
└── TROUBLESHOOTING.md     # 问题排查指南
```

## 🎉 立即体验

选择任意一种方式即可开始体验AgentBench平台！