"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EvaluationForm } from "@/components/evaluation-form"
import { supabase } from "@/lib/supabase"

interface Project {
  id: string
  name: string
  targets: string[]
}

interface TestCase {
  id: string
  title: string
  prompt: string
  tags: string[]
}

export default function EvaluatePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedTestCase, setSelectedTestCase] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
    fetchTestCases()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
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

  const selectedProjectData = projects.find(p => p.id === selectedProject)
  const selectedTestCaseData = testCases.find(t => t.id === selectedTestCase)

  const handleSaveEvaluation = async (evaluationData: any) => {
    if (!selectedProject || !selectedTestCase) {
      alert('请先选择项目和测试用例')
      return
    }

    try {
      const { error } = await supabase
        .from('evaluations')
        .insert([{
          project_id: selectedProject,
          test_case_id: selectedTestCase,
          agent_name: 'Current Agent', // 这里可以根据实际需要修改
          evaluator_name: 'AI Assisted Evaluator',
          core_delivery_capability: evaluationData.core_delivery_capability,
          cognition_planning_capability: evaluationData.cognition_planning_capability,
          interaction_communication_capability: evaluationData.interaction_communication_capability,
          efficiency_resourcefulness_capability: evaluationData.efficiency_resourcefulness_capability,
          engineering_scalability_capability: evaluationData.engineering_scalability_capability,
          overall_notes: evaluationData.overall_notes
        }])

      if (error) throw error
      
      alert('评测结果保存成功！')
    } catch (error) {
      console.error('Error saving evaluation:', error)
      alert('保存失败，请重试')
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">评测执行</h1>
        <p className="text-gray-600">选择评测项目和测试用例，开始AI智能评测</p>
      </div>

      {/* 选择器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>评测配置</CardTitle>
          <CardDescription>
            选择要评测的项目和测试用例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">选择项目</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">选择测试用例</label>
              <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个测试用例" />
                </SelectTrigger>
                <SelectContent>
                  {testCases.map((testCase) => (
                    <SelectItem key={testCase.id} value={testCase.id}>
                      {testCase.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 评测区域 */}
      {selectedProject && selectedTestCase && selectedProjectData && selectedTestCaseData && (
        <Card>
          <CardHeader>
            <CardTitle>评测执行</CardTitle>
            <CardDescription>
              正在评测项目: {selectedProjectData.name} | 测试用例: {selectedTestCaseData.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="agent1" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {selectedProjectData.targets.slice(0, 3).map((target, index) => (
                  <TabsTrigger key={target} value={`agent${index + 1}`}>
                    {target}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {selectedProjectData.targets.slice(0, 3).map((target, index) => (
                <TabsContent key={target} value={`agent${index + 1}`} className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    <strong>Agent:</strong> {target} | 
                    <strong> 测试用例:</strong> {selectedTestCaseData.title}
                  </div>
                  
                  <EvaluationForm
                    agentName={target}
                    testCase={selectedTestCaseData}
                    onSave={handleSaveEvaluation}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!selectedProject || !selectedTestCase && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">开始评测</div>
              <div className="text-sm">请先选择项目和测试用例</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}