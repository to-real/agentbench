"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Settings, Trash2, Palette, Tag, Hash, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface TagData {
  id: string
  name: string
  color: string
  description?: string
  usage_count: number
  created_at: string
}

interface TagManagementProps {
  tags: string[]
  onUpdateTags: (tags: string[]) => void
}

const TAG_COLORS = [
  { name: '蓝色', value: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-800' },
  { name: '绿色', value: '#10b981', bg: 'bg-green-100', text: 'text-green-800' },
  { name: '红色', value: '#ef4444', bg: 'bg-red-100', text: 'text-red-800' },
  { name: '黄色', value: '#f59e0b', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { name: '紫色', value: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-800' },
  { name: '粉色', value: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-800' },
  { name: '靛蓝', value: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { name: '青色', value: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  { name: '橙色', value: '#f97316', bg: 'bg-orange-100', text: 'text-orange-800' },
  { name: '石板', value: '#64748b', bg: 'bg-slate-100', text: 'text-slate-800' }
]

export function TagManagement({ tags, onUpdateTags }: TagManagementProps) {
  const [managedTags, setManagedTags] = useState<TagData[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState({
    name: '',
    color: TAG_COLORS[0].value,
    description: ''
  })
  const [editingTag, setEditingTag] = useState<TagData | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    // 从现有的标签初始化标签数据
    const tagData = tags.map((tag, index) => ({
      id: `tag-${index}`,
      name: tag,
      color: TAG_COLORS[index % TAG_COLORS.length].value,
      description: '',
      usage_count: Math.floor(Math.random() * 20) + 1, // 模拟使用次数
      created_at: new Date().toISOString()
    }))
    setManagedTags(tagData)
  }, [tags])

  const createTag = async () => {
    if (!newTag.name.trim()) return

    const newTagData: TagData = {
      id: `tag-${Date.now()}`,
      name: newTag.name.trim(),
      color: newTag.color,
      description: newTag.description.trim(),
      usage_count: 0,
      created_at: new Date().toISOString()
    }

    setManagedTags(prev => [...prev, newTagData])
    onUpdateTags([...tags, newTag.name.trim()])
    
    setNewTag({ name: '', color: TAG_COLORS[0].value, description: '' })
    setIsCreateDialogOpen(false)
  }

  const updateTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return

    const updatedTag = {
      ...editingTag,
      name: editingTag.name.trim(),
      description: editingTag.description.trim()
    }

    setManagedTags(prev => 
      prev.map(tag => tag.id === editingTag.id ? updatedTag : tag)
    )
    
    // 更新标签列表
    const oldName = managedTags.find(t => t.id === editingTag.id)?.name
    if (oldName && oldName !== editingTag.name.trim()) {
      const updatedTags = tags.map(tag => 
        tag === oldName ? editingTag.name.trim() : tag
      )
      onUpdateTags(updatedTags)
    }
    
    setEditingTag(null)
    setIsEditDialogOpen(false)
  }

  const deleteTag = async (tagId: string) => {
    const tagToDelete = managedTags.find(t => t.id === tagId)
    if (!tagToDelete) return

    setManagedTags(prev => prev.filter(tag => tag.id !== tagId))
    onUpdateTags(tags.filter(tag => tag !== tagToDelete.name))
  }

  const openEditDialog = (tag: TagData) => {
    setEditingTag(tag)
    setIsEditDialogOpen(true)
  }

  const getColorClass = (color: string) => {
    const colorObj = TAG_COLORS.find(c => c.value === color)
    return colorObj || TAG_COLORS[0]
  }

  const totalUsage = managedTags.reduce((sum, tag) => sum + tag.usage_count, 0)
  const mostUsedTag = managedTags.reduce((max, tag) => 
    tag.usage_count > max.usage_count ? tag : max, 
    managedTags[0] || { usage_count: 0, name: '' }
  )

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">标签总数</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {managedTags.length}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">总使用次数</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {totalUsage}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">最常用标签</span>
          </div>
          <div className="text-lg font-bold text-purple-600 truncate">
            {mostUsedTag.name || '无'}
          </div>
          <div className="text-sm text-gray-500">
            {mostUsedTag.usage_count || 0} 次
          </div>
        </Card>
      </div>

      {/* 标签管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                标签管理
              </CardTitle>
              <CardDescription>
                管理测试用例标签，包括颜色、描述和使用统计
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  创建标签
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新标签</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">标签名称</label>
                    <Input
                      placeholder="输入标签名称"
                      value={newTag.name}
                      onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">标签颜色</label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setNewTag(prev => ({ ...prev, color: color.value }))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newTag.color === color.value ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">描述（可选）</label>
                    <Textarea
                      placeholder="输入标签描述"
                      value={newTag.description}
                      onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={createTag}>
                      创建
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 标签预览 */}
            <div>
              <h3 className="text-sm font-medium mb-3">标签预览</h3>
              <div className="flex flex-wrap gap-2">
                {managedTags.map(tag => {
                  const colorClass = getColorClass(tag.color)
                  return (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="flex items-center gap-1"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color
                      }}
                    >
                      {tag.name}
                      <span className="text-xs opacity-70">({tag.usage_count})</span>
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* 标签表格 */}
            <div>
              <h3 className="text-sm font-medium mb-3">标签详情</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>标签名称</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>使用次数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managedTags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          暂无标签，点击右上角创建第一个标签
                        </TableCell>
                      </TableRow>
                    ) : (
                      managedTags.map((tag) => (
                        <TableRow key={tag.id}>
                          <TableCell className="font-medium">
                            {tag.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm">
                                {TAG_COLORS.find(c => c.value === tag.color)?.name || '自定义'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {tag.description || '无描述'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {tag.usage_count} 次
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(tag)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTag(tag.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 编辑标签对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
          </DialogHeader>
          {editingTag && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标签名称</label>
                <Input
                  placeholder="输入标签名称"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">标签颜色</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingTag(prev => prev ? { ...prev, color: color.value } : null)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingTag?.color === color.value ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  placeholder="输入标签描述"
                  value={editingTag.description}
                  onChange={(e) => setEditingTag(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={updateTag}>
                  更新
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}