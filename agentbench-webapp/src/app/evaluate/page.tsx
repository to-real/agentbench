"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EvaluationForm } from "@/components/evaluation-form"
import { supabase } from "@/lib/supabase"
import { useWebSocket } from "@/hooks/use-websocket"
import { Wifi, WifiOff, Play, Pause, Square, Users, Activity } from "lucide-react"

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // WebSocket 连接
  const {
    client,
    state: wsState,
    isConnected: wsConnected,
    sessions,
    activeSession,
    connect: wsConnect,
    disconnect: wsDisconnect,
    createSession,
    joinSession,
    leaveSession,
    startTestSession,
    stopTestSession,
    sendTestEvent
  } = useWebSocket({
    url: 'ws://localhost:3001',
    autoConnect: true,
    enableLogging: true
  })

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

  const handleSaveEvaluation = async (evaluationData: any, agentName: string) => {
    if (!selectedProject || !selectedTestCase) {
      alert('请先选择项目和测试用例')
      return
    }

    try {
      // 发送评测完成事件到 WebSocket
      if (currentSessionId && wsConnected) {
        sendTestEvent(currentSessionId, 'evaluation_completed', {
          agentName,
          evaluationData,
          timestamp: Date.now()
        })
      }

      const { error } = await supabase
        .from('evaluations')
        .insert([{
          project_id: selectedProject,
          test_case_id: selectedTestCase,
          agent_name: agentName,
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

  // 创建测试会话
  const handleCreateSession = async () => {
    if (!selectedProject || !selectedTestCase) {
      alert('请先选择项目和测试用例')
      return
    }

    try {
      const sessionId = await createSession(selectedProject, selectedTestCase, 'Multi-Agent')
      setCurrentSessionId(sessionId)
      console.log('Session created:', sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
      alert('创建会话失败')
    }
  }

  // 开始测试
  const handleStartTest = async () => {
    if (!currentSessionId) {
      alert('请先创建测试会话')
      return
    }

    try {
      startTestSession(currentSessionId)
      console.log('Test started:', currentSessionId)
    } catch (error) {
      console.error('Failed to start test:', error)
      alert('开始测试失败')
    }
  }

  // 停止测试
  const handleStopTest = async () => {
    if (!currentSessionId) {
      return
    }

    try {
      stopTestSession(currentSessionId)
      console.log('Test stopped:', currentSessionId)
    } catch (error) {
      console.error('Failed to stop test:', error)
      alert('停止测试失败')
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">评测执行</h1>
            <p className="text-gray-600">选择评测项目和测试用例，开始AI智能评测</p>
          </div>
          
          {/* WebSocket 状态指示器 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {wsConnected ? '实时同步已连接' : '实时同步已断开'}
              </span>
            </div>
            
            {currentSessionId && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                会话 {currentSessionId.slice(-8)}
              </Badge>
            )}
          </div>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="text-sm font-medium mb-2 block">实时控制</label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateSession}
                  disabled={!selectedProject || !selectedTestCase || !!currentSessionId}
                  size="sm"
                >
                  创建会话
                </Button>
                <Button 
                  onClick={handleStartTest}
                  disabled={!currentSessionId || (activeSession?.status === 'running')}
                  size="sm"
                  variant="outline"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleStopTest}
                  disabled={!currentSessionId || activeSession?.status !== 'running'}
                  size="sm"
                  variant="outline"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
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
                    projectId={selectedProject}
                    testCaseId={selectedTestCase}
                    evaluatorId="evaluator-1"
                    onSave={(data) => handleSaveEvaluation(data, target)}
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