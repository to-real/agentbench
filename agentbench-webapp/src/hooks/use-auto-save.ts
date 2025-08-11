import { useEffect, useRef, useCallback, useState } from 'react'
import { DraftFormData, DraftKey, DraftSyncStatus } from '@/types/draft'
import { draftManager } from '@/lib/draft-manager'

/**
 * 自动保存 Hook 配置
 */
export interface UseAutoSaveOptions {
  /** 自动保存延迟（毫秒） */
  delay?: number
  /** 是否启用自动保存 */
  enabled?: boolean
  /** 保存成功回调 */
  onSaveSuccess?: () => void
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void
  /** 草稿键 */
  draftKey: DraftKey
}

/**
 * 自动保存 Hook 返回值
 */
export interface UseAutoSaveReturn {
  /** 表单数据 */
  formData: DraftFormData | null
  /** 同步状态 */
  syncStatus: DraftSyncStatus
  /** 是否正在保存 */
  isSaving: boolean
  /** 最后保存时间 */
  lastSavedAt: number | null
  /** 更新字段 */
  updateField: (section: keyof DraftFormData, field: string, value: number | string) => void
  /** 更新整个表单数据 */
  updateFormData: (data: Partial<DraftFormData>) => void
  /** 手动保存 */
  saveNow: () => Promise<void>
  /** 重置表单 */
  resetForm: () => void
  /** 清除草稿 */
  clearDraft: () => Promise<void>
}

/**
 * 自动保存 Hook
 * 提供表单数据的自动保存功能
 */
export function useAutoSave(
  initialData?: Partial<DraftFormData>,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const {
    delay = 800,
    enabled = true,
    onSaveSuccess,
    onSaveError,
    draftKey
  } = options

  const [formData, setFormData] = useState<DraftFormData | null>(null)
  const [syncStatus, setSyncStatus] = useState<DraftSyncStatus>(draftManager.getSyncStatus())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // 加载初始草稿数据
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await draftManager.loadDraft(draftKey)
        
        if (draft) {
          setFormData(draft.form_data)
          setLastSavedAt(draft.local_updated_at)
        } else if (initialData) {
          // 创建新的草稿会话
          const newDraft = await draftManager.startDraftSession(
            draftKey.project_id,
            draftKey.test_case_id,
            draftKey.agent_name,
            draftKey.evaluator_id,
            undefined,
            initialData
          )
          setFormData(newDraft.form_data)
          setLastSavedAt(newDraft.local_updated_at)
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
        if (onSaveError) {
          onSaveError(error as Error)
        }
      }
    }

    if (enabled && draftKey) {
      loadDraft()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [draftKey, enabled, initialData, onSaveError])

  // 监听同步状态变化
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setSyncStatus(draftManager.getSyncStatus())
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  // 保存数据的函数
  const saveData = useCallback(async (data: Partial<DraftFormData>) => {
    if (!enabled || !draftKey) {
      return
    }

    try {
      setIsSaving(true)
      
      if (formData) {
        // 更新现有数据
        await draftManager.updateFormData(draftKey, data)
      } else {
        // 创建新的草稿会话
        const draft = await draftManager.startDraftSession(
          draftKey.project_id,
          draftKey.test_case_id,
          draftKey.agent_name,
          draftKey.evaluator_id,
          undefined,
          data
        )
        setFormData(draft.form_data)
      }
      
      setLastSavedAt(Date.now())
      
      if (onSaveSuccess) {
        onSaveSuccess()
      }
    } catch (error) {
      console.error('Auto save failed:', error)
      if (onSaveError) {
        onSaveError(error as Error)
      }
    } finally {
      setIsSaving(false)
    }
  }, [enabled, draftKey, formData, onSaveSuccess, onSaveError])

  // 延迟保存
  const scheduleSave = useCallback((data: Partial<DraftFormData>) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    if (enabled) {
      saveTimerRef.current = setTimeout(() => {
        saveData(data)
      }, delay)
    }
  }, [saveData, enabled, delay])

  // 更新字段
  const updateField = useCallback((section: keyof DraftFormData, field: string, value: number | string) => {
    if (!formData) {
      return
    }

    const updatedData = {
      ...formData,
      [section]: {
        ...formData[section],
        [field]: {
          value,
          updated_at: Date.now()
        }
      }
    }

    setFormData(updatedData)
    scheduleSave({ [section]: { [field]: { value, updated_at: Date.now() } } })
  }, [formData, scheduleSave])

  // 更新整个表单数据
  const updateFormData = useCallback((data: Partial<DraftFormData>) => {
    if (!formData) {
      return
    }

    const updatedData = { ...formData, ...data }
    setFormData(updatedData)
    scheduleSave(data)
  }, [formData, scheduleSave])

  // 手动保存
  const saveNow = useCallback(async () => {
    if (!formData) {
      return
    }

    // 立即取消定时保存
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    await saveData(formData)
  }, [formData, saveData])

  // 重置表单
  const resetForm = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    if (initialData) {
      setFormData(initialData as DraftFormData)
    } else {
      setFormData(null)
    }
  }, [initialData])

  // 清除草稿
  const clearDraft = useCallback(async () => {
    if (!draftKey) {
      return
    }

    try {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      await draftManager.deleteDraft(draftKey)
      setFormData(null)
      setLastSavedAt(null)
    } catch (error) {
      console.error('Failed to clear draft:', error)
      if (onSaveError) {
        onSaveError(error as Error)
      }
    }
  }, [draftKey, onSaveError])

  // 组件卸载时保存未保存的数据
  useEffect(() => {
    return () => {
      if (saveTimerRef.current && formData) {
        clearTimeout(saveTimerRef.current)
        // 保存最终数据
        saveData(formData)
      }
    }
  }, [formData, saveData])

  return {
    formData,
    syncStatus,
    isSaving,
    lastSavedAt,
    updateField,
    updateFormData,
    saveNow,
    resetForm,
    clearDraft
  }
}

