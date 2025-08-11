"use client"

import { useState } from 'react'
import { EvaluationForm } from '@/components/evaluation-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface EvaluatePageProps {
  params: {
    projectId: string
    testCaseId: string
  }
}

export default function EvaluatePage({ params }: EvaluatePageProps) {
  // 模拟项目和测试用例数据
  const project = {
    id: params.projectId,
    name: 'AI Agent 评测项目',
    targets: ['MGX', 'Replit', 'GPT Engineer']
  }

  const testCase = {
    id: params.testCaseId,
    title: '待办事项应用开发',
    prompt: '请开发一个功能完整的待办事项应用，包括添加、删除、编辑、标记完成等功能，并使用现代化的UI设计。'
  }

  const [selectedAgent, setSelectedAgent] = useState('MGX')

  // 模拟当前用户
  const currentUser = {
    id: 'user_123',
    name: '评测员A'
  }

  const handleSaveEvaluation = (data: any) => {
    console.log('保存评测结果:', data)
    // 这里会调用实际的保存逻辑
    alert('评测结果已保存！')
  }

  const handleAIScore = (data: any) => {
    console.log('AI评分结果:', data)
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回项目
          </Button>
          <h1 className="text-3xl font-bold">评测执行</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">项目</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{project.name}</p>
              <p className="text-sm text-gray-500">目标: {project.targets.join(', ')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">测试用例</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{testCase.title}</p>
              <p className="text-sm text-gray-500">ID: {testCase.id}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">当前评测</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{selectedAgent}</p>
              <p className="text-sm text-gray-500">评测员: {currentUser.name}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agent 选择标签 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {project.targets.map((agent) => (
              <button
                key={agent}
                onClick={() => setSelectedAgent(agent)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedAgent === agent
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {agent}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 评测表单 */}
      <EvaluationForm
        agentName={selectedAgent}
        testCase={testCase}
        projectId={project.id}
        testCaseId={testCase.id}
        evaluatorId={currentUser.id}
        evaluatorName={currentUser.name}
        enableAutoSave={true}
        evidence={['https://example.com/screenshot1.png', 'https://example.com/video1.mp4']}
        onSave={handleSaveEvaluation}
        onAIScore={handleAIScore}
      />
    </div>
  )
}