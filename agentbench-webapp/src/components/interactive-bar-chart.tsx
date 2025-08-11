"use client"

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, RotateCcw } from "lucide-react"

interface BarChartData {
  name: string
  [key: string]: number | string
}

interface InteractiveBarChartProps {
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

const DIMENSIONS = [
  { key: 'core_delivery', name: '核心交付能力', color: '#3b82f6' },
  { key: 'cognition_planning', name: '认知与规划能力', color: '#10b981' },
  { key: 'interaction_communication', name: '交互与沟通能力', color: '#f59e0b' },
  { key: 'efficiency_resourcefulness', name: '效率与资源利用', color: '#ef4444' },
  { key: 'engineering_scalability', name: '工程化与可扩展性', color: '#8b5cf6' }
]

export function InteractiveBarChart({ 
  data, 
  title = "能力维度柱状图", 
  description = "各Agent在五大能力维度的得分对比",
  className = "" 
}: InteractiveBarChartProps) {
  const [groupBy, setGroupBy] = useState<'agent' | 'dimension'>('agent')
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none')

  // 按Agent分组的数据
  const agentGroupedData = useMemo(() => {
    return data.map(agentData => ({
      name: agentData.agent,
      ...DIMENSIONS.reduce((acc, dim) => ({
        ...acc,
        [dim.name]: agentData[dim.key as keyof typeof agentData] as number
      }), {})
    }))
  }, [data])

  // 按维度分组的数据
  const dimensionGroupedData = useMemo(() => {
    return DIMENSIONS.map(dim => ({
      name: dim.name,
      ...data.reduce((acc, agentData) => ({
        ...acc,
        [agentData.agent]: agentData[dim.key as keyof typeof agentData] as number
      }), {})
    }))
  }, [data])

  // 应用排序
  const applySort = (chartData: BarChartData[]) => {
    if (sortOrder === 'none') return chartData
    
    return [...chartData].sort((a, b) => {
      const getAverage = (item: BarChartData) => {
        const values = Object.values(item).filter(v => typeof v === 'number') as number[]
        return values.reduce((sum, val) => sum + val, 0) / values.length
      }
      
      const avgA = getAverage(a)
      const avgB = getAverage(b)
      
      return sortOrder === 'asc' ? avgA - avgB : avgB - avgA
    })
  }

  const currentData = useMemo(() => {
    const chartData = groupBy === 'agent' ? agentGroupedData : dimensionGroupedData
    return applySort(chartData)
  }, [groupBy, agentGroupedData, dimensionGroupedData, sortOrder])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.name}:</span>
                </div>
                <span className="text-sm font-medium">{entry.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // 获取当前分组下的Bar配置
  const getBars = () => {
    if (groupBy === 'agent') {
      return DIMENSIONS.map(dim => (
        <Bar
          key={dim.key}
          dataKey={dim.name}
          fill={dim.color}
          radius={[2, 2, 0, 0]}
        />
      ))
    } else {
      return data.map((agentData, index) => {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']
        return (
          <Bar
            key={agentData.agent}
            dataKey={agentData.agent}
            fill={colors[index % colors.length]}
            radius={[2, 2, 0, 0]}
          />
        )
      })
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={(value: 'agent' | 'dimension') => setGroupBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">按Agent</SelectItem>
                <SelectItem value="dimension">按维度</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortOrder} onValueChange={(value: 'none' | 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">默认排序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
                <SelectItem value="desc">降序</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder('none')}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* 图例 */}
          <div className="flex flex-wrap gap-2">
            {groupBy === 'agent' ? (
              DIMENSIONS.map(dim => (
                <Badge
                  key={dim.key}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: dim.color }}
                  />
                  {dim.name}
                </Badge>
              ))
            ) : (
              data.map((agentData, index) => {
                const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']
                return (
                  <Badge
                    key={agentData.agent}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {agentData.agent}
                  </Badge>
                )
              })
            )}
          </div>

          {/* 柱状图 */}
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 5]} 
                  tick={{ fontSize: 10 }}
                  tickCount={6}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {getBars()}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 快速统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.length}
                </div>
                <div className="text-sm text-gray-500">Agent总数</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {DIMENSIONS.length}
                </div>
                <div className="text-sm text-gray-500">能力维度</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(
                    data.reduce((sum, agent) => {
                      const agentAvg = (
                        agent.core_delivery +
                        agent.cognition_planning +
                        agent.interaction_communication +
                        agent.efficiency_resourcefulness +
                        agent.engineering_scalability
                      ) / 5
                      return sum + agentAvg
                    }, 0) / data.length
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">平均总分</div>
              </div>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}