/**
 * 草稿管理 Hook
 * 提供草稿列表和管理功能
 */
export function useDraftManager(evaluatorId?: string) {
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载草稿列表
  const loadDrafts = useCallback(async () => {
    if (!evaluatorId) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const userDrafts = await draftManager.getUserDrafts(evaluatorId)
      setDrafts(userDrafts)
    } catch (err) {
      console.error('Failed to load drafts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }, [evaluatorId])

  // 删除草稿
  const deleteDraft = useCallback(async (draftKey: DraftKey) => {
    try {
      await draftManager.deleteDraft(draftKey)
      setDrafts(prev => prev.filter(draft => 
        !(draft.project_id === draftKey.project_id &&
          draft.test_case_id === draftKey.test_case_id &&
          draft.agent_name === draftKey.agent_name &&
          draft.evaluator_id === draftKey.evaluator_id)
      ))
    } catch (err) {
      console.error('Failed to delete draft:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    }
  }, [])

  // 清理过期草稿
  const cleanupDrafts = useCallback(async (maxAge?: number) => {
    try {
      const cleanedCount = await draftManager.cleanup(maxAge)
      await loadDrafts() // 重新加载列表
      return cleanedCount
    } catch (err) {
      console.error('Failed to cleanup drafts:', err)
      setError(err instanceof Error ? err.message : 'Failed to cleanup drafts')
      return 0
    }
  }, [loadDrafts])

  // 获取存储统计
  const getStorageStats = useCallback(async () => {
    try {
      return await draftManager.getStats()
    } catch (err) {
      console.error('Failed to get storage stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to get storage stats')
      return null
    }
  }, [])

  // 手动同步
  const syncNow = useCallback(async () => {
    try {
      await draftManager.syncNow()
      await loadDrafts() // 重新加载列表
    } catch (err) {
      console.error('Failed to sync:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync')
    }
  }, [loadDrafts])

  // 初始加载
  useEffect(() => {
    if (evaluatorId) {
      loadDrafts()
    }
  }, [evaluatorId, loadDrafts])

  return {
    drafts,
    loading,
    error,
    loadDrafts,
    deleteDraft,
    cleanupDrafts,
    getStorageStats,
    syncNow,
    syncStatus: draftManager.getSyncStatus()
  }
}

/**
 * 网络状态 Hook
 * 监听网络连接状态
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}