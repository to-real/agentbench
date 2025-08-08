console.log('Starting simple test server...');

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AgentBench Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px; }
        .content { background: white; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 AgentBench 测试服务器</h1>
          <p>AI Agent 评测与基准测试平台</p>
        </div>
        <div class="content">
          <h2>✅ 服务器运行正常</h2>
          <p>如果您看到这个页面，说明基础网络环境正常。</p>
          <h3>Next.js 启动问题排查</h3>
          <ul>
            <li>✅ Node.js 环境正常</li>
            <li>✅ 网络端口可用</li>
            <li>✅ 基础HTTP服务正常</li>
            <li>⚠️ Next.js 可能有依赖或配置问题</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

server.listen(3002, '0.0.0.0', () => {
  console.log('Test server running on http://localhost:3002');
  console.log('WSL access: http://172.28.167.11:3002');
});