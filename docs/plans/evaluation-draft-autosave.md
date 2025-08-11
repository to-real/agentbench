# 评分草稿自动保存与跨端合并功能规划

## 任务概述
在 `/evaluate` 页面实现评分草稿的自动保存（本地→云端）与跨端合并功能，确保用户编辑的评测数据不会丢失，并支持多端同步。

## 验收标准 (Given-When-Then)

### 1. 本地恢复
**Given** 我在 `/evaluate` 已为某个 `project_id + test_case_id + agent_name` 填写未提交的表单  
**When** 我刷新页面或重新进入相同项目/用例/Agent的Tab  
**Then** 表单应自动恢复到最近一次草稿（分数与notes全量还原）

### 2. 云端同步
**Given** 我持续编辑评分表单  
**When** 停顿 ≥ 800ms（去抖）或累计更改 ≥ 5项时  
**Then** 系统应本地持久化并尝试上报云端草稿（含`updated_at`），失败时不打断编辑并在后台重试

### 3. 跨端合并
**Given** 本地草稿与云端草稿同时存在且时间戳不同  
**When** 我打开该表单  
**Then** 执行逐字段合并策略（以`updated_at`更新的字段为准；并生成合并摘要供查看），最终呈现合并后的表单状态

### 4. 提交后清理
**Given** 我点击"提交评测"并成功写入evaluations  
**When** 提交完成  
**Then** 清空对应key的本地与云端草稿，并在10秒内提供"撤销清理"的单次可选项

### 5. 离线与回退
**Given** 我处于离线或云端写入失败  
**When** 我继续编辑并恢复网络  
**Then** 本地队列会按时间顺序补发到云端，不覆盖比本地更新更晚的云端字段（仍走逐字段合并）

## 影响面分析

### 前端文件/模块
- `agentbench-webapp/src/app/evaluate/page.tsx` - 挂载/卸载时的草稿恢复与保存钩子
- `agentbench-webapp/src/store/*` (Zustand) - 表单状态与草稿键管理
- `agentbench-webapp/src/lib/supabase.ts` - 云端草稿的读/写/合并API
- `agentbench-webapp/src/components/*` - 新增合并结果提示/冲突提示组件

### 后端/数据库 (Supabase)
- **新增表**: `evaluation_drafts`（或使用Storage存JSON作为退路）
- **RLS策略**: 仅草稿所属用户/同组织角色可读写
- **API端点**: 草稿的CRUD操作接口

### 测试范围
- **单元测试**: 本地持久化、合并函数、上报队列
- **组件测试**: 挂载恢复/提交清理
- **e2e测试**: 跨端打开同一表单的合并与可见性

## 最小拆分步骤 (5步)

### 步骤1: 数据模型与键定义
- 确定草稿键结构 `{project_id, test_case_id, agent_name, evaluator}`
- 设计本地存储结构与字段时间戳（逐字段`updated_at`）
- 定义草稿数据类型和接口

### 步骤2: 本地持久化 MVP
- 在表单变更处debounce(800ms)写入localStorage（或IndexedDB）
- 实现挂载时自动恢复功能
- 编写本地恢复与清理的单测/组件测试（红→绿）

### 步骤3: 云端草稿通道
- 新增`evaluation_drafts`表 + RLS策略
- 实现`getDraft/mergeUpsert/clearDraft` API
- 添加失败重试机制（指数退避）
- 补充单元测试覆盖

### 步骤4: 合并策略与提示
- 实现逐字段合并逻辑（取更新时间更近者）
- 在首次打开/恢复时展示"已合并字段摘要"
- 提供"查看详情/撤销合并"功能
- 开发合并提示UI组件

### 步骤5: 提交流程对接
- 提交成功后清理本地与云端草稿
- 实现10秒撤销窗口功能
- 编写e2e测试场景（跨端编辑→合并→提交→清理）

## 风险与回退策略

### Schema引入风险
**风险**: 新增`evaluation_drafts`表可能延迟上线  
**回退**: 先用Supabase Storage `drafts/{project}/{test}/{agent}/{user}.json`存草稿，等表就绪再迁移

### 数据覆盖/丢失风险
**风险**: 合并策略不当导致覆盖较新内容  
**防护**: 
- 逐字段比较`updated_at`
- 提交与清理前创建本地快照，支持10秒内撤销
- 保留最近1份云端历史

### 离线同步风暴风险
**风险**: 恢复网络后大量补发请求  
**防护**: 
- 限制批量大小 + 指数退避
- 幂等`mergeUpsert`操作

### 隐私与权限风险
**风险**: 草稿被他人读取  
**防护**: 
- RLS以evaluator/组织维度限制
- 草稿不计入正式评测统计

### 性能风险
**风险**: 表单频繁写入影响性能  
**防护**: 
- debounce + 仅写入变更字段
- 本地存储容量监控与清理策略

## 技术架构考虑

### 存储方案
```typescript
interface DraftData {
  project_id: string
  test_case_id: string
  agent_name: string
  evaluator_id: string
  form_data: {
    // 五大能力维度的评分和notes
    core_delivery_capability: {
      first_try_success_rate: { value: number; notes: string; updated_at: number }
      // ... 其他字段
    }
    // ... 其他维度
  }
  local_updated_at: number
  cloud_updated_at?: number
}
```

### 合并算法
```typescript
function mergeDrafts(local: DraftData, cloud: DraftData): DraftData {
  const result = { ...local }
  
  // 逐字段比较，取更新的版本
  for (const dimension of allDimensions) {
    for (const field of dimension.fields) {
      const localField = local.form_data[dimension][field]
      const cloudField = cloud.form_data[dimension][field]
      
      if (cloudField.updated_at > localField.updated_at) {
        result.form_data[dimension][field] = cloudField
      }
    }
  }
  
  return result
}
```

## 成功指标
- 用户编辑数据99.9%不丢失
- 跨端合并准确率100%
- 提交后草稿清理成功率100%
- 离线编辑恢复成功率100%
- 性能影响：页面加载时间增加<100ms