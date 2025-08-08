# AgentBench 部署指南

## 项目状态

✅ **Phase 1 完成**: 环境搭建与数据库设置
✅ **Phase 2 完成**: 核心Web应用开发  
✅ **Phase 3 完成**: 浏览器插件开发
🔄 **Phase 4 进行中**: 联调与部署

## 部署准备

### 1. 环境检查

确保以下环境已准备就绪：

- **Node.js** (v18+)
- **npm** 或 **pnpm**
- **Supabase** 项目
- **Chrome** 浏览器

### 2. 项目结构

```
agentbench/
├── agentbench-assistant/     # 浏览器插件
├── webapp/                   # Next.js 主应用
└── CLAUDE.md                # 项目规格说明
```

## 主应用部署 (Vercel)

### 1. 准备主应用

```bash
# 进入主应用目录
cd webapp

# 安装依赖
npm install

# 构建项目
npm run build

# 本地测试
npm run dev
```

### 2. Vercel 部署

1. **安装 Vercel CLI**:
```bash
npm install -g vercel
```

2. **登录 Vercel**:
```bash
vercel login
```

3. **部署项目**:
```bash
vercel --prod
```

4. **配置环境变量**:
在 Vercel 控制台中添加以下环境变量：
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 浏览器插件部署

### 1. 构建插件

```bash
# 进入插件目录
cd agentbench-assistant

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 2. 插件打包

```bash
# 打包插件
npm run package

# 或者手动压缩
cd build/chrome-mv3-prod
zip -r ../agentbench-assistant.zip .
```

### 3. 分发插件

#### 开发阶段分发

1. **直接加载**:
   - 打开 Chrome 扩展页面 (`chrome://extensions/`)
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `build/chrome-mv3-prod` 目录

#### 生产阶段分发

1. **Chrome Web Store**:
   - 访问 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/developer/dashboard)
   - 支付一次性开发者注册费 ($5)
   - 上传 `agentbench-assistant.zip` 文件
   - 填写插件信息和截图
   - 提交审核

2. **企业内部分发**:
   - 使用 Chrome 企业策略
   - 通过 GPO 或 MDM 解决方案推送
   - 或使用托管存储空间

## 数据库设置

### 1. Supabase 配置

确保 Supabase 项目中已创建必要的表：

```sql
-- 创建评测项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    targets TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建测试用例表
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建评测记录表
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    evaluator_name TEXT,
    evidence_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    core_delivery_capability JSONB,
    cognition_planning_capability JSONB,
    interaction_communication_capability JSONB,
    efficiency_resourcefulness_capability JSONB,
    engineering_scalability_capability JSONB,
    overall_notes TEXT
);
```

### 2. 存储桶设置

创建 Supabase Storage 存储桶用于存储截图：

```sql
-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agentbench-evidence', 'agentbench-evidence', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/gif']);
```

### 3. RLS (Row Level Security) 策略

设置适当的访问权限：

```sql
-- 启用 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- 创建策略 (根据实际需求调整)
CREATE POLICY "Projects are viewable by everyone" ON projects
    FOR SELECT USING (true);

CREATE POLICY "Test cases are viewable by everyone" ON test_cases
    FOR SELECT USING (true);

CREATE POLICY "Evaluations are viewable by everyone" ON evaluations
    FOR SELECT USING (true);
```

## 联调测试

### 1. 端到端测试

1. **部署主应用到 Vercel**
2. **构建并加载浏览器插件**
3. **配置 Supabase 连接**
4. **测试完整流程**:
   - 创建项目
   - 创建测试用例
   - 执行评测
   - 使用插件截图
   - 查看数据分析

### 2. 功能测试清单

- [ ] 主应用所有页面正常工作
- [ ] 插件能够连接 Supabase
- [ ] 截图功能正常
- [ ] 数据同步正常
- [ ] AI 评分功能正常
- [ ] 图表显示正常
- [ ] 移动端适配正常

### 3. 性能测试

- [ ] 页面加载时间 < 3秒
- [ ] 插件响应时间 < 1秒
- [ ] 截图上传时间 < 5秒
- [ ] 数据同步延迟 < 2秒

## 监控与维护

### 1. 错误监控

- **Vercel Analytics**: 监控主应用性能
- **Supabase Logs**: 监控数据库操作
- **Chrome 扩展控制台**: 监控插件错误

### 2. 用户反馈

- 设置用户反馈渠道
- 定期收集使用数据
- 监控错误报告

### 3. 更新维护

- 定期更新依赖包
- 监控安全漏洞
- 备份重要数据

## 故障排除

### 常见问题

1. **插件无法加载**
   - 检查 manifest.json 权限
   - 确认构建文件完整
   - 查看 Chrome 控制台错误

2. **Supabase 连接失败**
   - 检查 API 密钥配置
   - 确认网络连接
   - 验证 CORS 设置

3. **截图功能异常**
   - 检查 Chrome 权限
   - 确认存储桶设置
   - 查看网络请求

### 回滚策略

1. **Vercel**: 使用部署历史回滚
2. **插件**: 降级到之前版本
3. **数据库**: 使用备份恢复

## 部署清单

- [ ] 主应用构建成功
- [ ] 插件构建成功
- [ ] 环境变量配置完成
- [ ] 数据库表创建完成
- [ ] 存储桶配置完成
- [ ] 权限设置完成
- [ ] 端到端测试通过
- [ ] 文档更新完成
- [ ] 用户培训完成

部署完成后，AgentBench 平台即可投入使用！