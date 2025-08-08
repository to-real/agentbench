const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4000;
const HOST = '0.0.0.0';

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    // 解析URL
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // 默认首页
    if (pathname === '/') {
        pathname = '/demo.html';
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, pathname);
    
    // 获取文件扩展名
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - 页面不存在</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h1 { color: #e53e3e; }
                        </style>
                    </head>
                    <body>
                        <h1>404 - 页面不存在</h1>
                        <p>请求的文件 ${pathname} 未找到</p>
                        <a href="/demo.html">返回首页</a>
                    </body>
                    </html>
                `);
            } else {
                // 服务器错误
                console.error('服务器错误:', err);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>服务器内部错误</h1>');
            }
        } else {
            // 成功响应
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// API路由
server.on('request', (req, res) => {
    if (req.url.startsWith('/api/')) {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (req.url === '/api/projects' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([
                {
                    id: 1,
                    name: '前端框架评测',
                    targets: ['MGX', 'Replit', 'CodeLlama'],
                    created_at: '2025-01-07'
                },
                {
                    id: 2,
                    name: '算法实现能力',
                    targets: ['GPT-4', 'Claude', 'Gemini'],
                    created_at: '2025-01-06'
                }
            ]));
        } else if (req.url === '/api/test-cases' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([
                {
                    id: 1,
                    title: 'React组件开发',
                    prompt: '创建一个React组件，实现用户登录表单',
                    tags: ['前端', '中等复杂度'],
                    created_at: '2025-01-07'
                },
                {
                    id: 2,
                    title: '排序算法实现',
                    prompt: '实现快速排序算法，并分析时间复杂度',
                    tags: ['算法', '基础'],
                    created_at: '2025-01-06'
                }
            ]));
        }
    }
});

server.listen(PORT, HOST, () => {
    console.log('🚀 AgentBench 演示服务器启动成功！');
    console.log('📱 本地访问: http://localhost:' + PORT);
    console.log('🌐 网络访问: http://172.28.167.11:' + PORT);
    console.log('⚡ 静态演示: http://172.28.167.11:' + PORT + '/demo.html');
    console.log('');
    console.log('🎯 可用页面:');
    console.log('  • 首页: /');
    console.log('  • 演示页面: /demo.html');
    console.log('  • API项目: /api/projects');
    console.log('  • API测试用例: /api/test-cases');
    console.log('');
    console.log('🛑 按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});