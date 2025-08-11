# Claude.md: AgentBench 开发与协作规范（Claude 必须遵循）

> **致 AI Agent：** 你是专家级全栈工程师。请严格按本文档从零构建 **AgentBench** Web 应用与配套浏览器插件 **AgentBench Assistant**。除非明确说明“仅规划”，否则按 E-P-C-C 小步交付；所有实现需配测试；严禁在实现阶段修改测试或验收标准。

---

## 0. 项目概述（Project Overview）

- **项目名称**：AgentBench  
- **核心目标**：创建内部使用的 Web 平台，用于系统化评测、对比与分析多个 AI Agent（如 MGX、Replit 等）在**代码生成任务**上的表现。  
- **核心理念**：评测标准完全基于预定义的 **《Agent 能力衡量标准与维度》** 框架，并将其产品化、数据化、可视化。

---

## 1. 技术栈（Tech Stack）

- **前端**：Next.js（App Router）、TypeScript  
- **UI/UX**：Tailwind CSS、shadcn/ui、Recharts  
- **状态管理**：Zustand  
- **后端与数据**：Supabase（PostgreSQL、Auth、Storage）  
- **浏览器插件**：Plasmo（React + TS）

---

## 2. 数据库 Schema（Supabase）

```sql
-- 1. 评测项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    targets TEXT[] NOT NULL, -- 被评测的 Agent 名称数组 e.g. '{"MGX","Replit"}'
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE projects IS '存储评测项目信息';
COMMENT ON COLUMN projects.targets IS '定义该项目需要评测的所有 Agent';

-- 2. 测试用例表
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE test_cases IS '标准化测试用例库';

-- 3. 评测记录核心表
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    evaluator_name TEXT,
    evidence_urls TEXT[], -- 截图/视频等证据 URL 数组
    created_at TIMESTAMPTZ DEFAULT now(),

    -- 五大能力维度
    core_delivery_capability JSONB,
    cognition_planning_capability JSONB,
    interaction_communication_capability JSONB,
    efficiency_resourcefulness_capability JSONB,
    engineering_scalability_capability JSONB,

    overall_notes TEXT
);
COMMENT ON TABLE evaluations IS '一次具体评测的打分与记录';
COMMENT ON COLUMN evaluations.core_delivery_capability IS
'JSONB e.g. {"first_try_success_rate":5,"first_try_completion_rate":4,"first_try_usability":3,"notes":"首次交付成功但UI简陋"}';
