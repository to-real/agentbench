"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database,
  Sync
} from 'lucide-react'
import { DraftSyncStatus } from '@/types/draft'

interface SyncStatusIndicatorProps {
  syncStatus: DraftSyncStatus
  onSync?: () => void
  isSyncing?: boolean
  showDetails?: boolean
}

export function SyncStatusIndicator({ 
  syncStatus, 
  onSync, 
  isSyncing = false,
  showDetails = false 
}: SyncStatusIndicatorProps) {
  const [lastSyncTime, setLastSyncTime] = useState<string>('')

  useEffect(() => {
    if (syncStatus.last_sync_at) {
      setLastSyncTime(formatTime(syncStatus.last_sync_at))
    }
  }, [syncStatus.last_sync_at])

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return new Date(timestamp).toLocaleDateString()
  }

  const getStatusColor = () => {
    if (syncStatus.is_offline) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (syncStatus.is_syncing) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (syncStatus.conflicts.length > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (syncStatus.pending_changes > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusIcon = () => {
    if (syncStatus.is_offline) return <WifiOff className="w-4 h-4" />
    if (syncStatus.is_syncing) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (syncStatus.conflicts.length > 0) return <AlertCircle className="w-4 h-4" />
    if (syncStatus.pending_changes > 0) return <Clock className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (syncStatus.is_offline) return '离线'
    if (syncStatus.is_syncing) return '同步中...'
    if (syncStatus.conflicts.length > 0) return `冲突 (${syncStatus.conflicts.length})`
    if (syncStatus.pending_changes > 0) return `待同步 (${syncStatus.pending_changes})`
    return '已同步'
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {lastSyncTime && (
          <span className="text-xs opacity-75">{lastSyncTime}</span>
        )}
        {onSync && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSync}
            disabled={isSyncing || syncStatus.is_offline}
            className="ml-auto"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sync className="w-4 h-4" />
          同步状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主要状态 */}
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${getStatusColor()}`}>
          {getStatusIcon()}
          <div className="flex-1">
            <div className="text-sm font-medium">{getStatusText()}</div>
            {lastSyncTime && (
              <div className="text-xs opacity-75">上次同步: {lastSyncTime}</div>
            )}
          </div>
          {onSync && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSync}
              disabled={isSyncing || syncStatus.is_offline}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  同步中
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  立即同步
                </>
              )}
            </Button>
          )}
        </div>

        {/* 网络状态 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {syncStatus.is_offline ? (
              <WifiOff className="w-4 h-4 text-orange-500" />
            ) : (
              <Wifi className="w-4 h-4 text-green-500" />
            )}
            <span>网络状态</span>
          </div>
          <Badge variant={syncStatus.is_offline ? "secondary" : "default"}>
            {syncStatus.is_offline ? "离线" : "在线"}
          </Badge>
        </div>

        {/* 云端连接 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {syncStatus.is_offline ? (
              <CloudOff className="w-4 h-4 text-gray-400" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-500" />
            )}
            <span>云端连接</span>
          </div>
          <Badge variant={syncStatus.is_offline ? "secondary" : "default"}>
            {syncStatus.is_offline ? "断开" : "已连接"}
          </Badge>
        </div>

        {/* 冲突信息 */}
        {syncStatus.conflicts.length > 0 && (
          <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                发现 {syncStatus.conflicts.length} 个冲突
              </span>
            </div>
            <div className="text-xs text-yellow-700">
              部分字段存在冲突，需要手动解决
            </div>
          </div>
        )}

        {/* 队列状态 */}
        {syncStatus.pending_changes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>待同步项目</span>
              <span className="font-medium">{syncStatus.pending_changes}</span>
            </div>
            <Progress value={Math.min(syncStatus.pending_changes * 10, 100)} className="h-2" />
          </div>
        )}

        {/* 存储信息 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span>存储模式</span>
          </div>
          <Badge variant="outline">
            本地 + 云端
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}