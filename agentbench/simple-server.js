const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

// 静态文件服务
app.use(express.static(__dirname));

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'demo.html'));
});

// API路由示例
app.get('/api/projects', (req, res) => {
    res.json([
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
    ]);
});

app.get('/api/test-cases', (req, res) => {
    res.json([
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
    ]);
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AgentBench 演示服务器启动成功！`);
    console.log(`📱 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 网络访问: http://172.28.167.11:${PORT}`);
    console.log(`⚡ 静态演示: http://172.28.167.11:${PORT}/demo.html`);
});