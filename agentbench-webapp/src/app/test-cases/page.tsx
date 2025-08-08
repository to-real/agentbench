"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Settings, Trash2 } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTestCase, setNewTestCase] = useState({
    title: '',
    prompt: '',
    tags: ''
  })

  useEffect(() => {
    fetchTestCases()
  }, [])

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">测试用例库</h1>
        
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
            {testCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  暂无测试用例，点击右上角创建第一个用例
                </TableCell>
              </TableRow>
            ) : (
              testCases.map((testCase) => (
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
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTestCase(testCase.id)}
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
  )
}