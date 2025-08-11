// 草稿数据类型定义
export interface DraftFormField {
  value: number | string
  updated_at: number // Unix timestamp
}

export interface DraftCapabilitySection {
  [key: string]: DraftFormField
}

export interface DraftFormData {
  core_delivery_capability: DraftCapabilitySection
  cognition_planning_capability: DraftCapabilitySection
  interaction_communication_capability: DraftCapabilitySection
  efficiency_resourcefulness_capability: DraftCapabilitySection
  engineering_scalability_capability: DraftCapabilitySection
  overall_notes: DraftFormField
}

export interface EvaluationDraft {
  id?: string
  project_id: string
  test_case_id: string
  agent_name: string
  evaluator_id: string
  evaluator_name?: string
  form_data: DraftFormData
  local_updated_at: number
  cloud_updated_at?: number
  version: number
  metadata?: {
    device_info?: string
    browser_info?: string
    session_id?: string
  }
}

// 草稿键结构
export interface DraftKey {
  project_id: string
  test_case_id: string
  agent_name: string
  evaluator_id: string
}

// 合并结果
export interface MergeResult {
  merged_data: DraftFormData
  merge_summary: {
    local_fields_kept: string[]
    cloud_fields_kept: string[]
    conflicts_resolved: string[]
    total_fields: number
  }
  merge_timestamp: number
}

// 草稿同步状态
export interface DraftSyncStatus {
  is_syncing: boolean
  last_sync_at?: number
  sync_error?: string
  pending_changes: number
  is_offline: boolean
}

// 队列项目
export interface DraftQueueItem {
  id: string
  type: 'save' | 'merge' | 'clear'
  draft_key: DraftKey
  data: Partial<EvaluationDraft>
  timestamp: number
  retry_count: number
  next_retry_at?: number
}

// 存储接口
export interface DraftStorage {
  saveDraft(draft: EvaluationDraft): Promise<void>
  getDraft(key: DraftKey): Promise<EvaluationDraft | null>
  mergeDraft(local: EvaluationDraft, cloud: EvaluationDraft): Promise<MergeResult>
  clearDraft(key: DraftKey): Promise<void>
  listDrafts(evaluator_id: string): Promise<EvaluationDraft[]>
}

// 本地存储接口
export interface LocalDraftStorage extends DraftStorage {
  getAllDrafts(): Promise<EvaluationDraft[]>
  clearAllDrafts(): Promise<void>
  getDraftsByProject(project_id: string): Promise<EvaluationDraft[]>
}

// 云端存储接口
export interface CloudDraftStorage extends DraftStorage {
  syncDraft(draft: EvaluationDraft): Promise<EvaluationDraft>
  getDraftHistory(key: DraftKey): Promise<EvaluationDraft[]>
  createBackup(draft: EvaluationDraft): Promise<void>
  restoreBackup(key: DraftKey, backup_id: string): Promise<EvaluationDraft>
}

// 合并策略选项
export interface MergeStrategy {
  conflict_resolution: 'local_wins' | 'cloud_wins' | 'newest_wins' | 'manual'
  auto_merge: boolean
  backup_before_merge: boolean
  notify_on_conflict: boolean
}

// 草稿配置
export interface DraftConfig {
  auto_save_delay: number // 800ms
  max_retries: number
  retry_delay: number // 指数退避基数
  max_queue_size: number
  local_storage_key: string
  enable_offline_mode: boolean
  merge_strategy: MergeStrategy
}

// 默认配置
export const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  auto_save_delay: 800,
  max_retries: 3,
  retry_delay: 1000,
  max_queue_size: 100,
  local_storage_key: 'agentbench_drafts',
  enable_offline_mode: true,
  merge_strategy: {
    conflict_resolution: 'newest_wins',
    auto_merge: true,
    backup_before_merge: true,
    notify_on_conflict: true
  }
}

// 字段路径映射
export const FIELD_PATHS = {
  'core_delivery_capability.first_try_success_rate': '核心交付能力.首次尝试成功率',
  'core_delivery_capability.first_try_completion_rate': '核心交付能力.首次尝试完成率',
  'core_delivery_capability.first_try_usability': '核心交付能力.首次尝试可用性',
  'core_delivery_capability.notes': '核心交付能力.详细说明',
  'cognition_planning_capability.problem_understanding': '认知与规划能力.问题理解能力',
  'cognition_planning_capability.planning_ability': '认知与规划能力.规划能力',
  'cognition_planning_capability.requirement_clarification': '认知与规划能力.需求澄清能力',
  'cognition_planning_capability.notes': '认知与规划能力.详细说明',
  'interaction_communication_capability.communication_clarity': '交互与沟通能力.沟通清晰度',
  'interaction_communication_capability.feedback_response': '交互与沟通能力.反馈响应能力',
  'interaction_communication_capability.notes': '交互与沟通能力.详细说明',
  'efficiency_resourcefulness_capability.code_efficiency': '效率与资源利用.代码效率',
  'efficiency_resourcefulness_capability.resource_optimization': '效率与资源利用.资源优化',
  'efficiency_resourcefulness_capability.notes': '效率与资源利用.详细说明',
  'engineering_scalability_capability.code_quality': '工程化与可扩展性.代码质量',
  'engineering_scalability_capability.maintainability': '工程化与可扩展性.可维护性',
  'engineering_scalability_capability.scalability': '工程化与可扩展性.可扩展性',
  'engineering_scalability_capability.error_handling': '工程化与可扩展性.错误处理',
  'engineering_scalability_capability.documentation': '工程化与可扩展性.文档质量',
  'engineering_scalability_capability.notes': '工程化与可扩展性.详细说明',
  'overall_notes': '综合评语'
} as const

// 工具函数
export const draftUtils = {
  // 生成草稿键
  generateDraftKey(project_id: string, test_case_id: string, agent_name: string, evaluator_id: string): DraftKey {
    return {
      project_id,
      test_case_id,
      agent_name,
      evaluator_id
    }
  },

  // 生成草稿ID
  generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // 序列化草稿键
  serializeDraftKey(key: DraftKey): string {
    return `${key.project_id}:${key.test_case_id}:${key.agent_name}:${key.evaluator_id}`
  },

  // 反序列化草稿键
  deserializeDraftKey(serialized: string): DraftKey {
    const [project_id, test_case_id, agent_name, evaluator_id] = serialized.split(':')
    return { project_id, test_case_id, agent_name, evaluator_id }
  },

  // 检查是否需要合并
  needsMerge(local: EvaluationDraft, cloud: EvaluationDraft): boolean {
    return local.local_updated_at !== cloud.cloud_updated_at
  },

  // 获取字段路径
  getFieldPath(section: string, field: string): string {
    return `${section}.${field}`
  },

  // 获取字段标签
  getFieldLabel(path: string): string {
    return FIELD_PATHS[path as keyof typeof FIELD_PATHS] || path
  },

  // 深度比较两个草稿的差异
  compareDrafts(draft1: EvaluationDraft, draft2: EvaluationDraft): string[] {
    const differences: string[] = []
    
    // 比较每个字段
    Object.keys(draft1.form_data).forEach(section => {
      const section1 = draft1.form_data[section as keyof DraftFormData]
      const section2 = draft2.form_data[section as keyof DraftFormData]
      
      Object.keys(section1).forEach(field => {
        const field1 = section1[field as keyof typeof section1]
        const field2 = section2[field as keyof typeof section2]
        
        if (field1.updated_at !== field2.updated_at) {
          differences.push(this.getFieldPath(section, field))
        }
      })
    })
    
    return differences
  }
}