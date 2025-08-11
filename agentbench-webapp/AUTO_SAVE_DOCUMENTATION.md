# 自动保存与云端同步系统文档

## 概述

AgentBench 平台实现了一个完整的自动保存与云端同步系统，确保评测过程中的数据安全性和多设备协作能力。

## 核心特性

### ✅ 已实现功能

1. **本地持久化存储**
   - 基于 localStorage 的草稿存储
   - 字段级别的更新时间戳
   - 数据验证和清理
   - 自动过期清理

2. **自动保存机制**
   - 800ms 防抖延迟保存
   - 表单变更自动检测
   - 保存状态实时反馈
   - 组件卸载时自动保存

3. **云端同步功能**
   - 基于 Supabase 的云端存储
   - 智能冲突解决策略
   - 离线/在线状态检测
   - 队列化同步操作

4. **草稿管理**
   - 草稿列表查看
   - 存储统计信息
   - 过期草稿清理
   - 手动同步控制

5. **UI 组件**
   - 同步状态指示器
   - 进度显示
   - 冲突提醒
   - 网络状态显示

## 系统架构

### 核心模块

```
src/
├── components/
│   ├── evaluation-form.tsx          # 评测表单组件
│   └── sync-status-indicator.tsx    # 同步状态指示器
├── hooks/
│   └── use-auto-save.ts             # 自动保存 Hook
├── lib/
│   ├── draft-storage.ts             # 本地存储实现
│   ├── draft-manager.ts             # 草稿管理器
│   ├── cloud-storage.ts             # 云端存储接口
│   └── cloud-sync-manager.ts        # 云端同步管理器
└── types/
    └── draft.ts                     # 数据类型定义
```

### 数据流

```
表单输入 → 自动保存 Hook → 草稿管理器 → 本地存储 → 云端同步
```

## 使用方法

### 1. 基本使用

```tsx
import { EvaluationForm } from '@/components/evaluation-form'

function EvaluationPage() {
  return (
    <EvaluationForm
      agentName="MGX"
      testCase={{ title: '测试用例', prompt: '...' }}
      projectId="project_1"
      testCaseId="test_1"
      evaluatorId="user_123"
      enableAutoSave={true}
      onSave={(data) => console.log('保存:', data)}
    />
  )
}
```

### 2. 云端同步配置

```tsx
// 在应用初始化时
import { initializeCloudSyncFromEnv } from '@/lib/cloud-sync-manager'

initializeCloudSyncFromEnv()
```

### 3. 环境变量配置

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 4. 草稿管理

```tsx
import { useDraftManager } from '@/hooks/use-auto-save'

function DraftsPage() {
  const { drafts, loadDrafts, deleteDraft, cleanupDrafts } = useDraftManager('user_123')
  
  return (
    <div>
      {/* 草稿列表和管理 */}
    </div>
  )
}
```

## 数据库结构

### evaluation_drafts 表

```sql
CREATE TABLE evaluation_drafts (
    id UUID PRIMARY KEY,
    project_id TEXT NOT NULL,
    test_case_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    evaluator_id TEXT NOT NULL,
    evaluator_name TEXT,
    form_data JSONB NOT NULL,
    local_updated_at BIGINT NOT NULL,
    cloud_updated_at BIGINT NOT NULL,
    sync_status TEXT NOT NULL,
    version INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 冲突解决策略

### 支持的策略

1. **LOCAL_WIN** - 本地数据优先
2. **CLOUD_WIN** - 云端数据优先
3. **LATEST_WIN** - 最新时间戳优先（默认）
4. **MANUAL_MERGE** - 手动合并

### 配置方法

```tsx
import { cloudSyncManager } from '@/lib/cloud-sync-manager'

cloudSyncManager.updateConfig({
  conflictStrategy: 'latest_win'
})
```

## 性能优化

### 1. 本地存储优化

- 使用 JSON 序列化减少存储空间
- 字段级别更新避免全量保存
- 自动清理过期数据

### 2. 网络优化

- 队列化同步操作
- 智能重试机制
- 离线模式支持

### 3. 用户体验优化

- 实时状态反馈
- 进度指示器
- 冲突提醒

## 监控与调试

### 1. 状态监控

```tsx
import { getSyncStatus } from '@/lib/cloud-sync-manager'

const status = getSyncStatus()
console.log('同步状态:', status)
```

### 2. 调试信息

```tsx
// 开启调试模式
localStorage.setItem('draft_debug', 'true')
```

### 3. 存储统计

```tsx
const { getStorageStats } = useDraftManager()
const stats = await getStorageStats()
console.log('存储统计:', stats)
```

## 最佳实践

### 1. 数据安全

- 定期清理过期草稿
- 验证用户输入数据
- 加密敏感信息

### 2. 性能考虑

- 合理设置自动保存延迟
- 避免频繁的云端同步
- 监控存储空间使用

### 3. 用户体验

- 提供清晰的同步状态反馈
- 支持手动同步操作
- 处理网络异常情况

## 故障排除

### 常见问题

1. **自动保存不工作**
   - 检查浏览器是否支持 localStorage
   - 确认表单字段绑定正确

2. **云端同步失败**
   - 检查网络连接
   - 验证 Supabase 配置
   - 查看控制台错误信息

3. **数据冲突**
   - 检查冲突解决策略
   - 手动解决冲突
   - 清理异常草稿

### 调试步骤

1. 检查浏览器控制台错误
2. 验证 localStorage 数据
3. 检查网络连接状态
4. 查看 Supabase 数据库
5. 检查环境变量配置

## 扩展功能

### 1. 多设备同步
- 实现实时协作
- 设备间状态同步
- 冲突解决优化

### 2. 数据导出
- 草稿数据导出
- 批量操作支持
- 数据备份恢复

### 3. 高级功能
- 版本历史记录
- 数据加密存储
- 离线优先模式

## 总结

AgentBench 的自动保存与云端同步系统提供了完整的数据持久化解决方案，确保评测过程中的数据安全性和用户体验。系统采用模块化设计，支持灵活配置和扩展，能够满足不同场景的需求。