"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDraftManager } from '@/hooks/use-auto-save'
import { DraftKey } from '@/types/draft'
import { 
  Trash2, 
  RefreshCw, 
  Database, 
  Clock, 
  User, 
  FolderOpen,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function DraftsPage() {
  // 模拟当前用户
  const currentUser = {
    id: 'user_123',
    name: '评测员A'
  }

  const {
    drafts,
    loading,
    error,
    loadDrafts,
    deleteDraft,
    cleanupDrafts,
    getStorageStats,
    syncNow,
    syncStatus
  } = useDraftManager(currentUser.id)

  const [stats, setStats] = useState<any>(null)
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const storageStats = await getStorageStats()
    setStats(storageStats)
  }

  const handleCleanup = async () => {
    const count = await cleanupDrafts(7 * 24 * 60 * 60 * 1000) // 清理7天前的草稿
    setCleanupCount(count)
    await loadStats()
    
    // 3秒后清除提示
    setTimeout(() => setCleanupCount(null), 3000)
  }

  const handleDeleteDraft = async (draft: any) => {
    if (confirm('确定要删除这个草稿吗？')) {
      await deleteDraft({
        project_id: draft.project_id,
        test_case_id: draft.test_case_id,
        agent_name: draft.agent_name,
        evaluator_id: draft.evaluator_id
      })
      await loadStats()
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">草稿管理</h1>
        <p className="text-gray-600">管理您的评测草稿和本地存储</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">草稿总数</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_drafts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储大小</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatSize(stats.total_size) : '0 B'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">同步状态</CardTitle>
            {syncStatus.is_offline ? (
              <WifiOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus.pending_changes > 0 ? (
                <span className="text-yellow-600">{syncStatus.pending_changes}</span>
              ) : (
                <span className="text-green-600">0</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">待同步项目</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网络状态</CardTitle>
            {syncStatus.is_offline ? (
              <WifiOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus.is_offline ? '离线' : '在线'}
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStatus.last_sync_at 
                ? `最后同步: ${new Date(syncStatus.last_sync_at).toLocaleTimeString()}`
                : '未同步'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={loadDrafts} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新列表
        </Button>
        
        <Button onClick={syncNow} disabled={syncStatus.is_syncing}>
          {syncStatus.is_syncing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wifi className="w-4 h-4 mr-2" />
          )}
          立即同步
        </Button>
        
        <Button variant="outline" onClick={handleCleanup}>
          <Trash2 className="w-4 h-4 mr-2" />
          清理过期草稿
        </Button>

        {cleanupCount !== null && (
          <Badge variant="secondary">
            已清理 {cleanupCount} 个草稿
          </Badge>
        )}

        {error && (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            {error}
          </Badge>
        )}
      </div>

      {/* 草稿列表 */}
      <Card>
        <CardHeader>
          <CardTitle>我的草稿</CardTitle>
          <CardDescription>
            您的所有评测草稿都会自动保存在本地浏览器中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              加载中...
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无草稿</h3>
              <p className="text-gray-500">开始评测后，您的草稿会自动显示在这里</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目</TableHead>
                  <TableHead>测试用例</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>最后修改</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{draft.project_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>{draft.test_case_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{draft.agent_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatTime(draft.local_updated_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {syncStatus.is_offline ? (
                        <Badge variant="secondary">
                          <WifiOff className="w-3 h-3 mr-1" />
                          离线
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已保存
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // 这里可以跳转到对应的评测页面
                            window.location.href = `/evaluate/${draft.project_id}/${draft.test_case_id}`
                          }}
                        >
                          继续评测
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDraft(draft)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 存储详情 */}
      {stats && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>存储详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">时间信息</h4>
                <div className="space-y-1 text-sm">
                  <div>最早草稿: {stats.oldest_draft ? formatTime(stats.oldest_draft) : '无'}</div>
                  <div>最新草稿: {stats.newest_draft ? formatTime(stats.newest_draft) : '无'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">存储信息</h4>
                <div className="space-y-1 text-sm">
                  <div>总大小: {formatSize(stats.total_size)}</div>
                  <div>平均大小: {stats.total_drafts > 0 ? formatSize(stats.total_size / stats.total_drafts) : '0 B'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}