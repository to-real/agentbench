# Claude.md: AI Agent 评测平台开发计划 

**致AI Agent：** 你好。你是一位专家级的全栈开发者。你的任务是根据这份详细的规格说明书，从零开始构建一个名为 **"AgentBench"** 的Web应用程序和一个配套的浏览器插件。这份文档包含了所有你需要知道的信息，请严格按照以下规格执行。

### **项目概述 (Project Overview)**

- **项目名称:** AgentBench
- **核心目标:** 创建一个内部使用的Web平台，用于系统化地评测、对比和分析多个AI Agent（如MGX, Replit等）在代码生成任务上的表现。
- **核心理念:** 评测标准完全基于我们预定义的 **《Agent能力衡量标准与维度》** 框架，平台需要将这个框架产品化、数据化、可视化。

### **1. 技术栈 (Tech Stack)**

- **前端:** Next.js (使用App Router), TypeScript
- **UI/UX:** Tailwind CSS, shadcn/ui (组件库), Recharts (图表)
- **后端 & 数据库:** Supabase (用于PostgreSQL数据库, 用户认证, 对象存储)
- **状态管理:** Zustand (轻量级状态管理)
- **浏览器插件:** Plasmo (React & TypeScript 插件开发框架)

### **2. 数据库 Schema (Database Schema)**

请在Supabase项目中，使用以下SQL语句创建所需的数据库表。这是平台的数据核心。

```
-- 1. 创建评测项目表 (Projects)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    targets TEXT[] NOT NULL, -- 存储被评测的Agent名称数组, e.g., '{"MGX", "Replit"}'
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE projects IS '存储评测项目信息';
COMMENT ON COLUMN projects.targets IS '定义该项目需要评测的所有Agent';

-- 2. 创建测试用例表 (TestCases)
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[], -- 存储用例标签, e.g., '{"前端", "高复杂度"}'
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE test_cases IS '存储标准化的测试用例库';

-- 3. 创建评测记录核心表 (Evaluations)
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    evaluator_name TEXT,
    evidence_urls TEXT[], -- 存储截图/视频等证据的URL数组
    created_at TIMESTAMPTZ DEFAULT now(),

    -- 核心交付能力维度
    core_delivery_capability JSONB,
    -- 认知与规划能力维度
    cognition_planning_capability JSONB,
    -- 交互与沟通能力维度
    interaction_communication_capability JSONB,
    -- 效率与资源利用维度
    efficiency_resourcefulness_capability JSONB,
    -- 工程化与可扩展性维度
    engineering_scalability_capability JSONB,

    -- 综合评语
    overall_notes TEXT
);
COMMENT ON TABLE evaluations IS '存储每一次具体的评测打分和记录';
COMMENT ON COLUMN evaluations.core_delivery_capability IS 'JSONB object storing scores and notes, e.g., {"first_try_success_rate": 5, "first_try_completion_rate": 4, "first_try_usability": 3, "notes": "首次交付成功但UI简陋"}';
-- (其他capability字段的注释结构类似)
```

### **3. UI/UX 详细规格 (UI/UX Specifications)**

#### **3.1 整体布局 (Overall Layout)**

- 采用经典的仪表盘布局：左侧为固定**侧边栏导航**，右侧为**主内容区域**。
- 使用 `shadcn/ui` 的 `Card`, `Table`, `Button`, `Dialog`, `Input`, `Textarea`, `Select` 等组件构建界面。

#### **3.2 页面规格 (Page Specifications)**

- **页面一: 项目管理 (`/projects`)**
  - **功能:** 展示所有评测项目，并允许创建新项目。
  - **视图:** 使用 `Table` 组件展示项目列表。表格包含列：`项目名称`, `评测目标 (Agents)`, `创建时间`, `操作`。
  - **交互:**
    - 页面右上角有一个“创建新项目” `Button`。
    - 点击按钮，弹出一个 `Dialog`。
    - `Dialog` 中包含一个 `Input` 用于填写“项目名称”，一个 `Input` (支持Tag输入或逗号分隔) 用于填写“评测目标”。
    - 提交后，列表实时更新。
