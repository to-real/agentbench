"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { ProjectData, TestCaseData, EvaluationData, AnalysisData, RadarChartData } from "@/lib/analysis-types"
import { InteractiveRadarChart } from "@/components/interactive-radar-chart"
import { InteractiveBarChart } from "@/components/interactive-bar-chart"
import { BarChart3, TrendingUp, Users, FileText, Loader2, Download, Filter } from "lucide-react"

export default function AnalysisPage() {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [selectedTestCase, setSelectedTestCase] = useState<string>('all')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [chartView, setChartView] = useState<'radar' | 'bar'>('radar')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchAnalysisData()
    }
  }, [selectedProject])

  useEffect(() => {
    if (analysisData) {
      // 初始化选中的Agent
      setSelectedAgents(analysisData.agents)
    }
  }, [analysisData])

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

  // 获取过滤后的数据
  const getFilteredData = () => {
    if (!analysisData) return null

    let filteredEvaluations = analysisData.evaluations

    // 按测试用例过滤
    if (selectedTestCase !== 'all') {
      filteredEvaluations = filteredEvaluations.filter(e => e.test_case_id === selectedTestCase)
    }

    // 按Agent过滤
    if (selectedAgents.length > 0) {
      filteredEvaluations = filteredEvaluations.filter(e => selectedAgents.includes(e.agent_name))
    }

    return processData(
      analysisData.project,
      analysisData.testCases,
      filteredEvaluations
    )
  }

  // 导出数据
  const exportData = () => {
    if (!analysisData) return

    const filteredData = getFilteredData()
    if (!filteredData) return

    const csvContent = [
      ['Agent', 'TestCase', 'Core Delivery', 'Cognition Planning', 'Interaction Communication', 'Efficiency Resourcefulness', 'Engineering Scalability', 'Overall Score'],
      ...filteredData.comparisonData.map(item => [
        item.agent,
        item.testCase,
        item.scores.core_delivery,
        item.scores.cognition_planning,
        item.scores.interaction_communication,
        item.scores.efficiency_resourcefulness,
        item.scores.engineering_scalability,
        (
          item.scores.core_delivery +
          item.scores.cognition_planning +
          item.scores.interaction_communication +
          item.scores.efficiency_resourcefulness +
          item.scores.engineering_scalability
        ).toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${analysisData.project.name}_analysis_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderRadarChart = () => {
    const filteredData = getFilteredData()
    if (!filteredData) return null

    return (
      <InteractiveRadarChart 
        data={filteredData.radarData}
        title="能力维度雷达图"
        description="各Agent在五大能力维度的平均得分对比"
      />
    )
  }

  const renderBarChart = () => {
    const filteredData = getFilteredData()
    if (!filteredData) return null

    return (
      <InteractiveBarChart 
        data={filteredData.radarData}
        title="能力维度柱状图"
        description="各Agent在五大能力维度的得分对比"
      />
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

  const filteredData = getFilteredData()

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
          <div className="flex flex-col gap-4">
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

            {/* 过滤器 */}
            {analysisData && (
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">过滤:</span>
                </div>
                
                <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择测试用例" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有测试用例</SelectItem>
                    {analysisData.testCases.map((testCase) => (
                      <SelectItem key={testCase.id} value={testCase.id}>
                        {testCase.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {analysisData.agents.map((agent) => (
                    <Badge
                      key={agent}
                      variant={selectedAgents.includes(agent) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        if (selectedAgents.includes(agent)) {
                          setSelectedAgents(selectedAgents.filter(a => a !== agent))
                        } else {
                          setSelectedAgents([...selectedAgents, agent])
                        }
                      }}
                    >
                      {agent}
                    </Badge>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  导出数据
                </Button>
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
          <Tabs defaultValue="radar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="radar">雷达图</TabsTrigger>
              <TabsTrigger value="bar">柱状图</TabsTrigger>
              <TabsTrigger value="comparison">详细对比</TabsTrigger>
            </TabsList>
            
            <TabsContent value="radar" className="space-y-4">
              {renderRadarChart()}
            </TabsContent>
            
            <TabsContent value="bar" className="space-y-4">
              {renderBarChart()}
            </TabsContent>
            
            <TabsContent value="comparison" className="space-y-4">
              {renderComparisonView()}
            </TabsContent>
          </Tabs>
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

      {/* 过滤后无数据 */}
      {selectedProject && filteredData && filteredData.radarData.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">无匹配数据</div>
              <div className="text-sm">请调整过滤条件以查看分析结果</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}