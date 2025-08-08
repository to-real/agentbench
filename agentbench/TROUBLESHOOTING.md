# 🔧 AgentBench 启动问题解决方案

## 问题诊断
✅ Next.js 服务器已成功启动并在端口3000监听
✅ 网络环境正常（测试服务器可运行）
⚠️ 问题：WSL 环境下的端口转发配置

## 解决方案

### 方案1：使用Windows端口转发（推荐）
在 Windows PowerShell（管理员模式）中运行：

```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.28.167.11
```

然后访问：http://localhost:3000

### 方案2：直接使用WSL IP地址
在浏览器中访问：http://172.28.167.11:3000

### 方案3：使用Windows防火墙例外
1. 打开 Windows 防火墙设置
2. 添加入站规则，允许端口3000
3. 重启Next.js服务器

### 方案4：使用不同的端口
```bash
# 在项目目录中运行
node node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 8080
```
然后访问：http://localhost:8080

## 验证步骤
1. 在WSL中运行：`curl http://localhost:3000`
2. 如果能访问，说明服务器正常
3. 在Windows浏览器中尝试上述解决方案

## 当前状态
- ✅ Next.js 已启动
- ✅ 依赖项已安装
- ✅ 代码结构正确
- 🔧 需要配置网络访问