- **页面二: 测试用例库 (`/test-cases`)**
  - **功能:** 展示所有测试用例，并允许创建新用例。
  - **视图:** 使用 `Table` 组件展示用例列表。表格包含列：`用例标题`, `标签 (Tags)`, `创建时间`, `操作`。
  - **交互:**
    - 页面右上角有一个“创建新用例” `Button`。
    - 点击按钮，弹出一个 `Dialog`。
    - `Dialog` 中包含一个 `Input` 用于填写“用例标题”，一个 `Textarea` 用于填写详细的“Prompt”，一个 `Input` (支持Tag输入) 用于填写“标签”。
- **页面三: 评测执行 (`/evaluate`)**
  - **功能:** 这是平台的核心，用于执行评测并记录数据。
  - **视图:**
    1. 页面顶部有两个 `Select` 下拉菜单，分别用于选择“评测项目”和“测试用例”。
    2. 当选择完项目和用例后，下方以 `Tabs` 组件的形式，展示该项目需要评测的所有Agent（例如，"MGX", "Replit" ...）。
    3. 每个Tab下，是一个**结构化的评分表单**。
    4. 表单分为五大 `Card` 区域，分别对应 **《Agent能力衡量标准与维度》** 的五大维度。
    5. 每个 `Card` 内，为该维度的每一项子能力（如“一跳成功率”）提供一个 `Slider` 或 `Radio Group` 用于1-5分打分，旁边附有一个 `Textarea` 用于填写详细的质性评价（notes）。
    6. 表单底部有一个**证据展示区域**，用于显示通过浏览器插件上传的截图或视频。
    7. 最下方是一个“提交评测” `Button`。
- **页面四: 数据分析 (`/analysis`)**
  - **功能:** 可视化对比评测结果。
  - **视图:**
    1. 顶部提供 `Select` 筛选器，用于选择要对比的“评测项目”。
    2. **雷达图 (Radar Chart):** 使用 `Recharts` 绘制。每个Agent为一条线，雷达图的五个顶点为五大能力维度的平均分。
    3. **并排对比视图:** 选择一个测试用例后，以多列布局并排展示每个Agent在该用例下的所有评分和文字记录，方便进行详细对比。

### **4. 辅助工具：AgentBench Assistant 浏览器插件 (NEW)**

**为了解决评测证据收集繁琐的问题，我们需要开发一个配套的浏览器插件。**

- **名称:** AgentBench Assistant
- **类型:** 浏览器插件 (Chrome, Edge, etc.)
- **核心功能:**
  1. **关联评测任务:** 插件弹窗中，用户可以从下拉菜单选择当前正在进行的“评测项目”和“测试用例”，以确保证据能关联到正确的评测记录上。
  2. **一键截图:** 提供“截取可见区域”和“截取整个页面”的按钮。点击后，自动将截图上传至Supabase Storage，并将返回的URL更新到`Evaluations`表中对应的`evidence_urls`字段。
  3. **录制屏幕 (进阶):** 提供“开始录制”/“停止录制”功能，用于记录关键的交互流程。录制结束后，将视频文件上传并关联。
  4. **状态同步:** 插件可以与AgentBench主应用页面通信，自动获取当前正在进行的评测任务信息，减少用户手动选择的步骤。

### **5. 开发步骤 (Development Steps)**

1. **Phase 1: 环境搭建与数据库 (预计1天)**
   - 初始化Next.js项目，配置好TypeScript, Tailwind CSS, 和 shadcn/ui。
   - 在Supabase后台执行SQL，创建好三张核心表。
2. **Phase 2: 核心Web应用开发 (预计5天)**
   - 按照UI/UX规格，依次开发 `/projects`, `/test-cases`, `/evaluate` 和 `/analysis` 页面。
   - 重点是 `/evaluate` 页面的动态表单构建和与Supabase的数据交互逻辑。
3. **Phase 3: 浏览器插件开发 (预计3天)**
   - 使用 Plasmo 框架初始化插件项目。
   - 开发插件UI，实现与Supabase的认证和数据交互。
   - 实现核心的截图、上传和数据关联功能。
4. **Phase 4: 联调与部署 (预计2天)**
   - 联调Web应用与浏览器插件，确保状态同步和数据流转顺畅。
   - 将Web应用部署到Vercel，并打包浏览器插件以供内部分发。

**给Agent的最终指令：** "请严格按照以上 `claude.md` 的详细规格说明，开始构建 **AgentBench** 平台及其配套的 **AgentBench Assistant** 浏览器插件。从 **Phase 1** 开始，初始化项目并设置好数据库。"