# AgentBench - AI Agent评测平台

![AgentBench Logo](https://img.shields.io/badge/AgentBench-AI%20Agent%E8%AF%84%E6%B5%8B%E5%B9%B3%E5%8F%B0-blue)

一个系统化的AI Agent评测平台，用于评测、对比和分析多个AI Agent在代码生成任务上的表现。

## 🚀 项目概述

AgentBench是一个完整的评测解决方案，包含：

- **📊 Web应用**: 基于Next.js的评测管理平台
- **🔌 浏览器插件**: 基于Plasmo的截图证据收集工具
- **🗄️ 数据库**: 基于Supabase的数据存储和实时同步
- **🤖 AI评分**: 集成GLM API的智能评分系统

## ✨ 核心功能

### 评测管理
- 📋 项目管理 - 创建和管理评测项目
- 🧪 测试用例库 - 标准化的测试用例管理
- 📝 评测执行 - 结构化的评分表单
- 📈 数据分析 - 雷达图和多维度对比分析

### 智能评分
- 🤖 基于GLM API的自动评分
- 📏 五大能力维度评估
- 🎯 一跳成功率、完成率等关键指标
- 📝 智能生成质性评价

### 浏览器插件
- 📸 一键截图功能
- 🔗 自动关联评测任务
- 🔄 实时状态同步
- 💾 证据自动上传到Supabase

## 🏗️ 技术架构

### 前端技术栈
- **Next.js 14** - React全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI组件库
- **Recharts** - 数据可视化
- **Zustand** - 状态管理

### 后端技术栈
- **Supabase** - 数据库和认证
- **PostgreSQL** - 主数据库
- **Storage** - 文件存储
- **Realtime** - 实时数据同步

### 浏览器插件
- **Plasmo** - 插件开发框架
- **React** - UI组件
- **Chrome Extension API** - 浏览器功能
- **Supabase JS** - 数据同步

## 📁 项目结构

```
agentbench/
├── agentbench-webapp/              # Next.js Web应用
│   ├── src/
│   │   ├── app/                  # App Router页面
│   │   │   ├── projects/        # 项目管理页面
│   │   │   ├── test-cases/      # 测试用例页面
│   │   │   ├── evaluate/        # 评测执行页面
│   │   │   └── analysis/        # 数据分析页面
│   │   ├── components/           # React组件
│   │   │   ├── ui/              # shadcn/ui组件
│   │   │   ├── interactive-*.tsx # 交互式图表组件
│   │   │   └── tag-*.tsx        # 标签管理组件
│   │   └── lib/                  # 工具库
│   │       ├── supabase.ts      # Supabase配置
│   │       └── analysis-*.ts    # 数据分析类型
│   ├── public/                   # 静态资源
│   ├── package.json              # 依赖配置
│   ├── vercel.json               # Vercel部署配置
│   └── .env.example              # 环境变量模板
├── agentbench/
│   ├── agentbench-assistant/     # 浏览器插件
│   │   ├── popup.tsx           # 主弹窗
│   │   ├── background.ts        # 后台脚本
│   │   ├── contents.tsx         # 内容脚本
│   │   ├── components/ui/        # UI组件
│   │   ├── lib/                 # 工具库
│   │   ├── package.json         # 依赖配置
│   │   └── build.sh            # 构建脚本
│   └── websocket-server/        # WebSocket服务器
│       ├── server.js            # 服务器主文件
│       ├── package.json         # 依赖配置
│       └── Dockerfile           # Docker配置
├── CLAUDE.md                    # 项目规格说明
├── DEPLOYMENT.md                # 部署指南
├── docker-compose.yml           # Docker编排配置
└── README.md                    # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm
- Supabase 账户
- Chrome 浏览器

### 1. 克隆项目
```bash
git clone https://github.com/your-username/agentbench.git
cd agentbench
```

### 2. 配置Supabase
1. 创建Supabase项目
2. 执行 `agentbench/supabase-schema.sql` 创建数据库表
3. 获取项目URL和API密钥

### 3. 安装依赖
```bash
# Web应用
cd agentbench
npm install

# 浏览器插件
cd agentbench/agentbench-assistant
npm install
```

### 4. 配置环境变量
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. 启动开发服务器
```bash
# Web应用
npm run dev

# 浏览器插件 (另一个终端)
cd agentbench/agentbench-assistant
npm run dev
```

### 6. 加载浏览器插件
1. 打开Chrome扩展页面 (`chrome://extensions/`)
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `agentbench/agentbench-assistant` 目录

## 📖 使用指南

### 创建评测项目
1. 打开Web应用 (`http://localhost:3000`)
2. 进入"项目管理"页面
3. 点击"创建新项目"
4. 填写项目名称和评测目标Agent

### 执行评测
1. 选择项目和测试用例
2. 填写评分表单或使用AI自动评分
3. 查看评测结果和分析

### 使用插件收集证据
1. 配置Supabase连接信息
2. 选择当前评测任务
3. 在目标页面点击截图
4. 证据自动关联到评测记录

## 📊 评测维度

基于《Agent能力衡量标准与维度》框架，评测包含五大维度：

1. **核心交付能力** - 一跳成功率、完成率、可用性
2. **认知与规划能力** - 需求理解、方案设计、复杂度处理
3. **交互与沟通能力** - 沟通效率、协作能力、用户理解
4. **效率与资源利用** - 时间效率、资源利用、优化能力
5. **工程化与可扩展性** - 代码质量、架构设计、可维护性

## 🚀 部署

### Web应用部署
```bash
# 构建项目
npm run build

# 部署到Vercel
npm install -g vercel
vercel --prod
```

### 插件打包
```bash
cd agentbench/agentbench-assistant
npm run build
npm run package
```

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React框架
- [Supabase](https://supabase.com/) - 后端即服务
- [Plasmo](https://plasmo.com/) - 浏览器插件框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架

## 📞 联系我们

- 项目主页: [https://github.com/your-username/agentbench](https://github.com/your-username/agentbench)
- 问题反馈: [Issues](https://github.com/your-username/agentbench/issues)
- 邮箱: [zjyyyds121@gmail.com](mailto:zjyyyds121@gmail.com)

---

⭐ 如果这个项目对您有帮助，请给我们一个star！
