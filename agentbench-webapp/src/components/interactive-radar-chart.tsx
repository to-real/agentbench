"use client"

import { useState, useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Eye, EyeOff } from "lucide-react"

interface RadarDataPoint {
  subject: string
  [key: string]: number | string
}

interface AgentRadarData {
  agent: string
  data: RadarDataPoint[]
  color: string
  visible: boolean
}

interface InteractiveRadarChartProps {
  data: {
    agent: string
    core_delivery: number
    cognition_planning: number
    interaction_communication: number
    efficiency_resourcefulness: number
    engineering_scalability: number
  }[]
  title?: string
  description?: string
  className?: string
}

const AGENT_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // green-500
  '#f59e0b', // yellow-500
  '#8b5cf6', // purple-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
]

const DIMENSIONS = [
  { key: 'core_delivery', name: '核心交付能力' },
  { key: 'cognition_planning', name: '认知与规划能力' },
  { key: 'interaction_communication', name: '交互与沟通能力' },
  { key: 'efficiency_resourcefulness', name: '效率与资源利用' },
  { key: 'engineering_scalability', name: '工程化与可扩展性' }
]

export function InteractiveRadarChart({ 
  data, 
  title = "能力维度雷达图", 
  description = "各Agent在五大能力维度的得分对比",
  className = "" 
}: InteractiveRadarChartProps) {
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(data.map(d => d.agent))
  )
  const [showAll, setShowAll] = useState(true)

  // 转换数据格式
  const chartData = useMemo(() => {
    const radarData: RadarDataPoint[] = DIMENSIONS.map(dim => {
      const point: RadarDataPoint = { subject: dim.name }
      data.forEach(agentData => {
        point[agentData.agent] = agentData[dim.key as keyof typeof agentData] as number
      })
      return point
    })
    return radarData
  }, [data])

  // 处理Agent数据
  const agentRadarData = useMemo(() => {
    return data.map((agentData, index) => ({
      agent: agentData.agent,
      data: DIMENSIONS.map(dim => ({
        subject: dim.name,
        value: agentData[dim.key as keyof typeof agentData] as number,
        fullMark: 5
      })),
      color: AGENT_COLORS[index % AGENT_COLORS.length],
      visible: showAll || selectedAgents.has(agentData.agent)
    }))
  }, [data, selectedAgents, showAll])

  // 计算统计数据
  const stats = useMemo(() => {
    const agentStats = data.map(agentData => {
      const scores = [
        agentData.core_delivery,
        agentData.cognition_planning,
        agentData.interaction_communication,
        agentData.efficiency_resourcefulness,
        agentData.engineering_scalability
      ]
      return {
        agent: agentData.agent,
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        max: Math.max(...scores),
        min: Math.min(...scores)
      }
    })
    
    const dimensionStats = DIMENSIONS.map(dim => {
      const scores = data.map(d => d[dim.key as keyof typeof d] as number)
      return {
        dimension: dim.name,
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        max: Math.max(...scores),
        min: Math.min(...scores)
      }
    })
    
    return { agentStats, dimensionStats }
  }, [data])

  const toggleAgent = (agent: string) => {
    const newSelected = new Set(selectedAgents)
    if (newSelected.has(agent)) {
      newSelected.delete(agent)
    } else {
      newSelected.add(agent)
    }
    setSelectedAgents(newSelected)
    setShowAll(false)
  }

  const toggleShowAll = () => {
    setShowAll(!showAll)
    if (!showAll) {
      setSelectedAgents(new Set(data.map(d => d.agent)))
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="space-y-1 mt-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium">{entry.name}:</span>
                <span className="text-sm">{entry.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'radar' | 'bar') => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radar">雷达图</SelectItem>
                <SelectItem value="bar">柱状图</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShowAll}
              className="flex items-center gap-1"
            >
              {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAll ? '隐藏全部' : '显示全部'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Agent选择器 */}
          <div className="flex flex-wrap gap-2">
            {data.map((agentData, index) => (
              <Badge
                key={agentData.agent}
                variant={selectedAgents.has(agentData.agent) || showAll ? "default" : "secondary"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleAgent(agentData.agent)}
                style={{
                  backgroundColor: selectedAgents.has(agentData.agent) || showAll 
                    ? AGENT_COLORS[index % AGENT_COLORS.length] 
                    : undefined,
                  borderColor: AGENT_COLORS[index % AGENT_COLORS.length]
                }}
              >
                {agentData.agent}
              </Badge>
            ))}
          </div>

          {/* 雷达图 */}
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]} 
                  tick={{ fontSize: 10 }}
                  tickCount={6}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {agentRadarData
                  .filter(agent => agent.visible)
                  .map((agent, index) => (
                    <Radar
                      key={agent.agent}
                      name={agent.agent}
                      dataKey={agent.agent}
                      stroke={agent.color}
                      fill={agent.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))
                }
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium mb-3">Agent统计</h4>
              <div className="space-y-2">
                {stats.agentStats.map(stat => (
                  <div key={stat.agent} className="flex justify-between items-center">
                    <span className="text-sm">{stat.agent}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        平均: {stat.average.toFixed(1)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stat.max.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-3">维度统计</h4>
              <div className="space-y-2">
                {stats.dimensionStats.map(stat => (
                  <div key={stat.dimension} className="flex justify-between items-center">
                    <span className="text-sm">{stat.dimension}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        平均: {stat.average.toFixed(1)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stat.max.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}