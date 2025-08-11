"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagManagement } from "@/components/tag-management"
import { Plus, Settings, Trash2, Search, Eye, Edit, Filter, Download, Upload, FileText, FileSpreadsheet } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface TestCase {
  id: string
  title: string
  prompt: string
  tags: string[]
  created_at: string
}

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [filteredTestCases, setFilteredTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [newTestCase, setNewTestCase] = useState({
    title: '',
    prompt: '',
    tags: ''
  })
  const [editTestCase, setEditTestCase] = useState({
    id: '',
    title: '',
    prompt: '',
    tags: ''
  })

  useEffect(() => {
    fetchTestCases()
  }, [])

  useEffect(() => {
    filterTestCases()
  }, [testCases, searchTerm, selectedTags])

  useEffect(() => {
    // 提取所有标签
    const tags = Array.from(new Set(testCases.flatMap(tc => tc.tags)))
    setAllTags(tags.sort())
  }, [testCases])

  const filterTestCases = () => {
    let filtered = testCases

    // 按搜索词过滤
    if (searchTerm) {
      filtered = filtered.filter(testCase => 
        testCase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testCase.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testCase.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 按标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(testCase => 
        selectedTags.every(tag => testCase.tags.includes(tag))
      )
    }

    setFilteredTestCases(filtered)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearTagFilter = () => {
    setSelectedTags([])
  }

  const handleUpdateTags = (updatedTags: string[]) => {
    // 这里可以添加标签更新逻辑
    console.log('Updated tags:', updatedTags)
  }

  const exportTestCases = (format: 'json' | 'csv' = 'json') => {
    const data = filteredTestCases.map(tc => ({
      title: tc.title,
      prompt: tc.prompt,
      tags: tc.tags.join(', '),
      created_at: tc.created_at
    }))
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-cases-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['title', 'prompt', 'tags', 'created_at']
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => 
            `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-cases-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const downloadTemplate = (format: 'json' | 'csv' = 'json') => {
    const templateData = [
      {
        title: "示例测试用例标题",
        prompt: "这是一个示例测试提示词，请在这里描述具体的测试要求...",
        tags: "前端, React, 中等复杂度",
        created_at: new Date().toISOString()
      }
    ]
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-cases-template.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['title', 'prompt', 'tags', 'created_at']
      const csvContent = [
        headers.join(','),
        ...templateData.map(row => 
          headers.map(header => 
            `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-cases-template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const importTestCases = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        let data: any[] = []
        
        // 检测文件格式
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content)
          if (!Array.isArray(data)) throw new Error('Invalid JSON format')
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(content)
        } else {
          throw new Error('不支持的文件格式，请使用 .json 或 .csv 文件')
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const item of data) {
          try {
            if (item.title && item.prompt) {
              const tags = item.tags ? 
                (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()).filter(t => t) : item.tags) 
                : []
              
              await supabase.from('test_cases').insert({
                title: item.title.trim(),
                prompt: item.prompt.trim(),
                tags
              })
              successCount++
            } else {
              errors.push(`缺少标题或提示词: ${JSON.stringify(item)}`)
              errorCount++
            }
          } catch (error) {
            errors.push(`导入失败: ${JSON.stringify(item)} - ${error}`)
            errorCount++
          }
        }
        
        fetchTestCases()
        
        if (errorCount === 0) {
          alert(`成功导入 ${successCount} 个测试用例`)
        } else {
          alert(`导入完成: 成功 ${successCount} 个，失败 ${errorCount} 个\n\n错误详情:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`)
        }
      } catch (error) {
        alert(`导入失败：${error}`)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const parseCSV = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV文件至少需要包含标题行和数据行')
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const item: any = {}
      
      headers.forEach((header, index) => {
        item[header] = values[index] || ''
      })
      
      data.push(item)
    }
    
    return data
  }

  const fetchTestCases = async () => {
    try {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTestCases(data || [])
    } catch (error) {
      console.error('Error fetching test cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTestCase = async () => {
    if (!editTestCase.title.trim() || !editTestCase.prompt.trim()) return

    try {
      const tagsArray = editTestCase.tags.split(',').map(t => t.trim()).filter(t => t)
      
      const { data, error } = await supabase
        .from('test_cases')
        .update({
          title: editTestCase.title.trim(),
          prompt: editTestCase.prompt.trim(),
          tags: tagsArray
        })
        .eq('id', editTestCase.id)
        .select()

      if (error) throw error
      
      setTestCases(prev => prev.map(t => t.id === editTestCase.id ? data![0] : t))
      setEditTestCase({ id: '', title: '', prompt: '', tags: '' })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating test case:', error)
    }
  }

  const openEditDialog = (testCase: TestCase) => {
    setEditTestCase({
      id: testCase.id,
      title: testCase.title,
      prompt: testCase.prompt,
      tags: testCase.tags.join(', ')
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (testCase: TestCase) => {
    setSelectedTestCase(testCase)
    setIsViewDialogOpen(true)
  }

  const createTestCase = async () => {
    if (!newTestCase.title.trim() || !newTestCase.prompt.trim()) return

    try {
      const tagsArray = newTestCase.tags.split(',').map(t => t.trim()).filter(t => t)
      
      const { data, error } = await supabase
        .from('test_cases')
        .insert([{
          title: newTestCase.title.trim(),
          prompt: newTestCase.prompt.trim(),
          tags: tagsArray
        }])
        .select()

      if (error) throw error
      
      setTestCases(prev => [data![0], ...prev])
      setNewTestCase({ title: '', prompt: '', tags: '' })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error creating test case:', error)
    }
  }

  const deleteTestCase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('test_cases')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setTestCases(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting test case:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">测试用例库</h1>
        <p className="text-gray-600">管理和组织测试用例，支持批量导入导出和标签管理</p>
      </div>

      <Tabs defaultValue="test-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test-cases">测试用例</TabsTrigger>
          <TabsTrigger value="tag-management">标签管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test-cases" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">测试用例列表</h2>
            
            <div className="flex gap-2">
          <input
            type="file"
            accept=".json,.csv"
            onChange={importTestCases}
            className="hidden"
            id="import-file"
          />
          
          {/* 模板下载 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                模板
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => downloadTemplate('json')}>
                <FileText className="w-4 h-4 mr-2" />
                JSON 模板
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTemplate('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV 模板
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 导入按钮 */}
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-file')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入
          </Button>
          
          {/* 导出按钮 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={filteredTestCases.length === 0}>
                <Download className="w-4 h-4" />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportTestCases('json')}>
                <FileText className="w-4 h-4 mr-2" />
                JSON 格式
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportTestCases('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV 格式
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建新用例
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新测试用例</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">用例标题</label>
                <Input
                  placeholder="输入测试用例标题"
                  value={newTestCase.title}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">测试Prompt</label>
                <Textarea
                  placeholder="输入详细的测试指令和描述"
                  value={newTestCase.prompt}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, prompt: e.target.value }))}
                  rows={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium">标签 (用逗号分隔)</label>
                <Input
                  placeholder="例如: 前端, 中等复杂度, React"
                  value={newTestCase.tags}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={createTestCase}>
                  创建用例
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索和过滤栏 */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索测试用例（标题、描述、标签）..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            标签过滤
            {selectedTags.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {selectedTags.length}
              </span>
            )}
          </Button>
        </div>

        {/* 标签过滤器 */}
        {showTagFilter && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">按标签过滤</h3>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearTagFilter}>
                  清除过滤
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 搜索结果统计 */}
        {(searchTerm || selectedTags.length > 0) && (
          <div className="text-sm text-gray-500">
            找到 {filteredTestCases.length} 个匹配的测试用例
            {selectedTags.length > 0 && (
              <span className="ml-2">
                (标签过滤: {selectedTags.join(', ')})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用例标题</TableHead>
              <TableHead>标签</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTestCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  {searchTerm ? '没有找到匹配的测试用例' : '暂无测试用例，点击右上角创建第一个用例'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTestCases.map((testCase) => (
                <TableRow key={testCase.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{testCase.title}</div>
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {testCase.prompt}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {testCase.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(testCase.created_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openViewDialog(testCase)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(testCase)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTestCase(testCase.id)}
                        title="删除"
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

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">用例标题</label>
              <Input
                placeholder="输入测试用例标题"
                value={editTestCase.title}
                onChange={(e) => setEditTestCase(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">测试Prompt</label>
              <Textarea
                placeholder="输入详细的测试指令和描述"
                value={editTestCase.prompt}
                onChange={(e) => setEditTestCase(prev => ({ ...prev, prompt: e.target.value }))}
                rows={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium">标签 (用逗号分隔)</label>
              <Input
                placeholder="例如: 前端, 中等复杂度, React"
                value={editTestCase.tags}
                onChange={(e) => setEditTestCase(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={updateTestCase}>
                更新用例
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>测试用例详情</DialogTitle>
          </DialogHeader>
          {selectedTestCase && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">用例标题</label>
                <div className="mt-1 text-lg font-semibold">{selectedTestCase.title}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">测试Prompt</label>
                <div className="mt-1 p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-sm">
                  {selectedTestCase.prompt}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">标签</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedTestCase.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">创建时间</label>
                <div className="mt-1 text-sm">
                  {new Date(selectedTestCase.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        <TabsContent value="tag-management">
          <TagManagement 
            tags={allTags} 
            onUpdateTags={handleUpdateTags} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}