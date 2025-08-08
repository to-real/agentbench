"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { ProjectData, TestCaseData, EvaluationData, AnalysisData, RadarChartData } from "@/lib/analysis-types"
import { BarChart3, TrendingUp, Users, FileText, Loader2 } from "lucide-react"

export default function AnalysisPage() {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchAnalysisData()
    }
  }, [selectedProject])

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
    } finally {
      setLoadingData(false)
    }
  }

  const fetchAnalysisData = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      // 获取项目信息
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single()

      if (projectError) throw projectError

      // 获取相关的评测记录
      const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: false })

      if (evalError) throw evalError

      // 获取相关的测试用例
      const testCaseIds = [...new Set(evaluations?.map(e => e.test_case_id) || [])]
      const { data: testCases, error: testCaseError } = await supabase
        .from('test_cases')
        .select('*')
        .in('id', testCaseIds)

      if (testCaseError) throw testCaseError

      // 处理数据
      const processedData = processData(projectData, testCases || [], evaluations || [])
      setAnalysisData(processedData)
    } catch (error) {
      console.error('Error fetching analysis data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processData = (project: ProjectData, testCases: TestCaseData[], evaluations: EvaluationData[]): AnalysisData => {
    // 计算雷达图数据
    const radarData: RadarChartData[] = project.targets.map(agent => {
      const agentEvaluations = evaluations.filter(e => e.agent_name === agent)
      
      if (agentEvaluations.length === 0) {
        return {
          agent,
          core_delivery: 0,
          cognition_planning: 0,
          interaction_communication: 0,
          efficiency_resourcefulness: 0,
          engineering_scalability: 0
        }
      }

      const scores = agentEvaluations.reduce((acc, eval) => {
        const core = eval.core_delivery_capability
        const cognition = eval.cognition_planning_capability
        const interaction = eval.interaction_communication_capability
        const efficiency = eval.efficiency_resourcefulness_capability
        const engineering = eval.engineering_scalability_capability

        acc.core_delivery += (core?.first_try_success_rate || 0 + core?.first_try_completion_rate || 0 + core?.first_try_usability || 0) / 3
        acc.cognition_planning += (cognition?.problem_understanding || 0 + cognition?.planning_ability || 0 + cognition?.requirement_clarification || 0) / 3
        acc.interaction_communication += (interaction?.communication_clarity || 0 + interaction?.feedback_response || 0) / 2
        acc.efficiency_resourcefulness += (efficiency?.code_efficiency || 0 + efficiency?.resource_optimization || 0) / 2
        acc.engineering_scalability += (engineering?.code_quality || 0 + engineering?.maintainability || 0 + engineering?.scalability || 0 + engineering?.error_handling || 0 + engineering?.documentation || 0) / 5

        return acc
      }, { core_delivery: 0, cognition_planning: 0, interaction_communication: 0, efficiency_resourcefulness: 0, engineering_scalability: 0 })

      return {
        agent,
        core_delivery: Math.round(scores.core_delivery / agentEvaluations.length * 10) / 10,
        cognition_planning: Math.round(scores.cognition_planning / agentEvaluations.length * 10) / 10,
        interaction_communication: Math.round(scores.interaction_communication / agentEvaluations.length * 10) / 10,
        efficiency_resourcefulness: Math.round(scores.efficiency_resourcefulness / agentEvaluations.length * 10) / 10,
        engineering_scalability: Math.round(scores.engineering_scalability / agentEvaluations.length * 10) / 10
      }
    })

    // 处理对比数据
    const comparisonData = evaluations.map(eval => {
      const core = eval.core_delivery_capability
      const cognition = eval.cognition_planning_capability
      const interaction = eval.interaction_communication_capability
      const efficiency = eval.efficiency_resourcefulness_capability
      const engineering = eval.engineering_scalability_capability

      return {
        agent: eval.agent_name,
        testCase: testCases.find(tc => tc.id === eval.test_case_id)?.title || 'Unknown',
        scores: {
          core_delivery: Math.round(((core?.first_try_success_rate || 0 + core?.first_try_completion_rate || 0 + core?.first_try_usability || 0) / 3) * 10) / 10,
          cognition_planning: Math.round(((cognition?.problem_understanding || 0 + cognition?.planning_ability || 0 + cognition?.requirement_clarification || 0) / 3) * 10) / 10,
          interaction_communication: Math.round(((interaction?.communication_clarity || 0 + interaction?.feedback_response || 0) / 2) * 10) / 10,
          efficiency_resourcefulness: Math.round(((efficiency?.code_efficiency || 0 + efficiency?.resource_optimization || 0) / 2) * 10) / 10,
          engineering_scalability: Math.round(((engineering?.code_quality || 0 + engineering?.maintainability || 0 + engineering?.scalability || 0 + engineering?.error_handling || 0 + engineering?.documentation || 0) / 5) * 10) / 10
        }
      }
    })

    return {
      project,
      agents: project.targets,
      testCases,
      evaluations,
      radarData,
      comparisonData
    }
  }

  const renderRadarChart = () => {
    if (!analysisData) return null

    const { radarData } = analysisData
    const dimensions = ['core_delivery', 'cognition_planning', 'interaction_communication', 'efficiency_resourcefulness', 'engineering_scalability']
    const dimensionNames = ['核心交付', '认知规划', '交互沟通', '效率资源', '工程化']

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            能力维度雷达图
          </CardTitle>
          <CardDescription>
            各Agent在五大能力维度的平均得分对比
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 简化的雷达图展示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {radarData.map((agentData, index) => (
                <Card key={agentData.agent} className="p-4">
                  <CardTitle className="text-lg mb-4">{agentData.agent}</CardTitle>
                  <div className="space-y-3">
                    {dimensions.map((dim, i) => (
                      <div key={dim} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{dimensionNames[i]}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(agentData[dim as keyof typeof agentData] as number) * 20}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{agentData[dim as keyof typeof agentData] as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* 对比表格 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">详细对比数据</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>核心交付</TableHead>
                    <TableHead>认知规划</TableHead>
                    <TableHead>交互沟通</TableHead>
                    <TableHead>效率资源</TableHead>
                    <TableHead>工程化</TableHead>
                    <TableHead>总分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radarData.map((agentData) => {
                    const totalScore = (
                      agentData.core_delivery + 
                      agentData.cognition_planning + 
                      agentData.interaction_communication + 
                      agentData.efficiency_resourcefulness + 
                      agentData.engineering_scalability
                    ).toFixed(1)
                    
                    return (
                      <TableRow key={agentData.agent}>
                        <TableCell className="font-medium">{agentData.agent}</TableCell>
                        <TableCell>{agentData.core_delivery}</TableCell>
                        <TableCell>{agentData.cognition_planning}</TableCell>
                        <TableCell>{agentData.interaction_communication}</TableCell>
                        <TableCell>{agentData.efficiency_resourcefulness}</TableCell>
                        <TableCell>{agentData.engineering_scalability}</TableCell>
                        <TableCell className="font-semibold">{totalScore}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderComparisonView = () => {
    if (!analysisData) return null

    const { comparisonData, testCases } = analysisData

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            详细对比视图
          </CardTitle>
          <CardDescription>
            各Agent在不同测试用例下的详细评分
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testCases.map(testCase => {
              const testCaseResults = comparisonData.filter(data => data.testCase === testCase.title)
              
              if (testCaseResults.length === 0) return null

              return (
                <Card key={testCase.id} className="p-4">
                  <CardTitle className="text-lg mb-4">{testCase.title}</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testCaseResults.map(result => (
                      <Card key={`${result.agent}-${testCase.title}`} className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{result.agent}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>核心交付:</span>
                            <span className="font-medium">{result.scores.core_delivery}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>认知规划:</span>
                            <span className="font-medium">{result.scores.cognition_planning}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>交互沟通:</span>
                            <span className="font-medium">{result.scores.interaction_communication}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>效率资源:</span>
                            <span className="font-medium">{result.scores.efficiency_resourcefulness}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>工程化:</span>
                            <span className="font-medium">{result.scores.engineering_scalability}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loadingData) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">数据分析</h1>
        <p className="text-gray-600">可视化对比分析AI Agent的评测结果</p>
      </div>

      {/* 项目选择器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择分析项目</CardTitle>
          <CardDescription>选择要分析的项目以查看详细的评测数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
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
            
            {selectedProject && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {projects.find(p => p.id === selectedProject)?.targets.length || 0} 个Agent
                </Badge>
                <Badge variant="outline">
                  {analysisData?.testCases.length || 0} 个测试用例
                </Badge>
                <Badge variant="outline">
                  {analysisData?.evaluations.length || 0} 条评测记录
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">正在分析数据...</span>
          </CardContent>
        </Card>
      )}

      {/* 分析结果 */}
      {analysisData && !loading && (
        <div className="space-y-6">
          {renderRadarChart()}
          {renderComparisonView()}
        </div>
      )}

      {/* 无数据状态 */}
      {!selectedProject && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">开始数据分析</div>
              <div className="text-sm">请先选择一个项目来查看分析结果</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}